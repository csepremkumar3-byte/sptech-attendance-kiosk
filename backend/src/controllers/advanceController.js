import { Advance, Employee, Admin } from '../models/index.js';
import { logAudit } from '../services/auditService.js';

export async function getAllAdvances(req, res) {
  try {
    const { employee_id, status } = req.query;
    const where = {};
    if (employee_id) where.employee_id = employee_id;
    if (status) where.status = status;

    const advances = await Advance.findAll({
      where,
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'name', 'employee_code', 'department'] },
        { model: Admin, as: 'admin', attributes: ['id', 'name', 'username'] }
      ],
      order: [['date_given', 'DESC']]
    });

    return res.json({ success: true, advances });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createAdvance(req, res) {
  try {
    const { employee_id, amount, date_given, note } = req.body;
    if (!employee_id || !amount) {
      return res.status(400).json({ success: false, message: 'Employee ID and Advance Amount are required' });
    }

    const advance = await Advance.create({
      employee_id: parseInt(employee_id),
      recorded_by: req.user.id,
      amount: parseFloat(amount),
      date_given: date_given || new Date().toISOString().split('T')[0],
      note,
      status: 'PENDING',
    });

    await logAudit({
      admin_id: req.user.id,
      action: 'GIVE_ADVANCE',
      module: 'ADVANCE',
      record_id: advance.id,
      new_value: { employee_id, amount, date_given },
      req,
    });

    return res.status(201).json({ success: true, message: 'Employee advance recorded successfully', advance });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateAdvance(req, res) {
  try {
    const advance = await Advance.findByPk(req.params.id);
    if (!advance) return res.status(404).json({ success: false, message: 'Advance record not found' });

    if (advance.status === 'SETTLED') {
      return res.status(400).json({ success: false, message: 'Cannot edit an advance that has already been settled in payroll' });
    }

    const oldData = advance.toJSON();
    const { amount, note, status } = req.body;

    if (amount !== undefined) advance.amount = parseFloat(amount);
    if (note !== undefined) advance.note = note;
    if (status !== undefined) advance.status = status;

    await advance.save();

    await logAudit({
      admin_id: req.user.id,
      action: 'UPDATE_ADVANCE',
      module: 'ADVANCE',
      record_id: advance.id,
      old_value: oldData,
      new_value: advance.toJSON(),
      req,
    });

    return res.json({ success: true, message: 'Advance updated successfully', advance });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
