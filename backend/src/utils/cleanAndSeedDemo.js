import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
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

async function cleanAndSeed() {
  console.log('========================================================');
  console.log('  SPTech Clean Database & Demo Initializer');
  console.log('========================================================');

  try {
    await sequelize.authenticate();
    console.log('✓ Connected to SQLite database.');

    // 1. Ensure all tables and required columns exist
    await sequelize.sync();

    // Check & Add columns if not already in SQLite table schema
    const [empCols] = await sequelize.query("PRAGMA table_info(employees);");
    if (!empCols.some(c => c.name === 'epf_number')) {
      await sequelize.query("ALTER TABLE employees ADD COLUMN epf_number VARCHAR(100);");
      console.log('✓ Added missing column epf_number to employees');
    }

    const [salCols] = await sequelize.query("PRAGMA table_info(salary_histories);");
    if (!salCols.some(c => c.name === 'effective_to')) {
      await sequelize.query("ALTER TABLE salary_histories ADD COLUMN effective_to DATE;");
      console.log('✓ Added missing column effective_to to salary_histories');
    }

    const [payCols] = await sequelize.query("PRAGMA table_info(payrolls);");
    if (!payCols.some(c => c.name === 'epf_deduction')) {
      await sequelize.query("ALTER TABLE payrolls ADD COLUMN epf_deduction FLOAT DEFAULT 0.0;");
      console.log('✓ Added missing column epf_deduction to payrolls');
    }

    // 2. Clear all transaction & test data (clean slate)
    console.log('\n--- Cleaning all previous data ---');
    await sequelize.query('PRAGMA foreign_keys = OFF;');
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
    await Kiosk.destroy({ where: {}, truncate: false });
    await Shift.destroy({ where: {}, truncate: false });
    await LeaveType.destroy({ where: {}, truncate: false });
    // Recreate leave_balances cleanly to ensure proper composite unique constraint
    await LeaveBalance.sync({ force: true });
    await sequelize.query('PRAGMA foreign_keys = ON;');
    console.log('✓ Cleared all previous transactional, attendance, and employee data');

    // Clean generated PDF salary slips
    const uploadsDir = path.resolve(__dirname, '../../../uploads/salary-slips');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file.endsWith('.pdf')) {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      }
      console.log('✓ Removed old PDF salary slips from disk');
    } else {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 3. Seed / Verify Admin Account
    console.log('\n--- Seeding Core Configurations ---');
    let admin = await Admin.findOne({ where: { username: 'admin' } });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash('admin123', salt);
      admin = await Admin.create({
        username: 'admin',
        password_hash,
        name: 'Chief Administrator',
      });
      console.log('✓ Admin account seeded: admin / admin123');
    } else {
      console.log('✓ Admin account exists: admin');
    }

    // 4. Seed Standard 3 Shifts
    const shift1 = await Shift.create({
      shift_name: 'Shift 1 (7:00 AM - 3:00 PM)',
      morning_in: '07:00:00',
      lunch_out: '11:00:00',
      lunch_in: '11:30:00',
      evening_out: '15:00:00',
      ot_rate_multiplier: 1.5,
    });

    const shift2 = await Shift.create({
      shift_name: 'Shift 2 (3:00 PM - 11:00 PM)',
      morning_in: '15:00:00',
      lunch_out: '19:00:00',
      lunch_in: '19:30:00',
      evening_out: '23:00:00',
      ot_rate_multiplier: 1.5,
    });

    const shift3 = await Shift.create({
      shift_name: 'Shift 3 (11:00 PM - 7:00 AM)',
      morning_in: '23:00:00',
      lunch_out: '03:00:00',
      lunch_in: '03:30:00',
      evening_out: '07:00:00',
      ot_rate_multiplier: 1.5,
    });
    console.log('✓ 3 Industrial Shifts seeded (Shift 1, Shift 2, Shift 3)');

    // 5. Seed Kiosks
    const kiosk1 = await Kiosk.create({
      device_name: 'KIOSK-001 (Main Gate Reception)',
      location: 'Main Gate & Reception Entry',
      is_active: true,
    });
    await Kiosk.create({
      device_name: 'KIOSK-002 (Production Block B)',
      location: 'Production Floor - Shop B',
      is_active: true,
    });
    console.log('✓ 2 Kiosk terminals seeded');

    // 6. Seed Leave Types
    const cl = await LeaveType.create({
      name: 'Casual Leave (CL)',
      description: 'Casual and personal leave',
      annual_limit: 12,
      is_paid: true,
      status: 'ACTIVE'
    });
    const sl = await LeaveType.create({
      name: 'Sick Leave (SL)',
      description: 'Medical and sickness leave',
      annual_limit: 10,
      is_paid: true,
      status: 'ACTIVE'
    });
    console.log('✓ Leave types seeded');

    // 7. Seed 6 Employees mapped across Shifts with EPF numbers
    console.log('\n--- Seeding 6 Employees & Attendance ---');
    const empConfigs = [
      {
        name: 'Rajesh Kumar',
        code: 'EMP001',
        dept: 'CNC Machining',
        designation: 'Senior CNC Operator',
        hourlyRate: 175.0,
        shift: shift1,
        epf: 'TN/MAS/0048123/1001 (Active UAN: 101489201101)'
      },
      {
        name: 'Priya Sharma',
        code: 'EMP002',
        dept: 'Quality Assurance',
        designation: 'QA Specialist',
        hourlyRate: 185.0,
        shift: shift1,
        epf: 'TN/MAS/0048123/1002 (Active UAN: 101489201102)'
      },
      {
        name: 'Anitha R',
        code: 'EMP003',
        dept: 'Electronics Assembly',
        designation: 'Assembly Lead',
        hourlyRate: 165.0,
        shift: shift2,
        epf: 'TN/MAS/0048123/1003 (Active UAN: 101489201103)'
      },
      {
        name: 'Suresh V',
        code: 'EMP004',
        dept: 'Plant Maintenance',
        designation: 'Maintenance Technician',
        hourlyRate: 170.0,
        shift: shift2,
        epf: 'TN/MAS/0048123/1004 (Active UAN: 101489201104)'
      },
      {
        name: 'Karthik M',
        code: 'EMP005',
        dept: 'Packaging & Dispatch',
        designation: 'Packaging Supervisor',
        hourlyRate: 180.0,
        shift: shift3,
        epf: 'TN/MAS/0048123/1005 (Active UAN: 101489201105)'
      },
      {
        name: 'Vignesh P',
        code: 'EMP006',
        dept: 'Security & Operations',
        designation: 'Night Shift Controller',
        hourlyRate: 195.0,
        shift: shift3,
        epf: 'TN/MAS/0048123/1006 (Active UAN: 101489201106)'
      },
    ];

    const seededEmployees = [];
    const empPasswordHash = await bcrypt.hash('emp123', 10);

    for (const ec of empConfigs) {
      const emp = await Employee.create({
        employee_code: ec.code,
        name: ec.name,
        email: `${ec.code.toLowerCase()}@sp-tech.in`,
        password_hash: empPasswordHash,
        phone: '9840123456',
        department: ec.dept,
        designation: ec.designation,
        date_of_joining: '2024-01-15',
        status: 'ACTIVE',
        salary_per_hour: ec.hourlyRate,
        shift_id: ec.shift.id,
        epf_number: ec.epf,
        face_enrolled: false,
      });

      // Salary history record with 1 year validity
      await SalaryHistory.create({
        employee_id: emp.id,
        revised_by: admin.id,
        old_rate: ec.hourlyRate,
        new_rate: ec.hourlyRate,
        effective_from: '2026-01-01',
        effective_to: '2026-12-31',
        reason: 'Standard 2026 annual employment contract',
      });

      // Leave balances
      await LeaveBalance.create({
        employee_id: emp.id,
        leave_type_id: cl.id,
        year: 2026,
        allocated: 12,
        used: 1,
        remaining: 11,
      });
      await LeaveBalance.create({
        employee_id: emp.id,
        leave_type_id: sl.id,
        year: 2026,
        allocated: 10,
        used: 0,
        remaining: 10,
      });

      seededEmployees.push({ emp, shift: ec.shift });
    }

    console.log(`✓ Seeded 6 active employees with 1-year salary contracts & EPF numbers`);

    // 8. Seed Realistic October 2026 Attendance (22 working days per employee)
    // Working hours & punch times perfectly match employee shifts!
    const workingDaysCount = 22;

    for (const { emp, shift } of seededEmployees) {
      for (let day = 1; day <= workingDaysCount; day++) {
        const dayStr = String(day).padStart(2, '0');
        const date = `2026-10-${dayStr}`;

        let morningIn, lunchOut, lunchIn, eveningOut;
        let hoursWorked = 7.5;
        let otHours = 0.0;
        let dailyStatus = 'PRESENT';

        if (shift.id === shift1.id) {
          // Shift 1: 07:00 - 15:00
          morningIn = `${date}T06:58:00.000Z`;
          lunchOut = `${date}T11:00:00.000Z`;
          lunchIn = `${date}T11:30:00.000Z`;
          eveningOut = `${date}T15:02:00.000Z`;
          hoursWorked = 7.5;
        } else if (shift.id === shift2.id) {
          // Shift 2: 15:00 - 23:00
          morningIn = `${date}T14:58:00.000Z`;
          lunchOut = `${date}T19:00:00.000Z`;
          lunchIn = `${date}T19:30:00.000Z`;
          eveningOut = `${date}T23:02:00.000Z`;
          hoursWorked = 7.5;
        } else {
          // Shift 3: 23:00 - 07:00 (Crosses midnight)
          const nextDay = String(day + 1).padStart(2, '0');
          const nextDate = `2026-10-${nextDay}`;
          morningIn = `${date}T22:58:00.000Z`;
          lunchOut = `${nextDate}T03:00:00.000Z`;
          lunchIn = `${nextDate}T03:30:00.000Z`;
          eveningOut = `${nextDate}T07:02:00.000Z`;
          hoursWorked = 7.5;
        }

        // Give slight overtime on days 10 and 20 for realistic OT calculations
        if (day === 10 || day === 20) {
          otHours = 1.5;
          hoursWorked = 9.0;
        }

        await Attendance.create({
          employee_id: emp.id,
          kiosk_id: kiosk1.id,
          shift_id: shift.id,
          date,
          morning_in_punch: morningIn,
          lunch_out_punch: lunchOut,
          lunch_in_punch: lunchIn,
          evening_out_punch: eveningOut,
          hours_worked: hoursWorked,
          ot_hours: otHours,
          daily_status: dailyStatus,
        });
      }
    }

    console.log(`✓ Seeded October attendance records (22 days × 6 employees = 132 attendance records)`);
    console.log(`  All punch times accurately match assigned Shift 1, Shift 2, and Shift 3 working hours!`);

    console.log('\n========================================================');
    console.log('  DATA PREPARATION COMPLETE: READY FOR LIVE DEMO');
    console.log('========================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

cleanAndSeed();
