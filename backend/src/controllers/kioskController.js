import { Kiosk } from '../models/index.js';
import { logAudit } from '../services/auditService.js';

export async function getAllKiosks(req, res) {
  try {
    const kiosks = await Kiosk.findAll({ order: [['id', 'ASC']] });
    return res.json({ success: true, kiosks });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createKiosk(req, res) {
  try {
    const { device_name, location, is_active = true } = req.body;
    if (!device_name || !location) {
      return res.status(400).json({ success: false, message: 'Device name and location are required' });
    }

    const kiosk = await Kiosk.create({
      device_name,
      location,
      is_active,
    });

    await logAudit({
      admin_id: req.user?.id,
      action: 'CREATE_KIOSK',
      module: 'KIOSK',
      record_id: kiosk.id,
      new_value: { device_name, location, is_active },
      req,
    });

    return res.status(201).json({ success: true, message: 'Kiosk created successfully', kiosk });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateKiosk(req, res) {
  try {
    const kiosk = await Kiosk.findByPk(req.params.id);
    if (!kiosk) return res.status(404).json({ success: false, message: 'Kiosk not found' });

    const oldData = kiosk.toJSON();
    const { device_name, location, is_active } = req.body;

    if (device_name) kiosk.device_name = device_name;
    if (location) kiosk.location = location;
    if (is_active !== undefined) kiosk.is_active = is_active;

    await kiosk.save();

    await logAudit({
      admin_id: req.user?.id,
      action: 'UPDATE_KIOSK',
      module: 'KIOSK',
      record_id: kiosk.id,
      old_value: oldData,
      new_value: kiosk.toJSON(),
      req,
    });

    return res.json({ success: true, message: 'Kiosk updated successfully', kiosk });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function toggleKioskStatus(req, res) {
  try {
    const kiosk = await Kiosk.findByPk(req.params.id);
    if (!kiosk) return res.status(404).json({ success: false, message: 'Kiosk not found' });

    kiosk.is_active = !kiosk.is_active;
    await kiosk.save();

    await logAudit({
      admin_id: req.user?.id,
      action: kiosk.is_active ? 'ACTIVATE_KIOSK' : 'DEACTIVATE_KIOSK',
      module: 'KIOSK',
      record_id: kiosk.id,
      new_value: { is_active: kiosk.is_active },
      req,
    });

    return res.json({ success: true, message: `Kiosk ${kiosk.is_active ? 'activated' : 'deactivated'}`, kiosk });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
