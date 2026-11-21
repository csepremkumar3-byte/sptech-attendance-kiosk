import { Op } from 'sequelize';
import { Payroll, Employee, Attendance, Shift, Advance, SalarySlip } from '../models/index.js';
import { generateSalarySlipPdf } from './pdfService.js';

/**
 * Calculates payroll preview for a given employee and month (YYYY-MM)
 */
export async function calculateEmployeeMonthlyPayroll(employeeId, monthStr) {
  const employee = await Employee.findByPk(employeeId, {
    include: [{ model: Shift, as: 'shift' }]
  });

  if (!employee) {
    throw new Error('Employee not found');
  }

  // Parse start and end dates of the month
  const [year, month] = monthStr.split('-').map(Number);
  const startDate = `${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

  // Fetch attendances in this month
  const attendances = await Attendance.findAll({
    where: {
      employee_id: employeeId,
      date: {
        [Op.between]: [startDate, endDate]
      }
    }
  });

  let totalWorkedHours = 0;
  let totalOtHours = 0;
  let presentDays = 0;
  let lateDays = 0;
  let halfDays = 0;
  let leaveDays = 0;

  for (const att of attendances) {
    totalWorkedHours += (att.hours_worked || 0);
    totalOtHours += (att.ot_hours || 0);
    if (att.daily_status === 'PRESENT') presentDays++;
    else if (att.daily_status === 'LATE') { presentDays++; lateDays++; }
    else if (att.daily_status === 'HALF_DAY') halfDays++;
    else if (att.daily_status === 'LEAVE' || att.daily_status === 'ON_LEAVE') {
      leaveDays++;
      // Approved paid leave grants standard 8-hour shift credit
      totalWorkedHours += 8;
    }
  }

  const regularHours = Math.max(0, totalWorkedHours - totalOtHours);
  const hourlyRate = employee.salary_per_hour || 150.0;
  const otMultiplier = employee.shift ? (employee.shift.ot_rate_multiplier || 1.5) : 1.5;

  // Base Pay = Regular Hours * Salary Per Hour
  const basePay = Math.round(regularHours * hourlyRate * 100) / 100;

  // OT Pay = OT Hours * Salary Per Hour * OT Multiplier
  const otPay = Math.round(totalOtHours * hourlyRate * otMultiplier * 100) / 100;

  // Fetch pending advances eligible for settlement
  const pendingAdvances = await Advance.findAll({
    where: {
      employee_id: employeeId,
      status: 'PENDING',
      date_given: {
        [Op.lte]: endDate
      }
    }
  });

  const totalAdvanceToSettle = pendingAdvances.reduce((sum, adv) => sum + adv.amount, 0);

  // Standard Statutory Employee Provident Fund (EPF): 12% on Base Pay
  const epfDeduction = Math.round(basePay * 0.12 * 100) / 100;
  const estimatedTotal = Math.max(0, Math.round((basePay + otPay - epfDeduction - totalAdvanceToSettle) * 100) / 100);

  return {
    employee,
    month: monthStr,
    summary: {
      presentDays,
      lateDays,
      halfDays,
      leaveDays,
      totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
      regularHours: Math.round(regularHours * 100) / 100,
      otHours: Math.round(totalOtHours * 100) / 100,
      hourlyRate,
      otMultiplier,
    },
    basePay,
    otPay,
    epfDeduction,
    incentive: 0.0,
    benefits: 0.0,
    deductions: 0.0,
    advanceSettlement: totalAdvanceToSettle,
    pendingAdvanceRecords: pendingAdvances,
    estimatedTotal,
  };
}

/**
 * Process and save/finalize payroll for an employee
 */
export async function processPayrollRecord({
  employee_id,
  month,
  admin_id,
  incentive = 0,
  benefits = 0,
  deductions = 0,
  finalize = false,
  force = false,
}) {
  const calc = await calculateEmployeeMonthlyPayroll(employee_id, month);

  // Check if existing payroll exists
  let payroll = await Payroll.findOne({
    where: { employee_id, month }
  });

  const base_pay = calc.basePay;
  const ot_pay = calc.otPay;
  const epf_deduction = calc.epfDeduction;
  const advance_settled = calc.advanceSettlement;
  const inc = Number(incentive) || 0;
  const ben = Number(benefits) || 0;
  const ded = Number(deductions) || 0;

  const total_salary = Math.max(0, Math.round((base_pay + ot_pay + inc + ben - ded - epf_deduction - advance_settled) * 100) / 100);

  if (!payroll) {
    payroll = await Payroll.create({
      employee_id,
      month,
      base_pay,
      ot_pay,
      incentive: inc,
      benefits: ben,
      deductions: ded,
      epf_deduction,
      advance_settled,
      total_salary,
      finalized_by: finalize ? admin_id : null,
      is_locked: finalize,
    });
  } else {
    payroll.base_pay = base_pay;
    payroll.ot_pay = ot_pay;
    payroll.incentive = inc;
    payroll.benefits = ben;
    payroll.deductions = ded;
    payroll.epf_deduction = epf_deduction;
    payroll.advance_settled = advance_settled;
    payroll.total_salary = total_salary;
    if (finalize) {
      payroll.finalized_by = admin_id;
      payroll.is_locked = true;
    }
    await payroll.save();
  }

  // If finalized, settle advances and generate salary slip
  if (finalize) {
    for (const adv of calc.pendingAdvanceRecords) {
      adv.status = 'SETTLED';
      adv.settled_in_payroll_id = payroll.id;
      await adv.save();
    }

    // Auto-generate salary slip PDF
    try {
      await generateSalarySlipPdf(payroll.id);
    } catch (err) {
      console.error('PDF Slip generation error:', err);
    }
  }

  return payroll;
}
