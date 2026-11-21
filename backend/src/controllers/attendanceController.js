import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Attendance, Employee, Shift, Kiosk, Admin } from '../models/index.js';
import { processPunch, calculateAttendanceHours } from '../services/attendanceService.js';
import { logAudit } from '../services/auditService.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'sptech_super_secret_jwt_key_2026_secure';

export async function punchAttendance(req, res) {
  try {
    const {
      employee_id,
      employee_code,
      password,
      kiosk_id,
      punch_type,
      verificationToken,
      offline_txn_id,
      timestamp,
      is_manual_fallback = false,
    } = req.body;

    let targetEmployeeId = employee_id;

    // If verification token provided, verify cryptographically (face scan)
    if (verificationToken) {
      try {
        const decoded = jwt.verify(verificationToken, JWT_SECRET);
        targetEmployeeId = decoded.verified_employee_id;
      } catch (tokenErr) {
        return res.status(401).json({
          success: false,
          message: 'Biometric verification token has expired or is invalid. Please re-verify face.'
        });
      }
    } else if (employee_code) {
      // Manual ID Attendance with Required Password Validation
      const cleanCode = employee_code.trim().toUpperCase();
      const emp = await Employee.findOne({ where: { employee_code: cleanCode } });
      if (!emp) {
        return res.status(404).json({ success: false, message: `Employee ID "${cleanCode}" not found` });
      }

      if (!password || !password.trim()) {
        return res.status(400).json({ success: false, message: 'Password is required to mark manual attendance' });
      }

      const isMatch = await bcrypt.compare(password.trim(), emp.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid employee password. Verification failed.' });
      }

      targetEmployeeId = emp.id;
    }

    if (!targetEmployeeId) {
      return res.status(400).json({ success: false, message: 'Valid Employee ID and password or biometric verification required' });
    }

    const result = await processPunch({
      employee_id: targetEmployeeId,
      kiosk_id: kiosk_id ? parseInt(kiosk_id) : null,
      punch_type,
      timestamp: timestamp || new Date(),
      offline_txn_id,
      synced_offline: false,
    });

    if (is_manual_fallback) {
      result.message = `Attendance Marked via Manual ID (${result.punchName})`;
    }

    return res.json({
      success: true,
      is_manual_fallback: Boolean(is_manual_fallback),
      ...result,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

export async function getTodayAttendance(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const records = await Attendance.findAll({
      where: { date: today },
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'name', 'employee_code', 'department', 'designation'] },
        { model: Shift, as: 'shift', attributes: ['id', 'shift_name'] },
        { model: Kiosk, as: 'kiosk', attributes: ['id', 'device_name', 'location'] }
      ],
      order: [['updatedAt', 'DESC']]
    });

    return res.json({ success: true, date: today, attendances: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAttendanceHistory(req, res) {
  try {
    const { employee_id, date, startDate, endDate, status } = req.query;
    const where = {};

    if (employee_id) where.employee_id = employee_id;
    if (date) where.date = date;
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }
    if (status) where.daily_status = status;

    const records = await Attendance.findAll({
      where,
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'name', 'employee_code', 'department'] },
        { model: Shift, as: 'shift', attributes: ['id', 'shift_name'] },
        { model: Kiosk, as: 'kiosk', attributes: ['id', 'device_name', 'location'] },
        { model: Admin, as: 'overrideAdmin', attributes: ['id', 'name', 'username'] }
      ],
      order: [['date', 'DESC'], ['id', 'DESC']]
    });

    return res.json({ success: true, attendances: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getMyAttendance(req, res) {
  try {
    const employee_id = req.user.id;
    const { month } = req.query; // optional YYYY-MM
    const where = { employee_id };

    if (month) {
      const [year, m] = month.split('-').map(Number);
      const lastDay = new Date(year, m, 0).getDate();
      where.date = { [Op.between]: [`${month}-01`, `${month}-${String(lastDay).padStart(2, '0')}`] };
    }

    const records = await Attendance.findAll({
      where,
      include: [
        { model: Shift, as: 'shift', attributes: ['id', 'shift_name'] },
        { model: Kiosk, as: 'kiosk', attributes: ['id', 'device_name', 'location'] }
      ],
      order: [['date', 'DESC']]
    });

    return res.json({ success: true, attendances: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function overrideAttendance(req, res) {
  try {
    const {
      attendance_id,
      morning_in_punch,
      lunch_out_punch,
      lunch_in_punch,
      evening_out_punch,
      daily_status,
      override_reason
    } = req.body;

    if (!attendance_id || !override_reason) {
      return res.status(400).json({
        success: false,
        message: 'Attendance ID and a valid Override Reason are mandatory for administrative adjustments.'
      });
    }

    const attendance = await Attendance.findByPk(attendance_id, {
      include: [
        { model: Employee, as: 'employee' },
        { model: Shift, as: 'shift' }
      ]
    });

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const oldData = attendance.toJSON();

    if (morning_in_punch !== undefined) attendance.morning_in_punch = morning_in_punch ? new Date(morning_in_punch) : null;
    if (lunch_out_punch !== undefined) attendance.lunch_out_punch = lunch_out_punch ? new Date(lunch_out_punch) : null;
    if (lunch_in_punch !== undefined) attendance.lunch_in_punch = lunch_in_punch ? new Date(lunch_in_punch) : null;
    if (evening_out_punch !== undefined) attendance.evening_out_punch = evening_out_punch ? new Date(evening_out_punch) : null;
    if (daily_status) attendance.daily_status = daily_status;

    // Recalculate hours and overtime
    const calc = calculateAttendanceHours(attendance, attendance.shift);
    attendance.hours_worked = calc.hours_worked;
    attendance.ot_hours = calc.ot_hours;
    if (!daily_status) {
      attendance.daily_status = calc.daily_status;
    }

    attendance.is_overridden = true;
    attendance.override_reason = override_reason;
    attendance.overridden_by = req.user.id;

    await attendance.save();

    await logAudit({
      admin_id: req.user.id,
      action: 'ATTENDANCE_OVERRIDE',
      module: 'ATTENDANCE',
      record_id: attendance.id,
      old_value: oldData,
      new_value: attendance.toJSON(),
      req,
    });

    return res.json({
      success: true,
      message: 'Attendance successfully overridden and audited',
      attendance,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function syncOfflineBatch(req, res) {
  try {
    const { batch } = req.body; // array of offline punch records
    if (!Array.isArray(batch) || batch.length === 0) {
      return res.status(400).json({ success: false, message: 'Batch must be a non-empty array' });
    }

    const results = [];
    for (const item of batch) {
      try {
        const resPunch = await processPunch({
          employee_id: item.employee_id,
          kiosk_id: item.kiosk_id,
          punch_type: item.punch_type,
          timestamp: item.timestamp,
          synced_offline: true,
          offline_txn_id: item.offline_txn_id || `offline_${Date.now()}_${Math.random()}`
        });
        results.push({ offline_txn_id: item.offline_txn_id, success: true, data: resPunch });
      } catch (err) {
        results.push({ offline_txn_id: item.offline_txn_id, success: false, error: err.message });
      }
    }

    return res.json({
      success: true,
      message: `Processed ${results.length} offline attendance items`,
      results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
