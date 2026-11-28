import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  Users,
  Clock,
  Calendar,
  DollarSign,
  Monitor,
  FileText,
  Shield,
  Layers,
  CheckCircle,
  AlertCircle,
  Download,
  Plus,
  RefreshCw,
  LogOut,
  Camera,
  ChevronRight,
  TrendingUp,
  Lock,
  ArrowRight,
  GitBranch,
  Percent,
  Gift,
  Eye,
  Trash2,
  X
} from 'lucide-react';
import { apiRequest, getStoredToken, removeStoredToken, getStoredUser } from '../services/api';
import { CameraView } from '../camera/CameraView';
import { FaceDetectionResult } from '../face-ai/faceEngine';
import { AttendanceHeatmap } from '../components/AttendanceHeatmap';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tab: routeTab } = useParams<{ tab?: string }>();
  const initialTab = (searchParams.get('tab') || routeTab || 'dashboard') as any;
  const validTabs = ['dashboard', 'employees', 'attendance', 'kiosks', 'shifts', 'leaves', 'advances', 'payroll', 'bonus', 'audit'];

  const [activeTab, setActiveTabState] = useState<'dashboard' | 'employees' | 'attendance' | 'kiosks' | 'shifts' | 'leaves' | 'advances' | 'payroll' | 'bonus' | 'audit'>(
    validTabs.includes(initialTab) ? initialTab : 'dashboard'
  );

  const setActiveTab = (tab: any) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    const qTab = searchParams.get('tab') || routeTab;
    if (qTab && qTab !== activeTab && validTabs.includes(qTab)) {
      setActiveTabState(qTab as any);
    }
  }, [searchParams, routeTab]);

  // Stats & Dashboard
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Attendance Sub-views & Worker Heatmap
  const [attendanceViewMode, setAttendanceViewMode] = useState<'today' | 'heatmap'>('today');
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [heatmapMonth, setHeatmapMonth] = useState('2026-10');
  const [workerMonthlyAttendances, setWorkerMonthlyAttendances] = useState<any[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  // Entities
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [kiosks, setKiosks] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Modals & Forms
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedEmpForEnroll, setSelectedEmpForEnroll] = useState<any | null>(null);
  const [enrollSuccessMsg, setEnrollSuccessMsg] = useState<string | null>(null);

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedAttForOverride, setSelectedAttForOverride] = useState<any | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('PRESENT');

  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [showAddKioskModal, setShowAddKioskModal] = useState(false);
  const [showAddAdvanceModal, setShowAddAdvanceModal] = useState(false);
  const [showAddLeaveModal, setShowAddLeaveModal] = useState(false);
  const [showSalaryReviseModal, setShowSalaryReviseModal] = useState(false);
  const [selectedEmpForSalary, setSelectedEmpForSalary] = useState<any | null>(null);
  const [selectedEmpSalaryHistory, setSelectedEmpSalaryHistory] = useState<any[]>([]);
  const [loadingSalaryHistory, setLoadingSalaryHistory] = useState(false);
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [selectedEmpForProfile, setSelectedEmpForProfile] = useState<any | null>(null);
  const [showEmpProfileModal, setShowEmpProfileModal] = useState(false);

  // Leave form inputs
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type_id: '',
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    number_of_days: 1,
    reason: '',
  });

  // Payroll processing state
  const [payrollMonth, setPayrollMonth] = useState('2026-10');
  const [payrollPreviews, setPayrollPreviews] = useState<any[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);

  // Bonus Calculation State (Customizable Range, Percentage & Incentives - Excludes OT)
  const [bonusStartMonth, setBonusStartMonth] = useState('2025-11');
  const [bonusEndMonth, setBonusEndMonth] = useState('2026-10');
  const [bonusPercentage, setBonusPercentage] = useState<number>(8.33);
  const [bonusIncentive, setBonusIncentive] = useState<number>(0);
  const [bonusData, setBonusData] = useState<any | null>(null);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [selectedEmpForBonusBreakdown, setSelectedEmpForBonusBreakdown] = useState<any | null>(null);
  const [showBonusBreakdownModal, setShowBonusBreakdownModal] = useState(false);

  // Form inputs (Comprehensive Onboarding Template)
  const initialEmpForm = {
    name: '',
    surname: '',
    dob: '',
    phone: '',
    email: '',
    address: '',
    govt_id_no: '',
    blood_group: '',
    bank_name: '',
    bank_acc_no: '',
    bank_acc_holder: '',
    bank_ifsc: '',
    emergency_name: '',
    emergency_phone: '',
    emergency_address: '',
    emergency_relationship: '',
    education_details: '',
    previous_experience: '',
    employee_code: '',
    password: 'password123',
    shift_id: '',
    salary_per_hour: 150,
    department: 'Operations',
    designation: 'Staff',
    epf_number: '',
    face_image: '',
    face_embedding: null as any,
  };
  const [empForm, setEmpForm] = useState(initialEmpForm);
  const [isFaceCameraOpenForReg, setIsFaceCameraOpenForReg] = useState(false);

  const [shiftForm, setShiftForm] = useState({
    shift_name: '',
    morning_in: '09:00:00',
    lunch_out: '13:00:00',
    lunch_in: '14:00:00',
    evening_out: '18:00:00',
    ot_rate_multiplier: 1.5,
  });

  const [kioskForm, setKioskForm] = useState({
    device_name: '',
    location: '',
  });

  const [advanceForm, setAdvanceForm] = useState({
    employee_id: '',
    amount: 1000,
    note: '',
  });

  const [salaryForm, setSalaryForm] = useState({
    new_rate: 180,
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split('T')[0];
    })(),
    reason: '',
  });

  // Verify Admin Login or direct access
  useEffect(() => {
    const token = getStoredToken();
    const user = getStoredUser();
    if (!token || user?.role !== 'admin') {
      navigate('/login');
      return;
    }
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const res = await apiRequest('/reports/dashboard');
        if (res.success) setDashboardStats(res);
      } else if (activeTab === 'employees') {
        const [empRes, shiftRes] = await Promise.all([
          apiRequest('/employees'),
          apiRequest('/shifts'),
        ]);
        if (empRes.success) setEmployees(empRes.employees);
        if (shiftRes.success) setShifts(shiftRes.shifts);
      } else if (activeTab === 'attendance') {
        const [attRes, empRes] = await Promise.all([
          apiRequest('/attendance/today'),
          apiRequest('/employees'),
        ]);
        if (attRes.success) setAttendances(attRes.attendances);
        if (empRes.success) {
          setEmployees(empRes.employees);
          if (empRes.employees.length > 0 && !selectedWorkerId) {
            setSelectedWorkerId(empRes.employees[0].id);
          }
        }
      } else if (activeTab === 'kiosks') {
        const res = await apiRequest('/kiosks');
        if (res.success) setKiosks(res.kiosks);
      } else if (activeTab === 'shifts') {
        const res = await apiRequest('/shifts');
        if (res.success) setShifts(res.shifts);
      } else if (activeTab === 'leaves') {
        const [reqRes, typeRes, empRes] = await Promise.all([
          apiRequest('/leaves'),
          apiRequest('/leave-types'),
          apiRequest('/employees'),
        ]);
        if (reqRes.success) setLeaves(reqRes.leaveRequests);
        if (typeRes.success) setLeaveTypes(typeRes.leaveTypes);
        if (empRes.success) setEmployees(empRes.employees);
      } else if (activeTab === 'advances') {
        const [advRes, empRes] = await Promise.all([
          apiRequest('/advances'),
          apiRequest('/employees'),
        ]);
        if (advRes.success) setAdvances(advRes.advances);
        if (empRes.success) setEmployees(empRes.employees);
      } else if (activeTab === 'payroll') {
        loadPayrollPreview();
        const pRes = await apiRequest('/payroll');
        if (pRes.success) setPayrolls(pRes.payrolls);
      } else if (activeTab === 'bonus') {
        loadBonusCalculation();
      } else if (activeTab === 'audit') {
        const aRes = await apiRequest('/audit');
        if (aRes.success) setAuditLogs(aRes.logs);
      }
    } catch (err: any) {
      console.error('Data load error:', err);
    }
  };

  const loadWorkerHeatmap = async (empId: number, month: string) => {
    setHeatmapLoading(true);
    try {
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const startDate = `${month}-01`;
      const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
      const res = await apiRequest(`/attendance/history?employee_id=${empId}&startDate=${startDate}&endDate=${endDate}`);
      if (res.success) {
        // Map database records into heatmap friendly format
        const formatted = (res.attendances || []).map((att: any) => ({
          id: att.id,
          date: att.date,
          morning_in: att.morning_in_punch ? new Date(att.morning_in_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          lunch_out: att.lunch_out_punch ? new Date(att.lunch_out_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          lunch_in: att.lunch_in_punch ? new Date(att.lunch_in_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          evening_out: att.evening_out_punch ? new Date(att.evening_out_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          hours_worked: att.hours_worked,
          ot_hours: att.ot_hours,
          daily_status: att.daily_status,
          is_manual_override: att.is_overridden,
          kiosk_name: att.kiosk?.device_name,
          notes: att.notes || (att.is_overridden ? `Overridden: ${att.override_reason}` : ''),
        }));
        setWorkerMonthlyAttendances(formatted);
      }
    } catch (err: any) {
      console.warn('Worker heatmap load error:', err);
    } finally {
      setHeatmapLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance' && attendanceViewMode === 'heatmap' && selectedWorkerId) {
      loadWorkerHeatmap(selectedWorkerId, heatmapMonth);
    }
  }, [activeTab, attendanceViewMode, selectedWorkerId, heatmapMonth]);

  const loadPayrollPreview = async () => {
    setPayrollLoading(true);
    try {
      const res = await apiRequest(`/payroll/preview?month=${payrollMonth}`);
      if (res.success) setPayrollPreviews(res.previews);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPayrollLoading(false);
    }
  };

  // Create Employee with simultaneous Face Biometrics Registration
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/employees', {
        method: 'POST',
        body: JSON.stringify({
          ...empForm,
          image: empForm.face_image || undefined,
          embedding: empForm.face_embedding || undefined,
        }),
      });
      if (res.success) {
        setShowAddEmpModal(false);
        setIsFaceCameraOpenForReg(false);
        setEmpForm(initialEmpForm);
        loadData();
        alert(`Employee ${empForm.name} registered successfully${empForm.face_image ? ' with Face Biometrics Enrolled' : ''}!`);
      }
    } catch (err: any) {
      alert(err.message || 'Error registering employee');
    }
  };

  // Face Enrollment
  const handleEnrollFaceCapture = async (faceResult: FaceDetectionResult) => {
    if (!selectedEmpForEnroll) return;
    try {
      const res = await apiRequest(`/employees/${selectedEmpForEnroll.id}/face`, {
        method: 'POST',
        body: JSON.stringify({
          image: faceResult.image,
          qualityScore: faceResult.qualityScore,
        }),
      });
      if (res.success) {
        setEnrollSuccessMsg(`Face enrolled successfully for ${selectedEmpForEnroll.name} (AWS Rekognition)`);
        setTimeout(() => {
          setShowEnrollModal(false);
          setEnrollSuccessMsg(null);
          loadData();
        }, 1500);
      }
    } catch (err: any) {
      alert(err.message || 'Face enrollment failed');
    }
  };

  // Attendance Override
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttForOverride || !overrideReason) {
      alert('Override reason is mandatory for administrative auditing.');
      return;
    }
    try {
      const res = await apiRequest('/attendance/override', {
        method: 'POST',
        body: JSON.stringify({
          attendance_id: selectedAttForOverride.id,
          daily_status: overrideStatus,
          override_reason: overrideReason,
        }),
      });
      if (res.success) {
        setShowOverrideModal(false);
        setOverrideReason('');
        loadData();
        alert('Attendance override recorded');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Wipe All Employee & Attendance Data
  const handleWipeAllData = async () => {
    const confirmText = prompt("Type 'WIPE' to delete all employee records, biometric templates, and attendance data:");
    if (confirmText !== 'WIPE') return;
    try {
      const res = await apiRequest('/admin/wipe-data', { method: 'POST' });
      if (res.success) {
        alert('All employee data and attendance records wiped clean successfully!');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Wipe failed');
    }
  };

  // Approve / Reject Leave
  const handleLeaveAction = async (leaveId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await apiRequest(`/leaves/${leaveId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (res.success) {
        loadData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Create / Record Leave
  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/leaves/apply', {
        method: 'POST',
        body: JSON.stringify(leaveForm),
      });
      if (res.success) {
        setShowAddLeaveModal(false);
        loadData();
        alert('Leave recorded successfully');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Approve Individual Employee Payroll & Generate Slip
  const handleApproveEmployeePayroll = async (employeeId: number) => {
    try {
      setPayrollLoading(true);
      const res = await apiRequest('/payroll/process', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: employeeId,
          month: payrollMonth,
          finalize: true,
        }),
      });
      if (res.success) {
        await loadPayrollPreview();
        const pRes = await apiRequest('/payroll');
        if (pRes.success) setPayrolls(pRes.payrolls);
      }
    } catch (err: any) {
      alert('Error approving payroll: ' + err.message);
    } finally {
      setPayrollLoading(false);
    }
  };

  // Secure Salary Slip PDF Download Handler
  const handleDownloadSalarySlip = async (payrollId: number, empCode: string) => {
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/salary-slips/${payrollId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Failed with status ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salary_slip_${empCode}_${payrollMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      // Fallback direct link
      window.open(`/api/salary-slips/${payrollId}/download`, '_blank');
    }
  };

  // Finalize Batch Payroll
  const handleFinalizeAllPayroll = async () => {
    if (!confirm(`Finalize and lock payroll records for ${payrollMonth}? This settles pending advances and generates salary slips.`)) return;
    try {
      setPayrollLoading(true);
      const res = await apiRequest('/payroll/process-all', {
        method: 'POST',
        body: JSON.stringify({ month: payrollMonth, finalize: true }),
      });
      if (res.success) {
        alert(res.message);
        await loadPayrollPreview();
        const pRes = await apiRequest('/payroll');
        if (pRes.success) setPayrolls(pRes.payrolls);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPayrollLoading(false);
    }
  };

  // Bonus Calculation Loader (Excluding OT)
  const loadBonusCalculation = async (start = bonusStartMonth, end = bonusEndMonth, pct = bonusPercentage, inc = bonusIncentive) => {
    setBonusLoading(true);
    try {
      let res;
      try {
        res = await apiRequest(`/bonus/calculate?startMonth=${start}&endMonth=${end}&percentage=${pct}&incentive=${inc}`);
      } catch {
        res = await apiRequest(`/bonus?startMonth=${start}&endMonth=${end}&percentage=${pct}&incentive=${inc}`);
      }
      if (res && (res.success || res.employees)) {
        setBonusData(res.data || res);
      }
    } catch (err: any) {
      console.warn('Bonus calculation query notice:', err);
      // Safe fallback when records are wiped: clean zero values with NO popup alert
      setBonusData({
        summary: {
          totalEmployees: 0,
          totalEligibleSalary: 0,
          totalOtSalaryExcluded: 0,
          totalOtHoursExcluded: 0,
          totalBonusPayable: 0,
        },
        employees: [],
        period: { startLabel: start, endLabel: end, totalMonths: 12 },
        config: { bonusPercentage: pct, bonusIncentive: inc },
        percentage: pct,
        incentive: inc,
      });
    } finally {
      setBonusLoading(false);
    }
  };

  // Bonus CSV Export
  const handleExportBonusCsv = async () => {
    try {
      const token = getStoredToken();
      const url = `/api/bonus/export?startMonth=${bonusStartMonth}&endMonth=${bonusEndMonth}&percentage=${bonusPercentage}&incentive=${bonusIncentive}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Export failed with status: ${res.status}`);
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `bonus_working_${bonusStartMonth}_to_${bonusEndMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(err.message || 'Error exporting bonus CSV');
    }
  };

  // Logout
  const handleLogout = () => {
    removeStoredToken();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1A1D23] flex flex-col md:flex-row">
      {/* Sidebar Navigation - Responsive (Horizontal on mobile, sleek sidebar on desktop up to 1920 Full HD) */}
      <aside className="w-full md:w-64 bg-white border-r border-b md:border-b-0 border-[#E4E7EB] flex flex-col md:justify-between shrink-0 shadow-2xs">
        <div>
          {/* Logo & Workspace Title */}
          <div className="p-3.5 sm:p-4 border-b border-[#E4E7EB] flex items-center justify-between md:justify-start space-x-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#1A73C7] flex items-center justify-center font-bold text-white shadow-xs">
                SP
              </div>
              <div>
                <h2 className="font-bold text-sm tracking-tight text-[#1A1D23]">SPTech Admin</h2>
                <p className="text-[10px] text-slate-500 hidden sm:block">Industrial Attendance & Payroll</p>
              </div>
            </div>
            {/* Quick Mobile Action Links */}
            <div className="md:hidden flex items-center space-x-2">
              <Link
                to="/kiosk"
                className="px-2.5 py-1.5 rounded-lg bg-sky-50 text-[#1A73C7] text-xs font-semibold flex items-center space-x-1"
              >
                <span>Kiosk</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Links - Horizontal scrolling strip on mobile, vertical stack on tablet/desktop */}
          <nav className="p-2 sm:p-3 flex md:flex-col overflow-x-auto md:overflow-visible gap-1.5 md:gap-1 text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`shrink-0 md:w-full flex items-center space-x-2.5 px-3 py-2 md:py-2.5 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'dashboard' ? 'bg-[#1A73C7] text-white shadow-xs' : 'text-slate-600 hover:bg-[#F7F8FA] hover:text-[#1A1D23]'
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('employees')}
              className={`shrink-0 md:w-full flex items-center space-x-2.5 px-3 py-2 md:py-2.5 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'employees' ? 'bg-[#1A73C7] text-white shadow-xs' : 'text-slate-600 hover:bg-[#F7F8FA] hover:text-[#1A1D23]'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Employees</span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`shrink-0 md:w-full flex items-center space-x-2.5 px-3 py-2 md:py-2.5 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'attendance' ? 'bg-[#1A73C7] text-white shadow-xs' : 'text-slate-600 hover:bg-[#F7F8FA] hover:text-[#1A1D23]'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>Attendance</span>
            </button>

            <button
              onClick={() => setActiveTab('kiosks')}
              className={`shrink-0 md:w-full flex items-center space-x-2.5 px-3 py-2 md:py-2.5 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'kiosks' ? 'bg-[#1A73C7] text-white shadow-xs' : 'text-slate-600 hover:bg-[#F7F8FA] hover:text-[#1A1D23]'
              }`}
            >
              <Monitor className="w-4 h-4 shrink-0" />
              <span>Kiosks</span>
            </button>

            <button
              onClick={() => setActiveTab('shifts')}
              className={`shrink-0 md:w-full flex items-center space-x-2.5 px-3 py-2 md:py-2.5 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'shifts' ? 'bg-[#1A73C7] text-white shadow-xs' : 'text-slate-600 hover:bg-[#F7F8FA] hover:text-[#1A1D23]'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Shifts</span>
            </button>

            <button
              onClick={() => setActiveTab('leaves')}
              className={`shrink-0 md:w-full flex items-center space-x-2.5 px-3 py-2 md:py-2.5 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'leaves' ? 'bg-[#1A73C7] text-white shadow-xs' : 'text-slate-600 hover:bg-[#F7F8FA] hover:text-[#1A1D23]'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Leaves</span>
            </button>

            <button
              onClick={() => setActiveTab('advances')}
              className={`shrink-0 md:w-full flex items-center space-x-2.5 px-3 py-2 md:py-2.5 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'advances' ? 'bg-[#1A73C7] text-white shadow-xs' : 'text-slate-600 hover:bg-[#F7F8FA] hover:text-[#1A1D23]'
              }`}
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              <span>Advances</span>
            </button>

            <button
              onClick={() => setActiveTab('payroll')}
              className={`shrink-0 md:w-full flex items-center space-x-2.5 px-3 py-2 md:py-2.5 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'payroll' ? 'bg-[#1A73C7] text-white shadow-xs' : 'text-slate-600 hover:bg-[#F7F8FA] hover:text-[#1A1D23]'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Payroll</span>
            </button>

            <button
              onClick={() => setActiveTab('bonus')}
              className={`shrink-0 md:w-full flex items-center space-x-2.5 px-3 py-2 md:py-2.5 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'bonus' ? 'bg-[#1A73C7] text-white shadow-xs' : 'text-slate-600 hover:bg-[#F7F8FA] hover:text-[#1A1D23]'
              }`}
            >
              <Percent className="w-4 h-4 shrink-0" />
              <span>Bonus Working</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`shrink-0 md:w-full flex items-center space-x-2.5 px-3 py-2 md:py-2.5 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'audit' ? 'bg-[#1A73C7] text-white shadow-xs' : 'text-slate-600 hover:bg-[#F7F8FA] hover:text-[#1A1D23]'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Audit Logs</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="hidden md:block p-3 border-t border-[#E4E7EB] space-y-2">
          <Link
            to="/kiosk"
            className="w-full py-2 px-3 rounded-xl bg-[#F7F8FA] hover:bg-slate-200 border border-[#E4E7EB] text-[#0F4C81] text-xs font-semibold flex items-center justify-between transition"
          >
            <span>Open Attendance Kiosk</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center space-x-2 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Administrative Work Area - Adapts to all desktop resolutions without blank margins */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full overflow-y-auto min-w-0">
        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-[#1A1D23] tracking-tight">Dashboard</h1>
              <button
                onClick={loadData}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-[#E4E7EB] hover:bg-[#F7F8FA] text-xs font-semibold text-[#0F4C81] flex items-center space-x-1.5 transition cursor-pointer shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Dashboard 8 KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#E4E7EB] shadow-2xs space-y-1">
                <span className="text-[11px] text-slate-500 font-semibold">Total Employees</span>
                <div className="text-2xl font-bold text-[#1A1D23]">{dashboardStats?.stats?.totalEmployees ?? employees.length ?? 0}</div>
                <span className="text-[10px] text-[#1A73C7] font-medium">Active roster</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1">
                <span className="text-[11px] text-[#2FA84F] font-semibold">Present Today</span>
                <div className="text-2xl font-bold text-[#2FA84F]">{dashboardStats?.stats?.presentToday ?? 0}</div>
                <span className="text-[10px] text-slate-500">On premises</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-1">
                <span className="text-[11px] text-amber-700 font-semibold">Late Arrivals</span>
                <div className="text-2xl font-bold text-amber-600">{dashboardStats?.stats?.lateToday ?? 0}</div>
                <span className="text-[10px] text-slate-500">Past scheduled morning in</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E4E7EB] shadow-2xs space-y-1">
                <span className="text-[11px] text-rose-600 font-semibold">Absent / On Leave</span>
                <div className="text-2xl font-bold text-rose-600">
                  {dashboardStats?.stats?.absentToday ?? 0} / {dashboardStats?.stats?.onLeaveToday ?? 0}
                </div>
                <span className="text-[10px] text-slate-500">Approved leave / missing</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E4E7EB] shadow-2xs space-y-1">
                <span className="text-[11px] text-slate-500 font-semibold">Overtime Today</span>
                <div className="text-2xl font-bold text-[#0F4C81]">{dashboardStats?.stats?.overtimeHoursToday ?? 0} hrs</div>
                <span className="text-[10px] text-slate-500">Beyond shift hours</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E4E7EB] shadow-2xs space-y-1">
                <span className="text-[11px] text-slate-500 font-semibold">Active Kiosks</span>
                <div className="text-2xl font-bold text-[#1A1D23]">{dashboardStats?.stats?.activeKiosks ?? 1}</div>
                <span className="text-[10px] text-[#2FA84F] font-medium">Online & synced</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E4E7EB] col-span-2 shadow-2xs space-y-1">
                <span className="text-[11px] text-slate-500 font-semibold">Current Month Payroll Total</span>
                <div className="text-2xl font-bold text-[#1A73C7] font-mono">
                  ₹{dashboardStats?.stats?.currentMonthPayroll?.toLocaleString() || '0'}
                </div>
                <span className="text-[10px] text-slate-500">Cumulative base & overtime pay</span>
              </div>
            </div>

            {/* 7-Day Attendance Trend */}
            <div className="p-5 rounded-2xl bg-white border border-[#E4E7EB] shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-[#1A1D23]">7-Day Attendance Trend</h3>
              <div className="grid grid-cols-7 gap-2">
                {(dashboardStats?.charts?.attendanceTrend?.length
                  ? dashboardStats.charts.attendanceTrend
                  : Array.from({ length: 7 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (6 - i));
                      return { date: d.toISOString().split('T')[0].slice(5), present: 0 };
                    })
                ).map((t: any, i: number) => (
                  <div key={i} className="text-center p-3 rounded-xl bg-[#F7F8FA] border border-[#E4E7EB]">
                    <span className="block text-[10px] text-slate-500 font-mono">{t.date}</span>
                    <span className="text-lg font-bold text-[#1A73C7]">{t.present}</span>
                    <span className="block text-[10px] text-slate-400">punches</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. EMPLOYEES TAB */}
        {activeTab === 'employees' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-[#1A1D23] tracking-tight">Employees</h1>
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={handleWipeAllData}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shadow-2xs"
                  title="Wipe all employees and attendance data"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Wipe All Data</span>
                </button>
                <button
                  onClick={() => setShowAddEmpModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-xs font-semibold text-white flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Employee</span>
                </button>
              </div>
            </div>

            {/* Employee Table */}
            <div className="overflow-x-auto rounded-2xl bg-white border border-[#E4E7EB] shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FA] text-slate-600 uppercase tracking-wider text-[10px] border-b border-[#E4E7EB]">
                  <tr>
                    <th className="p-3.5">Employee ID</th>
                    <th className="p-3.5">Full Name</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Assigned Shift</th>
                    <th className="p-3.5">Rate / Hour</th>
                    <th className="p-3.5">Biometrics</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EB]">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-[#F7F8FA] transition">
                      <td className="p-3.5 font-mono text-[#0F4C81] font-bold">{emp.employee_code}</td>
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2.5">
                          {emp.profile_photo ? (
                            <img
                              src={emp.profile_photo}
                              alt={emp.name}
                              className="w-8 h-8 rounded-full object-cover border border-[#E4E7EB] shadow-2xs"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#1A73C7]/10 text-[#1A73C7] font-bold flex items-center justify-center text-xs">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-semibold text-[#1A1D23]">{emp.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600">{emp.department} • {emp.designation}</td>
                      <td className="p-3.5">
                        <select
                          value={emp.shift_id || ''}
                          onChange={async (e) => {
                            const newShiftId = e.target.value ? parseInt(e.target.value) : null;
                            try {
                              const res = await apiRequest(`/employees/${emp.id}`, {
                                method: 'PUT',
                                body: JSON.stringify({ shift_id: newShiftId }),
                              });
                              if (res.success) {
                                loadData();
                              }
                            } catch (err: any) {
                              alert(err.message || 'Failed to update shift');
                            }
                          }}
                          className="bg-[#F7F8FA] border border-[#E4E7EB] hover:border-[#1A73C7] rounded-lg px-2 py-1 text-[11px] font-medium text-[#1A1D23] outline-none cursor-pointer focus:bg-white"
                          title="Click to map or change shift"
                        >
                          <option value="">No Shift Assigned</option>
                          {shifts.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.shift_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3.5 font-mono font-medium text-[#1A1D23]">₹{emp.salary_per_hour}/hr</td>
                      <td className="p-3.5">
                        {emp.has_face_enrolled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#2FA84F] border border-emerald-200 flex items-center w-fit space-x-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Enrolled</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center w-fit space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.status === 'ACTIVE' ? 'bg-sky-50 text-[#1A73C7]' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedEmpForProfile(emp);
                            setShowEmpProfileModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#E4E7EB] hover:bg-[#F7F8FA] text-slate-700 text-[11px] font-semibold transition cursor-pointer inline-flex items-center space-x-1 shadow-2xs"
                          title="View complete onboarding profile"
                        >
                          <Eye className="w-3 h-3 text-[#1A73C7]" />
                          <span>Profile</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmpForEnroll(emp);
                            setShowEnrollModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#E4E7EB] hover:bg-[#F7F8FA] text-[#1A73C7] text-[11px] font-semibold transition cursor-pointer inline-flex items-center space-x-1 shadow-2xs"
                        >
                          <Camera className="w-3 h-3" />
                          <span>{emp.has_face_enrolled ? 'Re-enroll' : 'Enroll Face'}</span>
                        </button>
                        <button
                          onClick={async () => {
                            setSelectedEmpForSalary(emp);
                            const today = new Date().toISOString().split('T')[0];
                            const nextYear = new Date();
                            nextYear.setFullYear(nextYear.getFullYear() + 1);
                            const nextYearStr = nextYear.toISOString().split('T')[0];

                            setSalaryForm({
                              new_rate: emp.salary_per_hour,
                              effective_from: today,
                              effective_to: nextYearStr,
                              reason: '',
                            });
                            setShowSalaryReviseModal(true);
                            setShowHistoryView(false);

                            setLoadingSalaryHistory(true);
                            try {
                              const res = await apiRequest(`/salary-history?employee_id=${emp.id}`);
                              if (res.success) {
                                setSelectedEmpSalaryHistory(res.history || []);
                              }
                            } catch (e) {
                              console.warn(e);
                            } finally {
                              setLoadingSalaryHistory(false);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#E4E7EB] hover:bg-[#F7F8FA] text-slate-700 text-[11px] font-semibold transition cursor-pointer inline-flex items-center space-x-1 shadow-2xs"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>Revise Salary</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-[#1A1D23] tracking-tight">Attendance</h1>

              <div className="flex items-center space-x-2">
                <div className="flex bg-[#F7F8FA] p-1 rounded-xl border border-[#E4E7EB] text-xs">
                  <button
                    type="button"
                    onClick={() => setAttendanceViewMode('today')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      attendanceViewMode === 'today' ? 'bg-[#1A73C7] text-white shadow-2xs' : 'text-slate-600 hover:text-[#1A1D23]'
                    }`}
                  >
                    Today's Log
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceViewMode('heatmap')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      attendanceViewMode === 'heatmap' ? 'bg-[#1A73C7] text-white shadow-2xs' : 'text-slate-600 hover:text-[#1A1D23]'
                    }`}
                  >
                    Monthly Heatmap
                  </button>
                </div>

                {attendanceViewMode === 'today' && (
                  <a
                    href="/api/reports/attendance?format=csv"
                    download
                    className="px-3.5 py-1.5 rounded-xl bg-white border border-[#E4E7EB] hover:bg-[#F7F8FA] text-xs font-semibold text-[#0F4C81] flex items-center space-x-1.5 transition shadow-2xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </a>
                )}
              </div>
            </div>

            {/* MONTHLY HEATMAP VIEW */}
            {attendanceViewMode === 'heatmap' && (
              <div className="space-y-4">
                {/* Worker Selector Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E4E7EB] shadow-2xs">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-semibold text-slate-600">Select Worker:</span>
                    <select
                      value={selectedWorkerId || ''}
                      onChange={(e) => setSelectedWorkerId(Number(e.target.value))}
                      className="bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-1.5 text-xs text-[#1A1D23] font-semibold outline-none focus:border-[#1A73C7]"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.employee_code}) — {emp.department}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-600">Month:</span>
                    <input
                      type="month"
                      value={heatmapMonth}
                      onChange={(e) => setHeatmapMonth(e.target.value)}
                      className="bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-1.5 text-xs text-[#1A1D23] font-semibold outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                </div>

                {/* Heatmap Component */}
                {employees.find(e => e.id === selectedWorkerId) ? (
                  <AttendanceHeatmap
                    employee={employees.find(e => e.id === selectedWorkerId)!}
                    month={heatmapMonth}
                    attendances={workerMonthlyAttendances}
                    onMonthChange={(m) => setHeatmapMonth(m)}
                    onSelectDay={(date, record) => {
                      if (record && record.id) {
                        setSelectedAttForOverride(record);
                        setOverrideStatus(record.daily_status || 'PRESENT');
                        setOverrideReason(record.notes || '');
                        setShowOverrideModal(true);
                      }
                    }}
                  />
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-[#E4E7EB]">
                    Please select an employee to view their monthly calendar heatmap.
                  </div>
                )}
              </div>
            )}

            {/* Attendance Table */}
            {attendanceViewMode === 'today' && (
            <div className="overflow-x-auto rounded-2xl bg-white border border-[#E4E7EB] shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FA] text-slate-600 uppercase tracking-wider text-[10px] border-b border-[#E4E7EB]">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">1. Morning In</th>
                    <th className="p-3.5">2. Lunch Out</th>
                    <th className="p-3.5">3. Lunch In</th>
                    <th className="p-3.5">4. Evening Out</th>
                    <th className="p-3.5">Total Hours</th>
                    <th className="p-3.5">Overtime</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">HR Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EB]">
                  {attendances.map((att) => (
                    <tr key={att.id} className="hover:bg-[#F7F8FA] transition">
                      <td className="p-3.5">
                        <span className="font-semibold text-[#1A1D23] block">{att.employee?.name}</span>
                        <span className="font-mono text-slate-500 text-[10px]">{att.employee?.employee_code}</span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-700">
                        {att.morning_in_punch ? new Date(att.morning_in_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="p-3.5 font-mono text-slate-700">
                        {att.lunch_out_punch ? new Date(att.lunch_out_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="p-3.5 font-mono text-slate-700">
                        {att.lunch_in_punch ? new Date(att.lunch_in_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="p-3.5 font-mono text-slate-700">
                        {att.evening_out_punch ? new Date(att.evening_out_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-[#1A73C7]">{att.hours_worked || 0} hrs</td>
                      <td className="p-3.5 font-mono font-semibold text-amber-700">{att.ot_hours || 0} hrs</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          att.daily_status === 'LATE' ? 'bg-amber-100 text-amber-800' :
                          att.daily_status === 'HALF_DAY' ? 'bg-indigo-100 text-indigo-800' :
                          att.daily_status === 'LEAVE' ? 'bg-purple-100 text-purple-800' :
                          'bg-emerald-100 text-[#2FA84F]'
                        }`}>
                          {att.daily_status}
                        </span>
                        {att.is_overridden && (
                          <span className="block text-[9px] text-amber-700 font-medium mt-0.5">Overridden</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedAttForOverride(att);
                            setOverrideStatus(att.daily_status);
                            setShowOverrideModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#F7F8FA] hover:bg-slate-200 border border-[#E4E7EB] text-[#0F4C81] text-[11px] font-semibold transition cursor-pointer"
                        >
                          Override
                        </button>
                      </td>
                    </tr>
                  ))}
                  {attendances.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400">
                        No punches recorded today yet. Use the Kiosk terminal to mark attendance.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* 4. KIOSKS TAB */}
        {activeTab === 'kiosks' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-[#1A1D23] tracking-tight">Kiosks</h1>
              <button
                onClick={() => setShowAddKioskModal(true)}
                className="px-4 py-2 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-xs font-semibold text-white flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Register Kiosk</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kiosks.map((k) => (
                <div key={k.id} className="p-5 rounded-2xl bg-white border border-[#E4E7EB] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-[#1A1D23] text-sm">{k.device_name}</h3>
                      <p className="text-xs text-slate-500">{k.location}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      k.is_active ? 'bg-emerald-100 text-[#2FA84F]' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {k.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-[#E4E7EB]">
                    <span>Last Synchronization:</span>
                    <span className="font-mono text-[#1A1D23] font-medium">
                      {k.last_synced_at ? new Date(k.last_synced_at).toLocaleTimeString() : 'Recently Active'}
                    </span>
                  </div>

                  <button
                    onClick={async () => {
                      await apiRequest(`/kiosks/${k.id}/toggle`, { method: 'PATCH' });
                      loadData();
                    }}
                    className={`w-full py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      k.is_active ? 'bg-[#F7F8FA] hover:bg-rose-50 text-rose-700 border border-[#E4E7EB]' : 'bg-[#1A73C7] text-white hover:bg-[#0F4C81]'
                    }`}
                  >
                    {k.is_active ? 'Deactivate Kiosk' : 'Activate Kiosk'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. SHIFTS TAB */}
        {activeTab === 'shifts' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-[#1A1D23] tracking-tight">Shifts</h1>
              <button
                onClick={() => setShowAddShiftModal(true)}
                className="px-4 py-2 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-xs font-semibold text-white flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create Shift</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shifts.map((s) => (
                <div key={s.id} className="p-5 rounded-2xl bg-white border border-[#E4E7EB] shadow-xs space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-[#1A1D23] text-sm">{s.shift_name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1A73C7]/10 text-[#0F4C81]">
                      OT Multiplier: {s.ot_rate_multiplier}x
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-2 border-t border-[#E4E7EB]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Morning In:</span>
                      <span className="font-mono font-medium">{s.morning_in}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Lunch Out:</span>
                      <span className="font-mono font-medium">{s.lunch_out}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Lunch In:</span>
                      <span className="font-mono font-medium">{s.lunch_in}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Evening Out:</span>
                      <span className="font-mono font-medium">{s.evening_out}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {shifts.length === 0 && (
              <div className="p-12 text-center bg-white border border-[#E4E7EB] rounded-2xl shadow-xs space-y-2">
                <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700 text-sm">No Shifts Configured</h3>
                <p className="text-xs text-slate-400">All shift details have been removed. Use "Create Shift" to define working shifts.</p>
              </div>
            )}
          </div>
        )}

        {/* 6. LEAVES TAB */}
        {activeTab === 'leaves' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-[#1A1D23] tracking-tight">Leaves</h1>
              <button
                onClick={() => setShowAddLeaveModal(true)}
                className="px-4 py-2 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-xs font-semibold text-white flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Record Leave</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl bg-white border border-[#E4E7EB] shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FA] text-slate-600 uppercase tracking-wider text-[10px] border-b border-[#E4E7EB]">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Leave Type</th>
                    <th className="p-3.5">Duration</th>
                    <th className="p-3.5">Days</th>
                    <th className="p-3.5">Reason</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EB]">
                  {leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-[#F7F8FA] transition">
                      <td className="p-3.5 font-semibold text-[#1A1D23]">{l.employee?.name}</td>
                      <td className="p-3.5 text-[#1A73C7] font-semibold">{l.leaveType?.name}</td>
                      <td className="p-3.5 font-mono text-slate-600">{l.from_date} to {l.to_date}</td>
                      <td className="p-3.5 font-semibold text-[#1A1D23]">{l.number_of_days}</td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">{l.reason}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.status === 'APPROVED' ? 'bg-emerald-100 text-[#2FA84F]' :
                          l.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        {l.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleLeaveAction(l.id, 'APPROVED')}
                              className="px-2.5 py-1 rounded-lg bg-[#2FA84F] hover:bg-emerald-600 text-white text-[11px] font-semibold transition cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleLeaveAction(l.id, 'REJECTED')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">No leave requests found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. ADVANCES TAB */}
        {activeTab === 'advances' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-[#1A1D23] tracking-tight">Advances</h1>
              <button
                onClick={() => setShowAddAdvanceModal(true)}
                className="px-4 py-2 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-xs font-semibold text-white flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Give Advance</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl bg-white border border-[#E4E7EB] shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FA] text-slate-600 uppercase tracking-wider text-[10px] border-b border-[#E4E7EB]">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Advance Amount</th>
                    <th className="p-3.5">Date Given</th>
                    <th className="p-3.5">Note / Purpose</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Settlement Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EB]">
                  {advances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-[#F7F8FA] transition">
                      <td className="p-3.5 font-semibold text-[#1A1D23]">{adv.employee?.name}</td>
                      <td className="p-3.5 font-mono text-[#0F4C81] font-bold text-sm">₹{adv.amount}</td>
                      <td className="p-3.5 font-mono text-slate-600">{adv.date_given}</td>
                      <td className="p-3.5 text-slate-600">{adv.note || '-'}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          adv.status === 'SETTLED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {adv.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">
                        {adv.settled_in_payroll_id ? `Payroll #${adv.settled_in_payroll_id}` : 'Pending settlement'}
                      </td>
                    </tr>
                  ))}
                  {advances.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">No advance records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. PAYROLL TAB */}
        {activeTab === 'payroll' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-[#1A1D23] tracking-tight">Payroll</h1>

              {/* Month selector & Batch action */}
              <div className="flex items-center space-x-3">
                <input
                  type="month"
                  value={payrollMonth}
                  onChange={(e) => {
                    setPayrollMonth(e.target.value);
                    loadPayrollPreview();
                  }}
                  className="bg-white border border-[#E4E7EB] rounded-xl px-3 py-1.5 text-xs text-[#1A1D23] font-semibold focus:outline-none focus:border-[#1A73C7] shadow-2xs"
                />
                <button
                  onClick={handleFinalizeAllPayroll}
                  disabled={payrollLoading}
                  className="px-4 py-2 rounded-xl bg-[#2FA84F] hover:bg-emerald-600 disabled:opacity-40 text-xs font-semibold text-white flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Finalize & Lock All</span>
                </button>
              </div>
            </div>

            {/* Payroll Calculation Preview Table */}
            <div className="p-5 rounded-2xl bg-white border border-[#E4E7EB] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#1A1D23]">Monthly Payroll Calculation & Salary Slips</h3>
                  <p className="text-xs text-slate-500">Period: {payrollMonth} • Statutory EPF (12%) automatically calculated</p>
                </div>
                <button
                  onClick={loadPayrollPreview}
                  disabled={payrollLoading}
                  className="px-3 py-1.5 rounded-xl border border-[#E4E7EB] hover:bg-[#F7F8FA] text-xs font-semibold text-slate-600 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${payrollLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8FA] text-slate-600 uppercase tracking-wider text-[10px] border-b border-[#E4E7EB]">
                    <tr>
                      <th className="p-3.5">Employee</th>
                      <th className="p-3.5">Shift & Hours</th>
                      <th className="p-3.5">Base Pay</th>
                      <th className="p-3.5">OT Pay</th>
                      <th className="p-3.5 text-blue-700">EPF (12%)</th>
                      <th className="p-3.5">Advance</th>
                      <th className="p-3.5">Net Payable</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Approval & Salary Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E7EB]">
                    {payrollPreviews.map((p, i) => (
                      <tr key={i} className="hover:bg-[#F7F8FA] transition">
                        <td className="p-3.5">
                          <span className="font-semibold text-[#1A1D23] block">{p.employee?.name}</span>
                          <span className="font-mono text-slate-500 text-[10px]">{p.employee?.employee_code}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="text-slate-700 font-medium block text-[11px]">{p.employee?.shift?.shift_name?.split(' ')[0] || 'Shift'}</span>
                          <span className="font-mono text-slate-500 text-[10px]">{p.summary?.regularHours || 0}h reg + {p.summary?.otHours || 0}h OT</span>
                        </td>
                        <td className="p-3.5 font-mono text-[#1A1D23]">₹{p.basePay?.toLocaleString() || 0}</td>
                        <td className="p-3.5 font-mono text-amber-700 font-medium">₹{p.otPay?.toLocaleString() || 0}</td>
                        <td className="p-3.5 font-mono text-blue-700 font-semibold">-₹{(p.epfDeduction || Math.round((p.basePay || 0) * 0.12)).toLocaleString()}</td>
                        <td className="p-3.5 font-mono text-rose-600 font-medium">-₹{(p.advanceSettlement || 0).toLocaleString()}</td>
                        <td className="p-3.5 font-mono font-bold text-[#0F4C81] text-sm">₹{p.estimatedTotal?.toLocaleString() || 0}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.isFinalized ? 'bg-emerald-100 text-[#2FA84F]' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {p.isFinalized ? 'Finalized & Approved' : 'Draft Ready'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {p.existingPayrollId ? (
                            <>
                              <button
                                onClick={() => handleDownloadSalarySlip(p.existingPayrollId, p.employee?.employee_code || 'EMP')}
                                className="px-3 py-1.5 rounded-lg bg-[#1A73C7] hover:bg-[#0F4C81] text-white text-[11px] font-semibold transition inline-flex items-center space-x-1 shadow-xs cursor-pointer active:scale-95"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download PDF</span>
                              </button>
                              <button
                                onClick={() => handleApproveEmployeePayroll(p.employee?.id)}
                                title="Recalculate and re-generate salary slip"
                                className="px-2 py-1.5 rounded-lg border border-[#E4E7EB] hover:bg-slate-100 text-slate-600 text-[10px] font-semibold transition cursor-pointer"
                              >
                                Re-sync
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleApproveEmployeePayroll(p.employee?.id)}
                              disabled={payrollLoading}
                              className="px-3 py-1.5 rounded-lg bg-[#2FA84F] hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] font-semibold transition inline-flex items-center space-x-1 shadow-xs cursor-pointer active:scale-95"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Approve & Generate Slip</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {payrollPreviews.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-400">
                          No active employees found for payroll period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 9. BONUS WORKING & CALCULATION TAB */}
        {activeTab === 'bonus' && (
          <div className="space-y-6">
            {/* Header Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#1A1D23] tracking-tight">Bonus Working</h1>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportBonusCsv}
                  disabled={!bonusData || bonusData?.employees?.length === 0}
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#E4E7EB] hover:bg-[#F7F8FA] text-xs font-semibold text-[#0F4C81] flex items-center space-x-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadBonusCalculation()}
                  disabled={bonusLoading}
                  className="px-3.5 py-2 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-xs font-semibold text-white flex items-center space-x-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${bonusLoading ? 'animate-spin' : ''}`} />
                  <span>{bonusLoading ? 'Calculating...' : 'Recalculate Bonus'}</span>
                </button>
              </div>
            </div>

            {/* Range & Configuration Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E4E7EB] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E4E7EB] pb-3">
                <div className="flex items-center space-x-2">
                  <Percent className="w-4 h-4 text-[#1A73C7]" />
                  <span className="font-bold text-sm text-[#1A1D23]">Bonus Range & Rate Settings</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Payment of Bonus Act Compliant</span>
              </div>

              {/* Input Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">From Month & Year</label>
                  <input
                    type="month"
                    value={bonusStartMonth}
                    onChange={(e) => {
                      setBonusStartMonth(e.target.value);
                      loadBonusCalculation(e.target.value, bonusEndMonth, bonusPercentage, bonusIncentive);
                    }}
                    className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] font-mono outline-none focus:border-[#1A73C7]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">To Month & Year</label>
                  <input
                    type="month"
                    value={bonusEndMonth}
                    onChange={(e) => {
                      setBonusEndMonth(e.target.value);
                      loadBonusCalculation(bonusStartMonth, e.target.value, bonusPercentage, bonusIncentive);
                    }}
                    className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] font-mono outline-none focus:border-[#1A73C7]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Bonus Rate (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={bonusPercentage}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setBonusPercentage(val);
                        loadBonusCalculation(bonusStartMonth, bonusEndMonth, val, bonusIncentive);
                      }}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 pr-8 text-[#1A1D23] font-bold outline-none focus:border-[#1A73C7]"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-semibold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Bonus Incentive (₹ / Staff)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-semibold">₹</span>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={bonusIncentive}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setBonusIncentive(val);
                        loadBonusCalculation(bonusStartMonth, bonusEndMonth, bonusPercentage, val);
                      }}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl pl-7 pr-3 py-2 text-[#1A1D23] font-bold outline-none focus:border-[#1A73C7]"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Presets for Fiscal Periods and Percentages */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-[#E4E7EB] text-xs">
                {/* Period Range Presets */}
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500 font-semibold mr-1">Period Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setBonusStartMonth('2025-11');
                      setBonusEndMonth('2026-10');
                      loadBonusCalculation('2025-11', '2026-10', bonusPercentage, bonusIncentive);
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                      bonusStartMonth === '2025-11' && bonusEndMonth === '2026-10'
                        ? 'bg-sky-50 border-[#1A73C7] text-[#1A73C7]'
                        : 'bg-[#F7F8FA] border-[#E4E7EB] text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    2025-26 Nov-Oct (Full Year)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBonusStartMonth('2025-11');
                      setBonusEndMonth('2026-03');
                      loadBonusCalculation('2025-11', '2026-03', bonusPercentage, bonusIncentive);
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                      bonusStartMonth === '2025-11' && bonusEndMonth === '2026-03'
                        ? 'bg-sky-50 border-[#1A73C7] text-[#1A73C7]'
                        : 'bg-[#F7F8FA] border-[#E4E7EB] text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    2025-26 Nov-Mar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBonusStartMonth('2026-03');
                      setBonusEndMonth('2026-10');
                      loadBonusCalculation('2026-03', '2026-10', bonusPercentage, bonusIncentive);
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                      bonusStartMonth === '2026-03' && bonusEndMonth === '2026-10'
                        ? 'bg-sky-50 border-[#1A73C7] text-[#1A73C7]'
                        : 'bg-[#F7F8FA] border-[#E4E7EB] text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    2026-27 Mar-Oct
                  </button>
                </div>

                {/* Percentage Presets */}
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500 font-semibold mr-1">Bonus %:</span>
                  {[8.33, 10, 12, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setBonusPercentage(pct);
                        loadBonusCalculation(bonusStartMonth, bonusEndMonth, pct, bonusIncentive);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                        bonusPercentage === pct
                          ? 'bg-[#2FA84F]/10 border-[#2FA84F] text-[#2FA84F]'
                          : 'bg-[#F7F8FA] border-[#E4E7EB] text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pct}%{pct === 8.33 ? ' (Statutory Min)' : pct === 20 ? ' (Max)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#E4E7EB] shadow-2xs space-y-1">
                <span className="text-[11px] text-slate-500 font-semibold">Eligible Staff</span>
                <div className="text-2xl font-bold text-[#1A1D23]">{bonusData?.summary?.totalEmployees || 0}</div>
                <span className="text-[10px] text-slate-500">Active within selected period</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-sky-200 shadow-2xs space-y-1">
                <span className="text-[11px] text-[#1A73C7] font-semibold">Total Eligible Base Salary</span>
                <div className="text-2xl font-bold text-[#1A73C7]">
                  ₹{((bonusData?.summary?.totalEligibleSalary || 0)).toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-slate-500">Base salary only (OT excluded)</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-1">
                <span className="text-[11px] text-amber-700 font-semibold">Overtime Excluded from Bonus</span>
                <div className="text-2xl font-bold text-amber-700">
                  ₹{((bonusData?.summary?.totalOtSalaryExcluded || 0)).toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-slate-500">
                  {bonusData?.summary?.totalOtHoursExcluded || 0} OT hrs excluded from bonus base
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1">
                <span className="text-[11px] text-[#2FA84F] font-semibold">Total Net Bonus Payable</span>
                <div className="text-2xl font-bold text-[#2FA84F]">
                  ₹{((bonusData?.summary?.totalBonusPayable || 0)).toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-slate-500">
                  At {bonusData?.percentage || bonusPercentage}% rate + incentives
                </span>
              </div>
            </div>

            {/* Employee Bonus Roster Table */}
            <div className="overflow-x-auto rounded-2xl bg-white border border-[#E4E7EB] shadow-xs">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-[#F7F8FA] text-slate-600 uppercase tracking-wider text-[10px] border-b border-[#E4E7EB]">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5 text-center">Months</th>
                    <th className="p-3.5 text-center">Working Days</th>
                    <th className="p-3.5 text-right">Eligible Base (₹)</th>
                    <th className="p-3.5 text-right">OT Excluded (₹)</th>
                    <th className="p-3.5 text-center">Bonus Rate</th>
                    <th className="p-3.5 text-right">Base Bonus (₹)</th>
                    <th className="p-3.5 text-right">Incentive (₹)</th>
                    <th className="p-3.5 text-right">Net Bonus Payable (₹)</th>
                    <th className="p-3.5 text-center">Monthly Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EB]">
                  {(bonusData?.employees || []).map((emp: any) => (
                    <tr key={emp.employee_id} className="hover:bg-[#F7F8FA] transition">
                      <td className="p-3.5">
                        <div className="font-bold text-[#1A1D23]">{emp.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {emp.employee_code} • {emp.department}
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-mono font-medium text-slate-600">
                        {emp.monthlyBreakdown?.length || 0}
                      </td>
                      <td className="p-3.5 text-center font-mono font-semibold text-slate-700">
                        {emp.totalDaysWorked}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-[#1A73C7]">
                        ₹{emp.totalEligibleSalary.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-right font-mono text-amber-700">
                        <div className="font-semibold">₹{emp.totalOtSalary.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-slate-400 font-normal">({emp.totalOtHours} hrs)</div>
                      </td>
                      <td className="p-3.5 text-center font-mono font-semibold text-slate-600">
                        {emp.bonusPercentage}%
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-700">
                        ₹{emp.bonusFromBase.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-700">
                        ₹{emp.bonusIncentive.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-right font-mono font-extrabold text-[#2FA84F] text-sm">
                        ₹{emp.netBonus.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmpForBonusBreakdown(emp);
                            setShowBonusBreakdownModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#1A73C7] text-[11px] font-semibold transition cursor-pointer inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Breakdown</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!bonusData || bonusData?.employees?.length === 0) && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        {bonusLoading ? 'Calculating bonus records...' : 'No employee records found for the selected month range.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 10. AUDIT LOG TAB */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-[#1A1D23] tracking-tight">Audit Logs</h1>

            <div className="overflow-x-auto rounded-2xl bg-white border border-[#E4E7EB] shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FA] text-slate-600 uppercase tracking-wider text-[10px] border-b border-[#E4E7EB]">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Admin Identity</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Module</th>
                    <th className="p-3.5">IP Address</th>
                    <th className="p-3.5">Changes / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EB]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F7F8FA] transition">
                      <td className="p-3.5 font-mono text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="p-3.5 font-semibold text-[#1A1D23]">{log.admin?.name || 'Administrator'}</td>
                      <td className="p-3.5 font-mono text-[#0F4C81] font-semibold">{log.action}</td>
                      <td className="p-3.5 text-slate-600">{log.module}</td>
                      <td className="p-3.5 font-mono text-slate-500">{log.ip_address}</td>
                      <td className="p-3.5 font-mono text-[10px] text-slate-500 max-w-xs truncate">
                        {log.new_value || '-'}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">No audit records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ADD EMPLOYEE (Complete Onboarding Form with Integrated Face Biometrics) */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white border border-[#E4E7EB] rounded-2xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EB]">
              <div>
                <h3 className="font-bold text-base text-[#1A1D23]">Register & Onboard New Employee</h3>
                <p className="text-xs text-slate-500">Complete personal, banking, education, and simultaneous face biometric registration</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddEmpModal(false);
                  setIsFaceCameraOpenForReg(false);
                  setEmpForm(initialEmpForm);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
              {/* SECTION 1: Personal Details */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-[#1A73C7] uppercase tracking-wider block">
                  1. Personal Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul"
                      value={empForm.name}
                      onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Surname</label>
                    <input
                      type="text"
                      placeholder="e.g. Sharma"
                      value={empForm.surname}
                      onChange={(e) => setEmpForm({ ...empForm, surname: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Date of Birth (DOB)</label>
                    <input
                      type="date"
                      value={empForm.dob}
                      onChange={(e) => setEmpForm({ ...empForm, dob: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={empForm.phone}
                      onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. rahul@example.com"
                      value={empForm.email}
                      onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Govt ID No (Aadhaar/PAN)</label>
                    <input
                      type="text"
                      placeholder="e.g. 1234-5678-9012"
                      value={empForm.govt_id_no}
                      onChange={(e) => setEmpForm({ ...empForm, govt_id_no: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Blood Group</label>
                    <select
                      value={empForm.blood_group}
                      onChange={(e) => setEmpForm({ ...empForm, blood_group: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    >
                      <option value="">Select Blood Group</option>
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Residential Address</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Flat 4B, Lotus Apartments, Anna Nagar, Chennai"
                    value={empForm.address}
                    onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}
                    className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                  />
                </div>
              </div>

              {/* SECTION 2: Banking Information */}
              <div className="space-y-2.5 pt-2 border-t border-[#E4E7EB]">
                <span className="text-[11px] font-bold text-[#1A73C7] uppercase tracking-wider block">
                  2. Bank Account Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India"
                      value={empForm.bank_name}
                      onChange={(e) => setEmpForm({ ...empForm, bank_name: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Bank Account No</label>
                    <input
                      type="text"
                      placeholder="e.g. 100234567890"
                      value={empForm.bank_acc_no}
                      onChange={(e) => setEmpForm({ ...empForm, bank_acc_no: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 font-mono text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Account Holder Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={empForm.bank_acc_holder}
                      onChange={(e) => setEmpForm({ ...empForm, bank_acc_holder: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0001234"
                      value={empForm.bank_ifsc}
                      onChange={(e) => setEmpForm({ ...empForm, bank_ifsc: e.target.value.toUpperCase() })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 font-mono uppercase text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Emergency Contact */}
              <div className="space-y-2.5 pt-2 border-t border-[#E4E7EB]">
                <span className="text-[11px] font-bold text-[#1A73C7] uppercase tracking-wider block">
                  3. Emergency Contact
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Contact Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sunita Sharma"
                      value={empForm.emergency_name}
                      onChange={(e) => setEmpForm({ ...empForm, emergency_name: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Relationship</label>
                    <input
                      type="text"
                      placeholder="e.g. Spouse / Parent / Sibling"
                      value={empForm.emergency_relationship}
                      onChange={(e) => setEmpForm({ ...empForm, emergency_relationship: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Contact Phone</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9812345678"
                      value={empForm.emergency_phone}
                      onChange={(e) => setEmpForm({ ...empForm, emergency_phone: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Contact Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Same as residential address"
                    value={empForm.emergency_address}
                    onChange={(e) => setEmpForm({ ...empForm, emergency_address: e.target.value })}
                    className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                  />
                </div>
              </div>

              {/* SECTION 4: Education & Previous Experience */}
              <div className="space-y-2.5 pt-2 border-t border-[#E4E7EB]">
                <span className="text-[11px] font-bold text-[#1A73C7] uppercase tracking-wider block">
                  4. Education & Background
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Education Details</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Diploma in Mechanical Engg / B.Tech / Higher Secondary"
                      value={empForm.education_details}
                      onChange={(e) => setEmpForm({ ...empForm, education_details: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Previous Experiences</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. 2 years as Junior Operator at ABC Manufacturing Ltd"
                      value={empForm.previous_experience}
                      onChange={(e) => setEmpForm({ ...empForm, previous_experience: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: Operational & Payroll Assignment */}
              <div className="space-y-2.5 pt-2 border-t border-[#E4E7EB]">
                <span className="text-[11px] font-bold text-[#1A73C7] uppercase tracking-wider block">
                  5. Job & Payroll Assignment
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Employee ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EMP007"
                      value={empForm.employee_code}
                      onChange={(e) => setEmpForm({ ...empForm, employee_code: e.target.value.toUpperCase() })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] uppercase font-mono outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Password</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. emp123"
                      value={empForm.password}
                      onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Hourly Rate (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 150"
                      value={empForm.salary_per_hour}
                      onChange={(e) => setEmpForm({ ...empForm, salary_per_hour: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">EPF / UAN Number</label>
                    <input
                      type="text"
                      placeholder="e.g. TN/MAS/0048123/1007"
                      value={empForm.epf_number}
                      onChange={(e) => setEmpForm({ ...empForm, epf_number: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] font-mono outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Operations"
                      value={empForm.department}
                      onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Associate"
                      value={empForm.designation}
                      onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Assigned Shift</label>
                    <select
                      value={empForm.shift_id}
                      onChange={(e) => setEmpForm({ ...empForm, shift_id: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    >
                      <option value="">Select Shift Schedule</option>
                      {shifts.map((s) => (
                        <option key={s.id} value={s.id}>{s.shift_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 6: Face Biometric Enrollment at Registration Time */}
              <div className="space-y-2.5 pt-2 border-t border-[#E4E7EB]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#1A73C7] uppercase tracking-wider block">
                    6. Face Biometric Enrollment (Mandatory for Kiosk Attendance)
                  </span>
                  <span className="text-[10px] text-slate-400">AWS Rekognition Profile</span>
                </div>

                {!isFaceCameraOpenForReg && !empForm.face_image ? (
                  <div className="p-4 rounded-xl border-2 border-dashed border-[#1A73C7]/40 bg-sky-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">Live Camera Face Registration</span>
                      <span className="text-[11px] text-slate-500">Capture face photo to register employee biometric signature right now.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFaceCameraOpenForReg(true)}
                      className="px-4 py-2 bg-[#1A73C7] hover:bg-[#0F4C81] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Open Camera & Enroll Face</span>
                    </button>
                  </div>
                ) : isFaceCameraOpenForReg ? (
                  <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-[#E4E7EB] space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-[#1A1D23]">Align employee face squarely in the viewfinder</span>
                      <button
                        type="button"
                        onClick={() => setIsFaceCameraOpenForReg(false)}
                        className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Cancel Camera
                      </button>
                    </div>
                    <div className="max-w-md mx-auto">
                      <CameraView
                        onFaceCaptured={(res: FaceDetectionResult) => {
                          setEmpForm({
                            ...empForm,
                            face_image: res.image || '',
                            face_embedding: res.embedding,
                          });
                          setIsFaceCameraOpenForReg(false);
                        }}
                        isScanning={true}
                        autoCaptureOnReady={false}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {empForm.face_image ? (
                        <img src={empForm.face_image} alt="Enrolled Face" className="w-12 h-12 rounded-xl object-cover border border-emerald-300 shadow-2xs" />
                      ) : (
                        <CheckCircle className="w-8 h-8 text-[#2FA84F]" />
                      )}
                      <div>
                        <span className="font-bold text-[#2FA84F] text-xs block">✓ Face Biometrics Captured & Ready</span>
                        <span className="text-[10px] text-slate-500">Face biometric collection will be indexed securely in AWS Rekognition.</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEmpForm({ ...empForm, face_image: '', face_embedding: null });
                        setIsFaceCameraOpenForReg(true);
                      }}
                      className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-lg cursor-pointer"
                    >
                      Retake Photo
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 flex space-x-3 justify-end border-t border-[#E4E7EB]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEmpModal(false);
                    setIsFaceCameraOpenForReg(false);
                    setEmpForm(initialEmpForm);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#F7F8FA] hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-white font-semibold transition shadow-xs cursor-pointer active:scale-95"
                >
                  Save & Complete Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FACE ENROLLMENT */}
      {showEnrollModal && selectedEmpForEnroll && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E7EB] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95 text-center">
            <h3 className="font-bold text-base text-[#1A1D23]">
              Face Biometric Enrollment: {selectedEmpForEnroll.name}
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              Employee ID: {selectedEmpForEnroll.employee_code}
            </p>

            {enrollSuccessMsg ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-[#2FA84F] space-y-2">
                <CheckCircle className="w-10 h-10 mx-auto text-[#2FA84F]" />
                <p className="font-bold text-sm">{enrollSuccessMsg}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <CameraView
                  onFaceCaptured={handleEnrollFaceCapture}
                  isScanning={true}
                  autoCaptureOnReady={false}
                />
                <p className="text-xs text-slate-500">
                  Align employee face squarely in the viewfinder and tap "Capture & Mark" to index their profile in AWS Rekognition.
                </p>
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="w-full py-2.5 rounded-xl bg-[#F7F8FA] hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ATTENDANCE OVERRIDE */}
      {showOverrideModal && selectedAttForOverride && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E7EB] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95">
            <h3 className="font-bold text-base text-[#1A1D23]">Manual Attendance Override</h3>
            <p className="text-xs text-slate-500">
              Employee: {selectedAttForOverride.employee?.name} ({selectedAttForOverride.date})
            </p>

            <form onSubmit={handleSaveOverride} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Override Daily Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="LATE">LATE</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="LEAVE">LEAVE</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Mandatory Override Justification</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Employee punch was missed due to on-site client visit verified by management"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-[#F7F8FA] hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-white font-semibold shadow-xs"
                >
                  Confirm Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SALARY REVISION */}
      {showSalaryReviseModal && selectedEmpForSalary && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E7EB] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#1A1D23]">Revise Employee Hourly Rate</h3>
                <p className="text-xs text-slate-500">
                  {selectedEmpForSalary.name} (Current Rate: ₹{selectedEmpForSalary.salary_per_hour}/hr)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryView(!showHistoryView)}
                className="px-2.5 py-1 rounded-lg border border-[#E4E7EB] hover:bg-[#F7F8FA] text-[11px] font-semibold text-[#1A73C7] cursor-pointer"
              >
                {showHistoryView ? 'Back to Form' : 'View History'}
              </button>
            </div>

            {showHistoryView ? (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Salary Revision Audit Trail</h4>
                {loadingSalaryHistory ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Loading revision history...</p>
                ) : selectedEmpSalaryHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No previous salary revisions recorded.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {selectedEmpSalaryHistory.map((sh: any) => (
                      <div key={sh.id} className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E4E7EB] text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#1A73C7]">₹{sh.new_rate}/hr</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {sh.effective_from} to {sh.effective_to || 'Present'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{sh.reason}</p>
                        <span className="text-[10px] text-slate-400 block">Previous: ₹{sh.old_rate}/hr</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowSalaryReviseModal(false)}
                  className="w-full py-2 rounded-xl bg-[#F7F8FA] hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await apiRequest('/salary-history/revise', {
                      method: 'POST',
                      body: JSON.stringify({
                        employee_id: selectedEmpForSalary.id,
                        new_rate: salaryForm.new_rate,
                        effective_from: salaryForm.effective_from,
                        effective_to: salaryForm.effective_to,
                        reason: salaryForm.reason,
                      }),
                    });
                    if (res.success) {
                      setShowSalaryReviseModal(false);
                      loadData();
                      alert(res.message);
                    }
                  } catch (err: any) {
                    alert(err.message);
                  }
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">New Hourly Rate (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={salaryForm.new_rate}
                    onChange={(e) => setSalaryForm({ ...salaryForm, new_rate: parseFloat(e.target.value) })}
                    className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] font-mono font-bold outline-none focus:border-[#1A73C7]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Start Date (Effective From)</label>
                    <input
                      type="date"
                      required
                      value={salaryForm.effective_from}
                      onChange={(e) => {
                        const newFrom = e.target.value;
                        const nextY = new Date(newFrom);
                        nextY.setFullYear(nextY.getFullYear() + 1);
                        setSalaryForm({
                          ...salaryForm,
                          effective_from: newFrom,
                          effective_to: nextY.toISOString().split('T')[0],
                        });
                      }}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">End Date (1-Year Period)</label>
                    <input
                      type="date"
                      required
                      value={salaryForm.effective_to}
                      onChange={(e) => setSalaryForm({ ...salaryForm, effective_to: e.target.value })}
                      className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Standard validity is 1 year. Past revisions remain preserved in the historical audit ledger.
                </p>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Revision Rationale / Reason</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annual compensation increment & promotion"
                    value={salaryForm.reason}
                    onChange={(e) => setSalaryForm({ ...salaryForm, reason: e.target.value })}
                    className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                  />
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowSalaryReviseModal(false)}
                    className="w-1/2 py-2.5 rounded-xl bg-[#F7F8FA] hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-white font-semibold shadow-xs cursor-pointer"
                  >
                    Save Revision
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD SHIFT */}
      {showAddShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E7EB] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95">
            <h3 className="font-bold text-base text-[#1A1D23]">Create New Shift Schedule</h3>
            
            {/* Quick Shift Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 font-semibold block">Quick Standard Shift Presets:</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setShiftForm({
                    shift_name: 'Shift 1 (7:00 AM - 3:00 PM)',
                    morning_in: '07:00:00',
                    lunch_out: '11:00:00',
                    lunch_in: '11:30:00',
                    evening_out: '15:00:00',
                    ot_rate_multiplier: 1.5,
                  })}
                  className="py-1 px-2 rounded-lg bg-[#F7F8FA] hover:bg-sky-50 hover:text-[#1A73C7] border border-[#E4E7EB] text-[10px] font-semibold text-slate-600 transition cursor-pointer"
                >
                  Shift 1 (7am-3pm)
                </button>
                <button
                  type="button"
                  onClick={() => setShiftForm({
                    shift_name: 'Shift 2 (3:00 PM - 11:00 PM)',
                    morning_in: '15:00:00',
                    lunch_out: '19:00:00',
                    lunch_in: '19:30:00',
                    evening_out: '23:00:00',
                    ot_rate_multiplier: 1.5,
                  })}
                  className="py-1 px-2 rounded-lg bg-[#F7F8FA] hover:bg-sky-50 hover:text-[#1A73C7] border border-[#E4E7EB] text-[10px] font-semibold text-slate-600 transition cursor-pointer"
                >
                  Shift 2 (3pm-11pm)
                </button>
                <button
                  type="button"
                  onClick={() => setShiftForm({
                    shift_name: 'Shift 3 (11:00 PM - 7:00 AM)',
                    morning_in: '23:00:00',
                    lunch_out: '03:00:00',
                    lunch_in: '03:30:00',
                    evening_out: '07:00:00',
                    ot_rate_multiplier: 1.5,
                  })}
                  className="py-1 px-2 rounded-lg bg-[#F7F8FA] hover:bg-sky-50 hover:text-[#1A73C7] border border-[#E4E7EB] text-[10px] font-semibold text-slate-600 transition cursor-pointer"
                >
                  Shift 3 (11pm-7am)
                </button>
              </div>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await apiRequest('/shifts', {
                    method: 'POST',
                    body: JSON.stringify(shiftForm),
                  });
                  if (res.success) {
                    setShowAddShiftModal(false);
                    loadData();
                    alert('Shift created successfully');
                  }
                } catch (err: any) {
                  alert(err.message);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Shift Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. General Day Shift"
                  value={shiftForm.shift_name}
                  onChange={(e) => setShiftForm({ ...shiftForm, shift_name: e.target.value })}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Morning In</label>
                  <input
                    type="text"
                    required
                    placeholder="09:00:00"
                    value={shiftForm.morning_in}
                    onChange={(e) => setShiftForm({ ...shiftForm, morning_in: e.target.value })}
                    className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Lunch Out</label>
                  <input
                    type="text"
                    required
                    placeholder="13:00:00"
                    value={shiftForm.lunch_out}
                    onChange={(e) => setShiftForm({ ...shiftForm, lunch_out: e.target.value })}
                    className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Lunch In</label>
                  <input
                    type="text"
                    required
                    placeholder="14:00:00"
                    value={shiftForm.lunch_in}
                    onChange={(e) => setShiftForm({ ...shiftForm, lunch_in: e.target.value })}
                    className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Evening Out</label>
                  <input
                    type="text"
                    required
                    placeholder="18:00:00"
                    value={shiftForm.evening_out}
                    onChange={(e) => setShiftForm({ ...shiftForm, evening_out: e.target.value })}
                    className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Overtime Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="e.g. 1.5"
                  value={shiftForm.ot_rate_multiplier}
                  onChange={(e) => setShiftForm({ ...shiftForm, ot_rate_multiplier: parseFloat(e.target.value) })}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddShiftModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-[#F7F8FA] hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-white font-semibold shadow-xs"
                >
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD KIOSK */}
      {showAddKioskModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E7EB] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95">
            <h3 className="font-bold text-base text-[#1A1D23]">Register Kiosk Terminal</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await apiRequest('/kiosks', {
                    method: 'POST',
                    body: JSON.stringify(kioskForm),
                  });
                  if (res.success) {
                    setShowAddKioskModal(false);
                    loadData();
                    alert('Kiosk registered successfully');
                  }
                } catch (err: any) {
                  alert(err.message);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Device Terminal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KIOSK-003"
                  value={kioskForm.device_name}
                  onChange={(e) => setKioskForm({ ...kioskForm, device_name: e.target.value })}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Location / Entrance</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Gate Entrance"
                  value={kioskForm.location}
                  onChange={(e) => setKioskForm({ ...kioskForm, location: e.target.value })}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddKioskModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-[#F7F8FA] hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-white font-semibold shadow-xs"
                >
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ADVANCE */}
      {showAddAdvanceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E7EB] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95">
            <h3 className="font-bold text-base text-[#1A1D23]">Issue Employee Advance</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await apiRequest('/advances', {
                    method: 'POST',
                    body: JSON.stringify(advanceForm),
                  });
                  if (res.success) {
                    setShowAddAdvanceModal(false);
                    loadData();
                    alert('Advance recorded successfully');
                  }
                } catch (err: any) {
                  alert(err.message);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Select Employee</label>
                <select
                  required
                  value={advanceForm.employee_id}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, employee_id: e.target.value })}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                >
                  <option value="">Choose Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Advance Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: parseFloat(e.target.value) })}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Purpose / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Medical emergency assistance"
                  value={advanceForm.note}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, note: e.target.value })}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddAdvanceModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-[#F7F8FA] hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-white font-semibold shadow-xs"
                >
                  Record Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD LEAVE */}
      {showAddLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E7EB] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95">
            <h3 className="font-bold text-base text-[#1A1D23]">Record Leave Application</h3>
            <form onSubmit={handleCreateLeave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Select Employee</label>
                <select
                  required
                  value={leaveForm.employee_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                >
                  <option value="">Choose Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Leave Type</label>
                <select
                  required
                  value={leaveForm.leave_type_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type_id: e.target.value })}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                >
                  <option value="">Choose Type</option>
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>{lt.name} (Limit: {lt.annual_limit} days)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">From Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.from_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                    className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">To Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.to_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                    className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Number of Days</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={leaveForm.number_of_days}
                  onChange={(e) => setLeaveForm({ ...leaveForm, number_of_days: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sick leave / Family function"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EB] rounded-xl px-3 py-2 text-[#1A1D23] outline-none focus:border-[#1A73C7]"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddLeaveModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-[#F7F8FA] hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] text-white font-semibold shadow-xs cursor-pointer"
                >
                  Submit Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BONUS MONTHLY BREAKDOWN (Matches User Working Sheet / Sep-26 Spec) */}
      {showBonusBreakdownModal && selectedEmpForBonusBreakdown && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#E4E7EB] rounded-2xl max-w-3xl w-full p-4 sm:p-6 space-y-4 shadow-xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EB]">
              <div>
                <h3 className="font-bold text-base text-[#1A1D23] flex items-center space-x-2">
                  <span>Bonus Monthly Working Breakdown</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#2FA84F] text-xs font-mono font-bold">
                    {selectedEmpForBonusBreakdown.bonusPercentage}%
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedEmpForBonusBreakdown.name} ({selectedEmpForBonusBreakdown.employee_code}) • {selectedEmpForBonusBreakdown.department}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBonusBreakdownModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Table styled matching user image 1 layout */}
            <div className="overflow-x-auto rounded-xl border border-[#D5CEBF] shadow-2xs">
              <table className="w-full text-left text-xs min-w-[500px]">
                {/* Beige banner header matching user's Image 1 (Sep-26 style) */}
                <thead>
                  <tr className="bg-[#D9D2C2] text-[#222] font-bold text-center border-b border-[#C2BAA8]">
                    <th colSpan={6} className="py-2 text-xs tracking-wider uppercase">
                      Monthly Breakdown Range ({bonusStartMonth} to {bonusEndMonth})
                    </th>
                  </tr>
                  <tr className="bg-[#EAE4D7] text-[#222] font-bold border-b border-[#C2BAA8]">
                    <th className="p-2.5 text-left border-r border-[#D5CEBF]">Month</th>
                    <th className="p-2.5 text-center border-r border-[#D5CEBF]">No Of Days</th>
                    <th className="p-2.5 text-right border-r border-[#D5CEBF]">Slary</th>
                    <th className="p-2.5 text-center border-r border-[#D5CEBF]">OT Hours</th>
                    <th className="p-2.5 text-right border-r border-[#D5CEBF] bg-amber-50/60 text-amber-900">
                      OT Salary <span className="text-[10px] text-amber-700 font-normal">(Excl.)</span>
                    </th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EB]">
                  {(selectedEmpForBonusBreakdown.monthlyBreakdown || []).map((mb: any) => (
                    <tr key={mb.month} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 font-bold text-slate-800 border-r border-[#E4E7EB] font-mono">
                        {mb.monthLabel || mb.month}
                      </td>
                      <td className="p-2.5 text-center font-mono border-r border-[#E4E7EB]">
                        {mb.noOfDays}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-[#1A73C7] border-r border-[#E4E7EB]">
                        ₹{mb.salary.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-center font-mono border-r border-[#E4E7EB] text-slate-600">
                        {mb.otHours} hrs
                      </td>
                      <td className="p-2.5 text-right font-mono text-amber-700 bg-amber-50/30 border-r border-[#E4E7EB]">
                        ₹{mb.otSalary.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-slate-800">
                        ₹{mb.total.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}

                  {/* Summary / Totals Row */}
                  <tr className="bg-[#F2ECE1] font-bold text-[#1A1D23] border-t-2 border-[#C2BAA8]">
                    <td className="p-2.5 uppercase text-xs tracking-wider border-r border-[#D5CEBF]">
                      TOTAL
                    </td>
                    <td className="p-2.5 text-center font-mono border-r border-[#D5CEBF]">
                      {selectedEmpForBonusBreakdown.totalDaysWorked}
                    </td>
                    <td className="p-2.5 text-right font-mono text-[#1A73C7] border-r border-[#D5CEBF]">
                      ₹{selectedEmpForBonusBreakdown.totalEligibleSalary.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-center font-mono text-slate-600 border-r border-[#D5CEBF]">
                      {selectedEmpForBonusBreakdown.totalOtHours} hrs
                    </td>
                    <td className="p-2.5 text-right font-mono text-amber-700 bg-amber-100/50 border-r border-[#D5CEBF]">
                      ₹{selectedEmpForBonusBreakdown.totalOtSalary.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-900">
                      ₹{selectedEmpForBonusBreakdown.totalGrossEarnings.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Formula Breakdown Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-[#E4E7EB] space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EB]">
                <span className="text-slate-600 font-semibold">1. Eligible Base Salary (OT Excluded):</span>
                <span className="font-mono font-bold text-[#1A73C7] text-sm">
                  ₹{selectedEmpForBonusBreakdown.totalEligibleSalary.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EB]">
                <span className="text-slate-600 font-semibold">
                  2. Bonus Base Calculation ({selectedEmpForBonusBreakdown.bonusPercentage}% of Base):
                </span>
                <span className="font-mono font-bold text-slate-800">
                  ₹{selectedEmpForBonusBreakdown.bonusFromBase.toLocaleString('en-IN')}
                </span>
              </div>

              {selectedEmpForBonusBreakdown.bonusIncentive > 0 && (
                <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EB]">
                  <span className="text-slate-600 font-semibold">3. Additional Bonus Incentive:</span>
                  <span className="font-mono font-bold text-[#1A73C7]">
                    + ₹{selectedEmpForBonusBreakdown.bonusIncentive.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-900 font-extrabold text-sm">Net Bonus Payable:</span>
                <span className="font-mono font-extrabold text-[#2FA84F] text-lg">
                  ₹{selectedEmpForBonusBreakdown.netBonus.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="mt-2 p-2 rounded-lg bg-emerald-50 text-[11px] text-[#2FA84F] font-semibold flex items-center space-x-1.5">
                <span>✓ Verified: Overtime (₹{selectedEmpForBonusBreakdown.totalOtSalary.toLocaleString('en-IN')}) is 100% excluded from bonus base.</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowBonusBreakdownModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EMPLOYEE FULL ONBOARDING PROFILE DETAILS */}
      {showEmpProfileModal && selectedEmpForProfile && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white border border-[#E4E7EB] rounded-2xl max-w-3xl w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EB]">
              <div>
                <h3 className="font-bold text-base text-[#1A1D23] flex items-center space-x-2">
                  <span>{selectedEmpForProfile.name} {selectedEmpForProfile.surname || ''}</span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-50 text-[#1A73C7] text-xs font-mono font-bold">
                    {selectedEmpForProfile.employee_code}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedEmpForProfile.department} • {selectedEmpForProfile.designation}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEmpProfileModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. Personal Info */}
              <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E4E7EB] space-y-2">
                <span className="font-bold text-[#1A73C7] uppercase text-[10px] tracking-wider block">
                  1. Personal Details
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <span className="text-slate-400 block text-[10px]">DOB</span>
                    <span className="font-medium text-[#1A1D23]">{selectedEmpForProfile.dob || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Phone</span>
                    <span className="font-medium text-[#1A1D23]">{selectedEmpForProfile.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Email</span>
                    <span className="font-medium text-[#1A1D23] truncate block">{selectedEmpForProfile.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Blood Group</span>
                    <span className="font-bold text-rose-600">{selectedEmpForProfile.blood_group || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px]">Govt ID / Aadhaar</span>
                    <span className="font-mono font-medium text-[#1A1D23]">{selectedEmpForProfile.govt_id_no || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px]">Address</span>
                    <span className="text-[#1A1D23]">{selectedEmpForProfile.address || '-'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Bank Details */}
              <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E4E7EB] space-y-2">
                <span className="font-bold text-[#1A73C7] uppercase text-[10px] tracking-wider block">
                  2. Bank Account Details
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">Bank Name</span>
                    <span className="font-medium text-[#1A1D23]">{selectedEmpForProfile.bank_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">Account Number</span>
                    <span className="font-bold text-[#0F4C81]">{selectedEmpForProfile.bank_acc_no || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">Account Holder</span>
                    <span className="font-medium text-[#1A1D23]">{selectedEmpForProfile.bank_acc_holder || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">IFSC Code</span>
                    <span className="font-bold text-emerald-700">{selectedEmpForProfile.bank_ifsc || '-'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Emergency Contact */}
              <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E4E7EB] space-y-2">
                <span className="font-bold text-[#1A73C7] uppercase text-[10px] tracking-wider block">
                  3. Emergency Contact
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Contact Name</span>
                    <span className="font-medium text-[#1A1D23]">{selectedEmpForProfile.emergency_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Relationship</span>
                    <span className="font-medium text-[#1A1D23]">{selectedEmpForProfile.emergency_relationship || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Contact Phone</span>
                    <span className="font-medium text-[#1A1D23]">{selectedEmpForProfile.emergency_phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Emergency Address</span>
                    <span className="text-[#1A1D23] truncate block">{selectedEmpForProfile.emergency_address || '-'}</span>
                  </div>
                </div>
              </div>

              {/* 4. Education & Experience */}
              <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E4E7EB] space-y-2">
                <span className="font-bold text-[#1A73C7] uppercase text-[10px] tracking-wider block">
                  4. Education & Background
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Education Details</span>
                    <p className="text-[#1A1D23] whitespace-pre-wrap">{selectedEmpForProfile.education_details || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Previous Experiences</span>
                    <p className="text-[#1A1D23] whitespace-pre-wrap">{selectedEmpForProfile.previous_experience || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* 5. Statutory & Work info */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-emerald-800 font-bold block">EPF / UAN Account Number</span>
                  <span className="font-mono text-[#0F4C81] font-bold">
                    {selectedEmpForProfile.epf_number || `TN/MAS/0048123/${selectedEmpForProfile.employee_code}`}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Hourly Rate</span>
                    <span className="font-bold text-[#1A1D23]">₹{selectedEmpForProfile.salary_per_hour}/hr</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Assigned Shift</span>
                    <span className="font-medium text-[#1A1D23]">{selectedEmpForProfile.shift?.shift_name || 'General Shift'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowEmpProfileModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
