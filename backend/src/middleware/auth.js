import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Admin, Employee } from '../models/index.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'sptech_super_secret_jwt_key_2026_secure';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. Missing Bearer token.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role === 'admin') {
      const admin = await Admin.findByPk(decoded.id);
      if (!admin) {
        return res.status(401).json({ success: false, message: 'Invalid admin credentials or account deleted' });
      }
      req.user = { id: admin.id, username: admin.username, name: admin.name, role: 'admin' };
    } else if (decoded.role === 'employee') {
      const emp = await Employee.findByPk(decoded.id);
      if (!emp || emp.status !== 'ACTIVE') {
        return res.status(401).json({ success: false, message: 'Inactive or deleted employee account' });
      }
      req.user = { id: emp.id, name: emp.name, employee_code: emp.employee_code, role: 'employee' };
    } else {
      return res.status(401).json({ success: false, message: 'Unknown authorization role' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', error: err.message });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied: Administrator privilege required' });
  }
  next();
}

export function requireEmployeeOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}
