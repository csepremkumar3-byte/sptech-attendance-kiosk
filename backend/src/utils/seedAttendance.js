import sequelize from '../config/database.js';
import { Attendance, Employee, Kiosk, Shift } from '../models/index.js';

async function seedMonthlyAttendance() {
  try {
    await sequelize.authenticate();
    const emp1 = await Employee.findOne({ where: { employee_code: 'EMP001' } });
    const emp2 = await Employee.findOne({ where: { employee_code: 'EMP002' } });
    const kiosk = await Kiosk.findOne();
    const shift = await Shift.findOne();

    if (!emp1 || !emp2) {
      console.log('Employees not found');
      return;
    }

    const sampleDays = [
      { day: '01', status: 'PRESENT', in: '08:58:00', lOut: '13:02:00', lIn: '13:58:00', out: '18:05:00', hrs: 8.1, ot: 0.1 },
      { day: '02', status: 'PRESENT', in: '09:00:00', lOut: '13:00:00', lIn: '14:00:00', out: '18:02:00', hrs: 8.0, ot: 0.0 },
      { day: '03', status: 'OVERTIME', in: '08:45:00', lOut: '13:00:00', lIn: '13:55:00', out: '20:00:00', hrs: 10.2, ot: 2.2 },
      { day: '04', status: 'LATE', in: '09:42:00', lOut: '13:00:00', lIn: '14:00:00', out: '18:15:00', hrs: 7.5, ot: 0.0 },
    ];

    for (const s of sampleDays) {
      const date = `2026-10-${s.day}`;
      const existing = await Attendance.findOne({ where: { employee_id: emp1.id, date } });
      if (!existing) {
        await Attendance.create({
          employee_id: emp1.id,
          kiosk_id: kiosk?.id || 1,
          shift_id: shift?.id || 1,
          date,
          morning_in_punch: `${date}T${s.in}.000Z`,
          lunch_out_punch: `${date}T${s.lOut}.000Z`,
          lunch_in_punch: `${date}T${s.lIn}.000Z`,
          evening_out_punch: `${date}T${s.out}.000Z`,
          hours_worked: s.hrs,
          ot_hours: s.ot,
          daily_status: s.status,
        });
      }
    }

    console.log('✓ Seeded October sample attendance records');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding attendance:', err);
    process.exit(1);
  }
}

seedMonthlyAttendance();
