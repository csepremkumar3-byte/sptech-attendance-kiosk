import { Router } from 'express';
import { authenticate, requireAdmin, requireEmployeeOrAdmin } from '../middleware/auth.js';
import * as authCtrl from '../controllers/authController.js';
import * as empCtrl from '../controllers/employeeController.js';
import * as faceCtrl from '../controllers/faceController.js';
import * as attCtrl from '../controllers/attendanceController.js';
import * as kioskCtrl from '../controllers/kioskController.js';
import * as shiftCtrl from '../controllers/shiftController.js';
import * as leaveCtrl from '../controllers/leaveController.js';
import * as advCtrl from '../controllers/advanceController.js';
import * as salCtrl from '../controllers/salaryHistoryController.js';
import * as payCtrl from '../controllers/payrollController.js';
import * as bonusCtrl from '../controllers/bonusController.js';
import * as repCtrl from '../controllers/reportsController.js';
import * as audCtrl from '../controllers/auditController.js';

const router = Router();

// 1. Authentication
router.post('/auth/admin/login', authCtrl.adminLogin);
router.post('/auth/employee/login', authCtrl.employeeLogin);
router.get('/auth/me', authenticate, authCtrl.getMe);

// 2. Kiosk Face AI Verification & Kiosk Public Endpoints
router.get('/employees/code/:code', empCtrl.getEmployeeByCode);
router.post('/face/verify', faceCtrl.verifyFace);
router.post('/face/identify-punch', faceCtrl.identifyAndPunch);
router.post('/attendance/punch', attCtrl.punchAttendance);
router.post('/attendance/sync-offline', attCtrl.syncOfflineBatch);

// 3. Employees
router.get('/employees', authenticate, empCtrl.getAllEmployees);
router.get('/employees/:id', authenticate, empCtrl.getEmployeeById);
router.post('/employees', authenticate, requireAdmin, empCtrl.createEmployee);
router.put('/employees/:id', authenticate, requireAdmin, empCtrl.updateEmployee);
router.post('/employees/:id/face', authenticate, requireAdmin, empCtrl.enrollFace);

// 4. Kiosks
router.get('/kiosks', kioskCtrl.getAllKiosks);
router.post('/kiosks', authenticate, requireAdmin, kioskCtrl.createKiosk);
router.put('/kiosks/:id', authenticate, requireAdmin, kioskCtrl.updateKiosk);
router.patch('/kiosks/:id/toggle', authenticate, requireAdmin, kioskCtrl.toggleKioskStatus);

// 5. Shifts
router.get('/shifts', shiftCtrl.getAllShifts);
router.post('/shifts', authenticate, requireAdmin, shiftCtrl.createShift);
router.put('/shifts/:id', authenticate, requireAdmin, shiftCtrl.updateShift);

// 6. Attendance
router.get('/attendance/today', authenticate, attCtrl.getTodayAttendance);
router.get('/attendance/history', authenticate, attCtrl.getAttendanceHistory);
router.get('/attendance/my', authenticate, requireEmployeeOrAdmin, attCtrl.getMyAttendance);
router.post('/attendance/override', authenticate, requireAdmin, attCtrl.overrideAttendance);

// 7. Leaves
router.get('/leave-types', leaveCtrl.getLeaveTypes);
router.post('/leave-types', authenticate, requireAdmin, leaveCtrl.createLeaveType);
router.get('/leaves/balances', authenticate, leaveCtrl.getLeaveBalances);
router.get('/leaves', authenticate, leaveCtrl.getLeaveRequests);
router.post('/leaves/apply', authenticate, leaveCtrl.applyLeave);
router.patch('/leaves/:id/status', authenticate, requireAdmin, leaveCtrl.updateLeaveStatus);

// 8. Advances
router.get('/advances', authenticate, advCtrl.getAllAdvances);
router.post('/advances', authenticate, requireAdmin, advCtrl.createAdvance);
router.put('/advances/:id', authenticate, requireAdmin, advCtrl.updateAdvance);

// 9. Salary History
router.get('/salary-history', authenticate, salCtrl.getSalaryHistory);
router.post('/salary-history/revise', authenticate, requireAdmin, salCtrl.reviseSalaryRate);

// 10. Payroll & Salary Slips
router.get('/payroll/preview', authenticate, requireAdmin, payCtrl.getPayrollPreview);
router.post('/payroll/process', authenticate, requireAdmin, payCtrl.processPayroll);
router.post('/payroll/process-all', authenticate, requireAdmin, payCtrl.processAllPayroll);
router.get('/payroll', authenticate, payCtrl.getAllPayrolls);
router.get('/salary-slips/:payrollId/download', payCtrl.downloadSalarySlip);

// 10b. Bonus Calculation & Statements (Excluding OT)
router.get('/bonus', authenticate, requireAdmin, bonusCtrl.calculateBonus);
router.get('/bonus/calculate', authenticate, requireAdmin, bonusCtrl.calculateBonus);
router.get('/bonus/export', authenticate, requireAdmin, bonusCtrl.exportBonusCsv);

// 11. Reports & Dashboard
router.get('/reports/dashboard', authenticate, repCtrl.getDashboardStats);
router.get('/reports/attendance', authenticate, repCtrl.getAttendanceReport);

// 12. Audit Logs
router.get('/audit', authenticate, requireAdmin, audCtrl.getAuditLogs);

export default router;
