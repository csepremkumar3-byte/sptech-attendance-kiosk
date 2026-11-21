import { Op } from 'sequelize';
import { Employee, Attendance, Kiosk, Payroll, LeaveRequest } from '../models/index.js';

export async function getDashboardStats(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    // 1. Total active employees
    const totalEmployees = await Employee.count({ where: { status: 'ACTIVE' } });

    // 2. Today's attendance
    const todayAttendances = await Attendance.findAll({ where: { date: today } });
    let presentToday = 0;
    let lateToday = 0;
    let overtimeHoursToday = 0;

    for (const a of todayAttendances) {
      if (a.daily_status === 'PRESENT' || a.daily_status === 'LATE') presentToday++;
      if (a.daily_status === 'LATE') lateToday++;
      overtimeHoursToday += (a.ot_hours || 0);
    }

    // 3. Today's leave
    const onLeaveToday = await LeaveRequest.count({
      where: {
        status: 'APPROVED',
        from_date: { [Op.lte]: today },
        to_date: { [Op.gte]: today }
      }
    });

    const absentToday = Math.max(0, totalEmployees - presentToday - onLeaveToday);

    // 4. Active Kiosks
    const activeKiosks = await Kiosk.count({ where: { is_active: true } });
    const totalKiosks = await Kiosk.count();

    // 5. Current Month Payroll Total
    const currentPayrollSum = await Payroll.sum('total_salary', { where: { month: currentMonth } }) || 0;

    // 6. Recent 7-Day Attendance Trend
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const count = await Attendance.count({
        where: {
          date: dStr,
          daily_status: { [Op.in]: ['PRESENT', 'LATE'] }
        }
      });
      trend.push({
        date: dStr.substring(5), // MM-DD
        present: count,
      });
    }

    // 7. Department Attendance Breakdown
    const employees = await Employee.findAll({ attributes: ['id', 'department'] });
    const deptMap = {};
    employees.forEach(e => {
      const dept = e.department || 'General';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    const departmentStats = Object.keys(deptMap).map(dept => ({
      name: dept,
      employees: deptMap[dept]
    }));

    return res.json({
      success: true,
      stats: {
        totalEmployees,
        presentToday,
        absentToday,
        lateToday,
        onLeaveToday,
        overtimeHoursToday: Math.round(overtimeHoursToday * 100) / 100,
        activeKiosks: `${activeKiosks} / ${totalKiosks}`,
        currentMonthPayroll: Math.round(currentPayrollSum * 100) / 100,
      },
      charts: {
        attendanceTrend: trend,
        departmentBreakdown: departmentStats,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAttendanceReport(req, res) {
  try {
    const { startDate, endDate, format } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }

    const records = await Attendance.findAll({
      where,
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'name', 'employee_code', 'department'] }],
      order: [['date', 'DESC']]
    });

    if (format === 'csv') {
      const headers = ['Date,Employee Code,Employee Name,Department,Status,Morning In,Lunch Out,Lunch In,Evening Out,Hours Worked,OT Hours\n'];
      const rows = records.map(r => {
        return [
          r.date,
          r.employee?.employee_code || '',
          `"${r.employee?.name || ''}"`,
          `"${r.employee?.department || ''}"`,
          r.daily_status,
          r.morning_in_punch ? new Date(r.morning_in_punch).toLocaleTimeString() : '',
          r.lunch_out_punch ? new Date(r.lunch_out_punch).toLocaleTimeString() : '',
          r.lunch_in_punch ? new Date(r.lunch_in_punch).toLocaleTimeString() : '',
          r.evening_out_punch ? new Date(r.evening_out_punch).toLocaleTimeString() : '',
          r.hours_worked,
          r.ot_hours
        ].join(',');
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
      return res.send(headers.concat(rows).join('\n'));
    }

    return res.json({ success: true, count: records.length, records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
