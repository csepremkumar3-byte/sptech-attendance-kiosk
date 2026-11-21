import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Payroll, Employee, Shift, SalarySlip, Admin } from '../models/index.js';
import { calculateEmployeeMonthlyPayroll, processPayrollRecord } from '../services/payrollService.js';
import { generateSalarySlipPdf } from '../services/pdfService.js';
import { logAudit } from '../services/auditService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getPayrollPreview(req, res) {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Valid month in YYYY-MM format is required' });
    }

    const employees = await Employee.findAll({
      where: { status: 'ACTIVE' },
      include: [{ model: Shift, as: 'shift' }]
    });

    const previews = [];
    for (const emp of employees) {
      const calc = await calculateEmployeeMonthlyPayroll(emp.id, month);
      const existing = await Payroll.findOne({ where: { employee_id: emp.id, month } });
      previews.push({
        ...calc,
        isFinalized: Boolean(existing?.is_locked),
        existingPayrollId: existing?.id || null,
      });
    }

    return res.json({ success: true, month, previews });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function processPayroll(req, res) {
  try {
    const { employee_id, month, incentive, benefits, deductions, finalize = false } = req.body;
    if (!employee_id || !month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Employee ID and month in YYYY-MM format required' });
    }

    const payroll = await processPayrollRecord({
      employee_id: parseInt(employee_id),
      month,
      admin_id: req.user.id,
      incentive: parseFloat(incentive) || 0,
      benefits: parseFloat(benefits) || 0,
      deductions: parseFloat(deductions) || 0,
      finalize: Boolean(finalize),
    });

    await logAudit({
      admin_id: req.user.id,
      action: finalize ? 'FINALIZE_PAYROLL' : 'PROCESS_PAYROLL',
      module: 'PAYROLL',
      record_id: payroll.id,
      new_value: payroll.toJSON(),
      req,
    });

    return res.json({
      success: true,
      message: finalize ? 'Payroll finalized and salary slip generated' : 'Payroll calculated and saved',
      payroll,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function processAllPayroll(req, res) {
  try {
    const { month, finalize = false } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Valid month in YYYY-MM format required' });
    }

    const employees = await Employee.findAll({ where: { status: 'ACTIVE' } });
    const results = [];

    for (const emp of employees) {
      try {
        const p = await processPayrollRecord({
          employee_id: emp.id,
          month,
          admin_id: req.user.id,
          finalize: Boolean(finalize),
        });
        results.push({ employee_id: emp.id, success: true, payroll: p });
      } catch (err) {
        results.push({ employee_id: emp.id, success: false, error: err.message });
      }
    }

    return res.json({
      success: true,
      message: `Processed batch payroll for ${results.length} employees`,
      results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAllPayrolls(req, res) {
  try {
    const { month, employee_id } = req.query;
    const where = {};
    if (month) where.month = month;
    if (employee_id) where.employee_id = employee_id;

    // If employee logged in, restrict to own payroll
    if (req.user?.role === 'employee') {
      where.employee_id = req.user.id;
    }

    const payrolls = await Payroll.findAll({
      where,
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'name', 'employee_code', 'department'] },
        { model: Admin, as: 'admin', attributes: ['id', 'name', 'username'] },
        { model: SalarySlip, as: 'salarySlip' }
      ],
      order: [['month', 'DESC'], ['id', 'DESC']]
    });

    return res.json({ success: true, payrolls });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function downloadSalarySlip(req, res) {
  try {
    const { payrollId } = req.params;
    const payroll = await Payroll.findByPk(payrollId, {
      include: [{ model: Employee, as: 'employee' }]
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    let slip = await SalarySlip.findOne({ where: { payroll_id: payrollId } });

    if (!slip) {
      slip = await generateSalarySlipPdf(payrollId);
    }

    const uploadDir = path.resolve(__dirname, '../../../uploads/salary-slips');
    const fileName = `salary_slip_${payroll.employee?.employee_code || 'EMP'}_${payroll.month}.pdf`;
    let filePath = path.join(uploadDir, path.basename(slip.pdf_url));

    if (!fs.existsSync(filePath)) {
      slip = await generateSalarySlipPdf(payrollId);
      filePath = path.join(uploadDir, path.basename(slip.pdf_url));
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.download(filePath, fileName);
  } catch (err) {
    console.error('Download salary slip error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
