import { AuditLog, Admin } from '../models/index.js';

export async function getAuditLogs(req, res) {
  try {
    const { module, action, limit = 50 } = req.query;
    const where = {};
    if (module) where.module = module;
    if (action) where.action = action;

    const logs = await AuditLog.findAll({
      where,
      include: [{ model: Admin, as: 'admin', attributes: ['id', 'username', 'name'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
    });

    return res.json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
