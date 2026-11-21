import { Shift, Employee } from '../models/index.js';
import { logAudit } from '../services/auditService.js';

export async function getAllShifts(req, res) {
  try {
    const shifts = await Shift.findAll({
      include: [{ model: Employee, as: 'employees', attributes: ['id', 'name', 'employee_code'] }],
      order: [['id', 'ASC']]
    });
    return res.json({ success: true, shifts });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createShift(req, res) {
  try {
    const {
      shift_name,
      morning_in,
      lunch_out,
      lunch_in,
      evening_out,
      ot_rate_multiplier = 1.5,
    } = req.body;

    if (!shift_name || !morning_in || !lunch_out || !lunch_in || !evening_out) {
      return res.status(400).json({ success: false, message: 'All shift times and shift name are required' });
    }

    const shift = await Shift.create({
      shift_name,
      morning_in,
      lunch_out,
      lunch_in,
      evening_out,
      ot_rate_multiplier: parseFloat(ot_rate_multiplier) || 1.5,
    });

    await logAudit({
      admin_id: req.user?.id,
      action: 'CREATE_SHIFT',
      module: 'SHIFT',
      record_id: shift.id,
      new_value: shift.toJSON(),
      req,
    });

    return res.status(201).json({ success: true, message: 'Shift created successfully', shift });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateShift(req, res) {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });

    const oldData = shift.toJSON();
    const { shift_name, morning_in, lunch_out, lunch_in, evening_out, ot_rate_multiplier } = req.body;

    if (shift_name) shift.shift_name = shift_name;
    if (morning_in) shift.morning_in = morning_in;
    if (lunch_out) shift.lunch_out = lunch_out;
    if (lunch_in) shift.lunch_in = lunch_in;
    if (evening_out) shift.evening_out = evening_out;
    if (ot_rate_multiplier !== undefined) shift.ot_rate_multiplier = parseFloat(ot_rate_multiplier);

    await shift.save();

    await logAudit({
      admin_id: req.user?.id,
      action: 'UPDATE_SHIFT',
      module: 'SHIFT',
      record_id: shift.id,
      old_value: oldData,
      new_value: shift.toJSON(),
      req,
    });

    return res.json({ success: true, message: 'Shift updated successfully', shift });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
