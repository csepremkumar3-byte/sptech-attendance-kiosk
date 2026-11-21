import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';
import { Employee, Shift, SalaryHistory, LeaveBalance, LeaveType, Admin } from '../models/index.js';

async function seedEmployees() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database...');

    const admin = await Admin.findOne();
    const shifts = await Shift.findAll();
    if (shifts.length === 0) {
      console.log('No shifts found.');
      process.exit(1);
    }

    const shift1 = shifts.find(s => s.shift_name.includes('Shift 1')) || shifts[0];
    const shift2 = shifts.find(s => s.shift_name.includes('Shift 2')) || shifts[0];
    const shift3 = shifts.find(s => s.shift_name.includes('Shift 3')) || shifts[0];

    const cl = await LeaveType.findOne({ where: { name: 'Casual Leave (CL)' } });
    const sl = await LeaveType.findOne({ where: { name: 'Sick Leave (SL)' } });

    const passwordHash = await bcrypt.hash('emp123', 10);

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

    for (const ec of empConfigs) {
      let emp = await Employee.findOne({ where: { employee_code: ec.code } });
      if (!emp) {
        emp = await Employee.create({
          employee_code: ec.code,
          name: ec.name,
          email: `${ec.code.toLowerCase()}@sp-tech.in`,
          password_hash: passwordHash,
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

        if (admin) {
          await SalaryHistory.create({
            employee_id: emp.id,
            revised_by: admin.id,
            old_rate: ec.hourlyRate,
            new_rate: ec.hourlyRate,
            effective_from: '2026-01-01',
            effective_to: '2026-12-31',
            reason: 'Standard employment contract',
          });
        }

        if (cl) {
          await LeaveBalance.create({
            employee_id: emp.id,
            leave_type_id: cl.id,
            year: 2026,
            allocated: 12,
            used: 0,
            remaining: 12,
          });
        }
        if (sl) {
          await LeaveBalance.create({
            employee_id: emp.id,
            leave_type_id: sl.id,
            year: 2026,
            allocated: 10,
            used: 0,
            remaining: 10,
          });
        }
      } else {
        emp.password_hash = passwordHash;
        await emp.save();
      }
    }

    console.log('✓ Successfully seeded 6 employees with password: emp123');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding employees:', err);
    process.exit(1);
  }
}

seedEmployees();
