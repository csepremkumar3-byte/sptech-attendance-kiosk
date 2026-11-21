import { AuditLog } from '../models/index.js';

export async function logAudit({
  admin_id = null,
  action,
  module,
  record_id = null,
  old_value = null,
  new_value = null,
  req = null,
}) {
  try {
    const ip_address = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';

    const oldStr = old_value ? (typeof old_value === 'string' ? old_value : JSON.stringify(old_value)) : null;
    const newStr = new_value ? (typeof new_value === 'string' ? new_value : JSON.stringify(new_value)) : null;

    return await AuditLog.create({
      admin_id,
      action,
      module,
      record_id: record_id ? String(record_id) : null,
      old_value: oldStr,
      new_value: newStr,
      ip_address,
    });
  } catch (err) {
    console.error('Audit log creation error:', err);
  }
}
