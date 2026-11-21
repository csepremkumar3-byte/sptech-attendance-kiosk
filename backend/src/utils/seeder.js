import bcrypt from 'bcryptjs';
import { Admin, Shift, Kiosk, Employee, LeaveType, LeaveBalance, Attendance } from '../models/index.js';

export async function seedInitialData() {
  try {
    // 1. Check or Seed Admin
    const adminCount = await Admin.count();
    let admin;
    if (adminCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash('admin123', salt);
      admin = await Admin.create({
        username: 'admin',
        password_hash,
        name: 'Chief Administrator',
      });
      console.log('✓ Default Admin created: admin / admin123');
    } else {
      admin = await Admin.findOne();
    }

    // 2. Shifts are user-configured (no default auto-creation)

    // 3. Check or Seed Kiosks
    const kioskCount = await Kiosk.count();
    if (kioskCount === 0) {
      await Kiosk.create({
        device_name: 'KIOSK-001 (Main Reception)',
        location: 'Main Reception - Ground Floor',
        is_active: true,
      });
      await Kiosk.create({
        device_name: 'KIOSK-002 (Production Entrance)',
        location: 'Production Block B',
        is_active: true,
      });
      console.log('✓ Default Kiosks created');
    }

    // 4. Check or Seed Leave Types
    const leaveTypeCount = await LeaveType.count();
    let casualLeave;
    if (leaveTypeCount === 0) {
      casualLeave = await LeaveType.create({
        name: 'Casual Leave (CL)',
        description: 'Standard casual and personal emergency leave',
        annual_limit: 12,
        is_paid: true,
        status: 'ACTIVE'
      });
      await LeaveType.create({
        name: 'Sick Leave (SL)',
        description: 'Medical and health related absence',
        annual_limit: 10,
        is_paid: true,
        status: 'ACTIVE'
      });
      console.log('✓ Default Leave Types created');
    } else {
      casualLeave = await LeaveType.findOne();
    }

    console.log('✓ Admin, Shifts, Kiosks & Leave Types verified.');
  } catch (err) {
    console.error('Seeding error:', err);
  }
}
