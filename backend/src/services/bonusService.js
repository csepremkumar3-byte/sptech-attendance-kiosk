import { Op } from 'sequelize';
import { Employee, Attendance, Shift, Payroll } from '../models/index.js';
import { calculateEmployeeMonthlyPayroll } from './payrollService.js';

/**
 * Helper to generate sequential list of YYYY-MM strings between start and end
 */
export function getMonthRangeList(startMonth, endMonth) {
  const [startYear, startM] = startMonth.split('-').map(Number);
  const [endYear, endM] = endMonth.split('-').map(Number);

  const months = [];
  let curYear = startYear;
  let curMonth = startM;

  while (curYear < endYear || (curYear === endYear && curMonth <= endM)) {
    const mStr = String(curMonth).padStart(2, '0');
    months.push(`${curYear}-${mStr}`);

    curMonth++;
    if (curMonth > 12) {
      curMonth = 1;
      curYear++;
    }
  }

  return months;
}

/**
 * Format YYYY-MM to readable label like "Sep-26" (matches Image 1)
 */
export function formatMonthLabel(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const monthName = date.toLocaleString('en-US', { month: 'short' });
  const shortYear = String(year).slice(-2);
  return `${monthName}-${shortYear}`;
}

/**
 * Calculates comprehensive bonus for all active employees across a custom month-year range.
 * Formula: (Total Eligible Base Salary * Bonus % / 100) + Bonus Incentives
 * CRITICAL RULE: Overtime (OT Salary) is strictly EXCLUDED from the bonus base.
 */
export async function calculateRangeBonus({
  startMonth,
  endMonth,
  bonusPercentage = 8.33,
  bonusIncentive = 0,
  employeeId = null,
}) {
  const monthList = getMonthRangeList(startMonth, endMonth);
  if (monthList.length === 0) {
    throw new Error('Invalid month range: startMonth must be before or equal to endMonth');
  }

  const empWhere = { status: 'ACTIVE' };
  if (employeeId) {
    empWhere.id = employeeId;
  }

  const employees = await Employee.findAll({
    where: empWhere,
    include: [{ model: Shift, as: 'shift' }],
    order: [['employee_code', 'ASC']]
  });

  const parsedBonusPct = parseFloat(bonusPercentage) || 8.33;
  const parsedIncentive = parseFloat(bonusIncentive) || 0;

  const results = [];

  for (const emp of employees) {
    const monthlyBreakdown = [];
    let periodDaysWorked = 0;
    let periodEligibleBaseSalary = 0; // EXCLUDES OT
    let periodOtHours = 0;
    let periodOtSalary = 0; // Tracked separately, NOT included in bonus
    let periodGrossTotalSalary = 0;

    for (const m of monthList) {
      const monthLabel = formatMonthLabel(m);

      // Check if a finalized payroll record already exists for this employee and month
      const existingPayroll = await Payroll.findOne({
        where: { employee_id: emp.id, month: m }
      });

      let daysCount = 0;
      let monthBaseSalary = 0;
      let monthOtHours = 0;
      let monthOtSalary = 0;

      if (existingPayroll) {
        monthBaseSalary = existingPayroll.base_pay || 0;
        monthOtSalary = existingPayroll.ot_pay || 0;

        // Fetch attendance days for accurate count matching Image 1
        const [year, monthNum] = m.split('-').map(Number);
        const startDate = `${m}-01`;
        const lastDay = new Date(year, monthNum, 0).getDate();
        const endDate = `${m}-${String(lastDay).padStart(2, '0')}`;

        daysCount = await Attendance.count({
          where: {
            employee_id: emp.id,
            date: { [Op.between]: [startDate, endDate] },
            daily_status: { [Op.in]: ['PRESENT', 'LATE', 'HALF_DAY'] }
          }
        });

        // Approximate OT hours from payroll
        const hourlyRate = emp.salary_per_hour || 150;
        const multiplier = emp.shift?.ot_rate_multiplier || 1.5;
        monthOtHours = monthOtSalary > 0 ? Math.round((monthOtSalary / (hourlyRate * multiplier)) * 100) / 100 : 0;
      } else {
        // Calculate dynamically from attendance
        const calc = await calculateEmployeeMonthlyPayroll(emp.id, m);
        daysCount = calc.summary.presentDays + calc.summary.halfDays * 0.5;
        monthBaseSalary = calc.basePay;
        monthOtHours = calc.summary.otHours;
        monthOtSalary = calc.otPay;
      }

      const monthTotal = Math.round((monthBaseSalary + monthOtSalary) * 100) / 100;

      periodDaysWorked += daysCount;
      periodEligibleBaseSalary += monthBaseSalary;
      periodOtHours += monthOtHours;
      periodOtSalary += monthOtSalary;
      periodGrossTotalSalary += monthTotal;

      monthlyBreakdown.push({
        month: m,
        monthLabel, // e.g. "Sep-26"
        noOfDays: Math.round(daysCount * 10) / 10,
        salary: Math.round(monthBaseSalary * 100) / 100, // Base Salary (Eligible)
        otHours: Math.round(monthOtHours * 100) / 100,
        otSalary: Math.round(monthOtSalary * 100) / 100, // OT Salary (EXCLUDED from bonus)
        total: monthTotal,
      });
    }

    periodEligibleBaseSalary = Math.round(periodEligibleBaseSalary * 100) / 100;
    periodOtSalary = Math.round(periodOtSalary * 100) / 100;
    periodGrossTotalSalary = Math.round(periodGrossTotalSalary * 100) / 100;

    // Standard Bonus Formula: (Eligible Base Salary * Bonus % / 100) + Bonus Incentive
    // Overtime (periodOtSalary) is strictly excluded!
    const bonusFromBase = Math.round(periodEligibleBaseSalary * (parsedBonusPct / 100) * 100) / 100;
    const netBonusPayable = Math.round((bonusFromBase + parsedIncentive) * 100) / 100;

    results.push({
      employee_id: emp.id,
      id: emp.id,
      name: emp.name,
      employee_code: emp.employee_code,
      department: emp.department || 'Operations',
      designation: emp.designation || 'Staff',
      epf_number: emp.epf_number || `TN/MAS/0048123/${emp.employee_code}`,
      salary_per_hour: emp.salary_per_hour,
      shift_name: emp.shift?.shift_name || 'General',
      totalDaysWorked: Math.round(periodDaysWorked * 10) / 10,
      totalEligibleSalary: periodEligibleBaseSalary, // Base Salary EXCLUDING OT
      totalOtHours: Math.round(periodOtHours * 100) / 100,
      totalOtSalary: periodOtSalary, // Excluded from bonus calculation
      totalGrossEarnings: periodGrossTotalSalary,
      bonusPercentage: parsedBonusPct,
      bonusFromBase,
      bonusIncentive: parsedIncentive,
      netBonus: netBonusPayable,
      netBonusPayable,
      employee: {
        id: emp.id,
        name: emp.name,
        employee_code: emp.employee_code,
        department: emp.department || 'Operations',
        designation: emp.designation || 'Staff',
        epf_number: emp.epf_number || `TN/MAS/0048123/${emp.employee_code}`,
        salary_per_hour: emp.salary_per_hour,
        shift_name: emp.shift?.shift_name || 'General',
      },
      summary: {
        totalDaysWorked: Math.round(periodDaysWorked * 10) / 10,
        totalEligibleSalary: periodEligibleBaseSalary, // Base Salary EXCLUDING OT
        totalOtHours: Math.round(periodOtHours * 100) / 100,
        totalOtSalary: periodOtSalary, // Excluded from bonus calculation
        totalGrossEarnings: periodGrossTotalSalary,
        bonusPercentage: parsedBonusPct,
        bonusFromBase,
        bonusIncentive: parsedIncentive,
        netBonusPayable,
      },
      monthlyBreakdown,
    });
  }

  // Calculate Overall Company Summary
  const grandTotalEligibleSalary = Math.round(results.reduce((sum, r) => sum + r.totalEligibleSalary, 0) * 100) / 100;
  const grandTotalOtExcluded = Math.round(results.reduce((sum, r) => sum + r.totalOtSalary, 0) * 100) / 100;
  const grandTotalOtHoursExcluded = Math.round(results.reduce((sum, r) => sum + r.totalOtHours, 0) * 100) / 100;
  const grandTotalBonusPayable = Math.round(results.reduce((sum, r) => sum + r.netBonusPayable, 0) * 100) / 100;

  const summary = {
    totalEmployees: results.length,
    employeeCount: results.length,
    totalEligibleSalary: grandTotalEligibleSalary,
    totalOtSalaryExcluded: grandTotalOtExcluded,
    totalOtHoursExcluded: grandTotalOtHoursExcluded,
    totalBonusPayable: grandTotalBonusPayable,
  };

  return {
    period: {
      startMonth,
      endMonth,
      startLabel: formatMonthLabel(startMonth),
      endLabel: formatMonthLabel(endMonth),
      totalMonths: monthList.length,
      monthList,
    },
    config: {
      bonusPercentage: parsedBonusPct,
      bonusIncentive: parsedIncentive,
      otRule: 'EXCLUDED',
      formula: 'Net Bonus = (Eligible Base Salary × Bonus% / 100) + Bonus Incentive (Excluding OT)',
    },
    summary,
    companyTotals: summary,
    employees: results,
  };
}
