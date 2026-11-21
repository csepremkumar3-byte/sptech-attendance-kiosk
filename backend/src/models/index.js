import sequelize from '../config/database.js';
import Admin from './Admin.js';
import Shift from './Shift.js';
import Kiosk from './Kiosk.js';
import Employee from './Employee.js';
import Attendance from './Attendance.js';
import Advance from './Advance.js';
import SalaryHistory from './SalaryHistory.js';
import Payroll from './Payroll.js';
import SalarySlip from './SalarySlip.js';
import LeaveType from './LeaveType.js';
import LeaveBalance from './LeaveBalance.js';
import LeaveRequest from './LeaveRequest.js';
import AuditLog from './AuditLog.js';
import FaceVerificationLog from './FaceVerificationLog.js';

// Shift -> Employee
Shift.hasMany(Employee, { foreignKey: 'shift_id', as: 'employees' });
Employee.belongsTo(Shift, { foreignKey: 'shift_id', as: 'shift' });

// Employee -> Attendance
Employee.hasMany(Attendance, { foreignKey: 'employee_id', as: 'attendances' });
Attendance.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// Shift -> Attendance
Shift.hasMany(Attendance, { foreignKey: 'shift_id', as: 'attendances' });
Attendance.belongsTo(Shift, { foreignKey: 'shift_id', as: 'shift' });

// Kiosk -> Attendance
Kiosk.hasMany(Attendance, { foreignKey: 'kiosk_id', as: 'attendances' });
Attendance.belongsTo(Kiosk, { foreignKey: 'kiosk_id', as: 'kiosk' });

// Admin -> Attendance (Override)
Admin.hasMany(Attendance, { foreignKey: 'overridden_by', as: 'overriddenAttendances' });
Attendance.belongsTo(Admin, { foreignKey: 'overridden_by', as: 'overrideAdmin' });

// Employee -> Advance
Employee.hasMany(Advance, { foreignKey: 'employee_id', as: 'advances' });
Advance.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// Admin -> Advance (Recorded by)
Admin.hasMany(Advance, { foreignKey: 'recorded_by', as: 'recordedAdvances' });
Advance.belongsTo(Admin, { foreignKey: 'recorded_by', as: 'admin' });

// Payroll -> Advance
Payroll.hasMany(Advance, { foreignKey: 'settled_in_payroll_id', as: 'settledAdvances' });
Advance.belongsTo(Payroll, { foreignKey: 'settled_in_payroll_id', as: 'payroll' });

// Employee -> SalaryHistory
Employee.hasMany(SalaryHistory, { foreignKey: 'employee_id', as: 'salaryHistories' });
SalaryHistory.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// Admin -> SalaryHistory
Admin.hasMany(SalaryHistory, { foreignKey: 'revised_by', as: 'revisedSalaries' });
SalaryHistory.belongsTo(Admin, { foreignKey: 'revised_by', as: 'admin' });

// Employee -> Payroll
Employee.hasMany(Payroll, { foreignKey: 'employee_id', as: 'payrolls' });
Payroll.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// Admin -> Payroll (finalized by)
Admin.hasMany(Payroll, { foreignKey: 'finalized_by', as: 'finalizedPayrolls' });
Payroll.belongsTo(Admin, { foreignKey: 'finalized_by', as: 'admin' });

// Payroll -> SalarySlip
Payroll.hasOne(SalarySlip, { foreignKey: 'payroll_id', as: 'salarySlip' });
SalarySlip.belongsTo(Payroll, { foreignKey: 'payroll_id', as: 'payroll' });

// Leave relationships
Employee.hasMany(LeaveRequest, { foreignKey: 'employee_id', as: 'leaveRequests' });
LeaveRequest.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

LeaveType.hasMany(LeaveRequest, { foreignKey: 'leave_type_id', as: 'leaveRequests' });
LeaveRequest.belongsTo(LeaveType, { foreignKey: 'leave_type_id', as: 'leaveType' });

Employee.hasMany(LeaveBalance, { foreignKey: 'employee_id', as: 'leaveBalances' });
LeaveBalance.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

LeaveType.hasMany(LeaveBalance, { foreignKey: 'leave_type_id', as: 'leaveBalances' });
LeaveBalance.belongsTo(LeaveType, { foreignKey: 'leave_type_id', as: 'leaveType' });

Admin.hasMany(AuditLog, { foreignKey: 'admin_id', as: 'auditLogs' });
AuditLog.belongsTo(Admin, { foreignKey: 'admin_id', as: 'admin' });

export {
  sequelize,
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
  AuditLog,
  FaceVerificationLog,
};
