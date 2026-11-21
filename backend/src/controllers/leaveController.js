import { LeaveType, LeaveBalance, LeaveRequest, Employee, Attendance } from '../models/index.js';
import { logAudit } from '../services/auditService.js';

export async function getLeaveTypes(req, res) {
  try {
    const types = await LeaveType.findAll({ order: [['id', 'ASC']] });
    return res.json({ success: true, leaveTypes: types });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createLeaveType(req, res) {
  try {
    const { name, description, annual_limit = 12, is_paid = true } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Leave type name is required' });

    const leaveType = await LeaveType.create({
      name,
      description,
      annual_limit: parseInt(annual_limit),
      is_paid: Boolean(is_paid),
    });

    return res.status(201).json({ success: true, leaveType });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getLeaveBalances(req, res) {
  try {
    const employee_id = req.query.employee_id || (req.user?.role === 'employee' ? req.user.id : null);
    const where = {};
    if (employee_id) where.employee_id = employee_id;

    const balances = await LeaveBalance.findAll({
      where,
      include: [
        { model: LeaveType, as: 'leaveType' },
        { model: Employee, as: 'employee', attributes: ['id', 'name', 'employee_code'] }
      ]
    });

    return res.json({ success: true, balances });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getLeaveRequests(req, res) {
  try {
    const where = {};
    if (req.user?.role === 'employee') {
      where.employee_id = req.user.id;
    } else if (req.query.employee_id) {
      where.employee_id = req.query.employee_id;
    }

    const requests = await LeaveRequest.findAll({
      where,
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'name', 'employee_code', 'department'] },
        { model: LeaveType, as: 'leaveType' }
      ],
      order: [['id', 'DESC']]
    });

    return res.json({ success: true, leaveRequests: requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function applyLeave(req, res) {
  try {
    const employee_id = req.user?.role === 'employee' ? req.user.id : req.body.employee_id;
    const { leave_type_id, from_date, to_date, number_of_days = 1, reason } = req.body;

    if (!employee_id || !leave_type_id || !from_date || !to_date || !reason) {
      return res.status(400).json({ success: false, message: 'All leave application fields are required' });
    }

    const request = await LeaveRequest.create({
      employee_id,
      leave_type_id,
      from_date,
      to_date,
      number_of_days: parseFloat(number_of_days),
      reason,
      status: 'PENDING',
    });

    return res.status(201).json({ success: true, message: 'Leave request submitted successfully', request });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateLeaveStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid leave status' });
    }

    const request = await LeaveRequest.findByPk(id, {
      include: [{ model: Employee, as: 'employee' }]
    });

    if (!request) return res.status(404).json({ success: false, message: 'Leave request not found' });

    request.status = status;
    request.approved_by = req.user.id;
    request.approved_at = new Date();
    await request.save();

    // If approved, update leave balance and mark daily attendance
    if (status === 'APPROVED') {
      const year = new Date(request.from_date).getFullYear();
      let balance = await LeaveBalance.findOne({
        where: { employee_id: request.employee_id, leave_type_id: request.leave_type_id, year }
      });

      if (balance) {
        balance.used += request.number_of_days;
        balance.remaining = Math.max(0, balance.allocated - balance.used);
        await balance.save();
      }

      // Mark daily attendance record as LEAVE for the dates
      const curr = new Date(request.from_date);
      const end = new Date(request.to_date);

      while (curr <= end) {
        const dStr = curr.toISOString().split('T')[0];
        let att = await Attendance.findOne({
          where: { employee_id: request.employee_id, date: dStr }
        });
        if (!att) {
          await Attendance.create({
            employee_id: request.employee_id,
            date: dStr,
            daily_status: 'LEAVE',
            shift_id: request.employee?.shift_id,
          });
        } else {
          att.daily_status = 'LEAVE';
          await att.save();
        }
        curr.setDate(curr.getDate() + 1);
      }
    }

    await logAudit({
      admin_id: req.user.id,
      action: `LEAVE_${status}`,
      module: 'LEAVE',
      record_id: request.id,
      new_value: { status, approved_by: req.user.id },
      req,
    });

    return res.json({ success: true, message: `Leave request has been ${status.toLowerCase()}`, request });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
