import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../config/database.js';
import {
  Admin,
  Shift,
  Kiosk,
  Employee,
  Attendance,
  Advance,
  SalaryHistory,
  Payroll,
  SalarySlip,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  FaceVerificationLog,
  AuditLog
} from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function wipeAllApplicationData() {
  console.log('========================================================');
  console.log('  SPTech Complete Data Wipe & Reset');
  console.log('========================================================');

  try {
    await sequelize.authenticate();
    console.log('✓ Connected to SQLite database.');

    await sequelize.query('PRAGMA foreign_keys = OFF;');

    // 1. Wipe all transactional & operational data
    await SalarySlip.destroy({ where: {}, truncate: false });
    await Payroll.destroy({ where: {}, truncate: false });
    await Advance.destroy({ where: {}, truncate: false });
    await SalaryHistory.destroy({ where: {}, truncate: false });
    await Attendance.destroy({ where: {}, truncate: false });
    await LeaveRequest.destroy({ where: {}, truncate: false });
    await LeaveBalance.destroy({ where: {}, truncate: false });
    await FaceVerificationLog.destroy({ where: {}, truncate: false });
    await AuditLog.destroy({ where: {}, truncate: false });
    await Employee.destroy({ where: {}, truncate: false });
    await Shift.destroy({ where: {}, truncate: false });

    // 2. Wipe generated PDF files from disk
    const uploadsDir = path.resolve(__dirname, '../../../uploads/salary-slips');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file.endsWith('.pdf')) {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      }
      console.log('✓ Cleared all generated PDF salary slips from disk');
    }

    // 3. Ensure core infrastructure exists: Admin, Kiosks, Leave Types

    const kioskCount = await Kiosk.count();
    if (kioskCount === 0) {
      await Kiosk.create({
        device_name: 'KIOSK-001 (Main Gate)',
        location: 'Main Reception & Gate Entry',
        is_active: true,
      });
      await Kiosk.create({
        device_name: 'KIOSK-002 (Production Block B)',
        location: 'Production Block B',
        is_active: true,
      });
      console.log('✓ Configured Kiosks');
    }

    const leaveTypeCount = await LeaveType.count();
    if (leaveTypeCount === 0) {
      await LeaveType.create({
        name: 'Casual Leave (CL)',
        description: 'Standard casual and emergency leave',
        annual_limit: 12,
        is_paid: true,
        status: 'ACTIVE'
      });
      await LeaveType.create({
        name: 'Sick Leave (SL)',
        description: 'Medical leave',
        annual_limit: 10,
        is_paid: true,
        status: 'ACTIVE'
      });
      console.log('✓ Configured Leave Types');
    }

    await sequelize.query('PRAGMA foreign_keys = ON;');

    console.log('\n========================================================');
    console.log('  WIPE COMPLETE: DASHBOARD & ALL DATA ARE CLEAN (0)');
    console.log('  Admin Login: admin / admin123');
    console.log('========================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Wipe error:', err);
    process.exit(1);
  }
}

wipeAllApplicationData();
