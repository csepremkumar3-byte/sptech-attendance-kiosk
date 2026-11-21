import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../config/database.js';
import {
  Employee,
  Attendance,
  Advance,
  SalaryHistory,
  Payroll,
  SalarySlip,
  LeaveBalance,
  LeaveRequest,
  FaceVerificationLog,
  Admin,
  Shift,
  Kiosk,
  LeaveType
} from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanAllEmployeeData() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database for cleanup...');

    // 1. Delete all child records first to respect foreign key constraints
    await SalarySlip.destroy({ where: {}, truncate: false });
    console.log('✓ Cleared Salary Slips');

    await Payroll.destroy({ where: {}, truncate: false });
    console.log('✓ Cleared Payrolls');

    await Advance.destroy({ where: {}, truncate: false });
    console.log('✓ Cleared Advances');

    await SalaryHistory.destroy({ where: {}, truncate: false });
    console.log('✓ Cleared Salary History');

    await LeaveRequest.destroy({ where: {}, truncate: false });
    console.log('✓ Cleared Leave Requests');

    await LeaveBalance.destroy({ where: {}, truncate: false });
    console.log('✓ Cleared Leave Balances');

    await Attendance.destroy({ where: {}, truncate: false });
    console.log('✓ Cleared Attendance Records');

    await FaceVerificationLog.destroy({ where: {}, truncate: false });
    console.log('✓ Cleared Face Verification Logs');

    // 2. Delete all Employees
    const deletedCount = await Employee.destroy({ where: {}, truncate: false });
    console.log(`✓ Deleted all Employees (Count: ${deletedCount})`);

    // 3. Clean generated PDF salary slips from uploads directory
    const uploadsDir = path.resolve(__dirname, '../../../uploads/salary-slips');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file.endsWith('.pdf')) {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      }
      console.log('✓ Removed generated PDF salary slips from disk');
    }

    // 4. Verify Admin Data remains intact
    const adminCount = await Admin.count();
    const shiftCount = await Shift.count();
    const kioskCount = await Kiosk.count();
    const leaveTypeCount = await LeaveType.count();
    const empCount = await Employee.count();

    console.log('\n================ DATA STATUS SUMMARY ================');
    console.log(`Admin accounts:     ${adminCount} (Only admin data preserved)`);
    console.log(`Shifts configured:  ${shiftCount}`);
    console.log(`Kiosks active:      ${kioskCount}`);
    console.log(`Leave types:        ${leaveTypeCount}`);
    console.log(`Employees:          ${empCount} (Completely clean)`);
    console.log('====================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Cleanup error:', err);
    process.exit(1);
  }
}

cleanAllEmployeeData();
