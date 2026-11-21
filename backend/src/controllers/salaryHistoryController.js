import { SalaryHistory, Employee, Admin } from '../models/index.js';
import { logAudit } from '../services/auditService.js';

export async function getSalaryHistory(req, res) {
  try {
    const { employee_id } = req.query;
    const where = {};
    if (employee_id) where.employee_id = employee_id;

    const history = await SalaryHistory.findAll({
      where,
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'name', 'employee_code', 'department'] },
        { model: Admin, as: 'admin', attributes: ['id', 'name', 'username'] }
      ],
      order: [['effective_from', 'DESC'], ['id', 'DESC']]
    });

    return res.json({ success: true, history });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function reviseSalaryRate(req, res) {
  try {
    const { employee_id, new_rate, effective_from, effective_to, reason } = req.body;
    if (!employee_id || new_rate === undefined || !reason) {
      return res.status(400).json({ success: false, message: 'Employee ID, New Rate, and Reason are required' });
    }

    const employee = await Employee.findByPk(employee_id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const oldRate = employee.salary_per_hour;
    const newRate = parseFloat(new_rate);

    // Compute standard 1-year window if end date is not explicitly provided
    const fromDate = effective_from || new Date().toISOString().split('T')[0];
    let toDate = effective_to;
    if (!toDate) {
      const d = new Date(fromDate);
      d.setFullYear(d.getFullYear() + 1);
      toDate = d.toISOString().split('T')[0];
    }

    // Close out previous open revision if necessary
    const prevRevisions = await SalaryHistory.findAll({
      where: { employee_id: employee.id },
      order: [['id', 'DESC']],
      limit: 1
    });
    if (prevRevisions.length > 0 && (!prevRevisions[0].effective_to || prevRevisions[0].effective_to > fromDate)) {
      const dayBefore = new Date(fromDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      await prevRevisions[0].update({ effective_to: dayBefore.toISOString().split('T')[0] });
    }

    const history = await SalaryHistory.create({
      employee_id: employee.id,
      revised_by: req.user.id,
      old_rate: oldRate,
      new_rate: newRate,
      effective_from: fromDate,
      effective_to: toDate,
      reason,
    });

    employee.salary_per_hour = newRate;
    await employee.save();

    await logAudit({
      admin_id: req.user.id,
      action: 'SALARY_REVISION',
      module: 'SALARY',
      record_id: history.id,
      old_value: { old_rate: oldRate },
      new_value: { new_rate: newRate, effective_from: fromDate, effective_to: toDate, reason },
      req,
    });

    return res.json({
      success: true,
      message: `Salary for ${employee.name} revised from ₹${oldRate} to ₹${newRate}/hr (Valid: ${fromDate} to ${toDate})`,
      history,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
