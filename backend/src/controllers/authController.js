import bcrypt from 'bcryptjs';
import { Admin, Employee, Shift } from '../models/index.js';
import { generateToken } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';

export async function adminLogin(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ where: { username } });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const token = generateToken({ id: admin.id, username: admin.username, role: 'admin' });

    await logAudit({
      admin_id: admin.id,
      action: 'ADMIN_LOGIN',
      module: 'AUTH',
      record_id: admin.id,
      new_value: { username: admin.username },
      req,
    });

    return res.json({
      success: true,
      message: 'Admin login successful',
      token,
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: 'admin',
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error during login', error: err.message });
  }
}

export async function employeeLogin(req, res) {
  try {
    const { employee_code, password } = req.body;
    if (!employee_code || !password) {
      return res.status(400).json({ success: false, message: 'Employee code and password are required' });
    }

    const employee = await Employee.findOne({
      where: { employee_code },
      include: [{ model: Shift, as: 'shift' }]
    });

    if (!employee) {
      return res.status(401).json({ success: false, message: 'Employee not found' });
    }

    if (employee.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Employee account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, employee.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    const token = generateToken({ id: employee.id, employee_code: employee.employee_code, role: 'employee' });

    return res.json({
      success: true,
      message: 'Employee login successful',
      token,
      user: {
        id: employee.id,
        name: employee.name,
        employee_code: employee.employee_code,
        department: employee.department,
        designation: employee.designation,
        salary_per_hour: employee.salary_per_hour,
        shift: employee.shift,
        role: 'employee',
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error during employee login', error: err.message });
  }
}

export async function getMe(req, res) {
  try {
    return res.json({
      success: true,
      user: req.user
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
