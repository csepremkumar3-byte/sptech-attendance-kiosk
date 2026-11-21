import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  DollarSign,
  Download,
  FileText,
  LogOut,
  Send,
  User,
  Shield,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { apiRequest, getStoredToken, getStoredUser, removeStoredToken } from '../services/api';

export const EmployeePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);

  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves' | 'payroll'>('attendance');

  const [attendances, setAttendances] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);

  // Apply leave form
  const [leaveForm, setLeaveForm] = useState({
    leave_type_id: '',
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    number_of_days: 1,
    reason: '',
  });

  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    const stored = getStoredUser();
    if (!token || stored?.role !== 'employee') {
      navigate('/login');
      return;
    }
    setUser(stored);
    loadEmployeeData(stored.id);
  }, []);

  const loadEmployeeData = async (employeeId: number) => {
    try {
      const [attRes, balRes, reqRes, typeRes, payRes] = await Promise.all([
        apiRequest('/attendance/my'),
        apiRequest(`/leaves/balances?employee_id=${employeeId}`),
        apiRequest(`/leaves?employee_id=${employeeId}`),
        apiRequest('/leave-types'),
        apiRequest(`/payroll?employee_id=${employeeId}`),
      ]);

      if (attRes.success) setAttendances(attRes.attendances);
      if (balRes.success) setLeaveBalances(balRes.balances);
      if (reqRes.success) setLeaveRequests(reqRes.leaveRequests);
      if (typeRes.success) {
        setLeaveTypes(typeRes.leaveTypes);
        if (typeRes.leaveTypes.length > 0) {
          setLeaveForm((prev) => ({ ...prev, leave_type_id: typeRes.leaveTypes[0].id }));
        }
      }
      if (payRes.success) setPayrolls(payRes.payrolls);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplySuccess(null);
    try {
      const res = await apiRequest('/leaves/apply', {
        method: 'POST',
        body: JSON.stringify(leaveForm),
      });
      if (res.success) {
        setApplySuccess('Leave request submitted successfully for approval.');
        setLeaveForm({
          ...leaveForm,
          reason: '',
          number_of_days: 1,
        });
        if (user) loadEmployeeData(user.id);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    removeStoredToken();
    navigate('/login');
  };

  // Today's attendance summary
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAtt = attendances.find((a) => a.date === todayStr);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-sky-500">
      {/* Top Header */}
      <header className="px-4 sm:px-8 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-600 flex items-center justify-center font-bold text-white shadow-lg">
            {user?.name?.charAt(0) || 'E'}
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">{user?.name}</h1>
            <p className="text-xs text-sky-400 font-mono">
              {user?.employee_code} • {user?.department || 'Operations'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/kiosk"
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
          >
            Kiosk Screen
          </Link>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Today's Punch Status Summary Card */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Today's Attendance Status ({todayStr})
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              todayAtt?.daily_status === 'LATE' ? 'bg-amber-500/20 text-amber-300' :
              todayAtt?.daily_status === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-300' :
              'bg-slate-800 text-slate-400'
            }`}>
              {todayAtt ? todayAtt.daily_status : 'Not Punched Today'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">1. Morning In:</span>
              <span className="font-mono text-white text-sm font-semibold">
                {todayAtt?.morning_in_punch ? new Date(todayAtt.morning_in_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">2. Lunch Out:</span>
              <span className="font-mono text-white text-sm font-semibold">
                {todayAtt?.lunch_out_punch ? new Date(todayAtt.lunch_out_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">3. Lunch In:</span>
              <span className="font-mono text-white text-sm font-semibold">
                {todayAtt?.lunch_in_punch ? new Date(todayAtt.lunch_in_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">4. Evening Out:</span>
              <span className="font-mono text-white text-sm font-semibold">
                {todayAtt?.evening_out_punch ? new Date(todayAtt.evening_out_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 space-x-6 text-sm">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 font-semibold transition cursor-pointer flex items-center space-x-2 ${
              activeTab === 'attendance' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Attendance History</span>
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            className={`pb-3 font-semibold transition cursor-pointer flex items-center space-x-2 ${
              activeTab === 'leaves' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Leave Management</span>
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`pb-3 font-semibold transition cursor-pointer flex items-center space-x-2 ${
              activeTab === 'payroll' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Salary & Slips</span>
          </button>
        </div>

        {/* Tab 1: Attendance History */}
        {activeTab === 'attendance' && (
          <div className="overflow-x-auto rounded-2xl bg-slate-900 border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Morning In</th>
                  <th className="p-3.5">Lunch Out</th>
                  <th className="p-3.5">Lunch In</th>
                  <th className="p-3.5">Evening Out</th>
                  <th className="p-3.5">Hours</th>
                  <th className="p-3.5">Overtime</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {attendances.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-mono text-white font-medium">{a.date}</td>
                    <td className="p-3.5 font-mono text-slate-300">
                      {a.morning_in_punch ? new Date(a.morning_in_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      {a.lunch_out_punch ? new Date(a.lunch_out_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      {a.lunch_in_punch ? new Date(a.lunch_in_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      {a.evening_out_punch ? new Date(a.evening_out_punch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="p-3.5 font-mono text-sky-400 font-semibold">{a.hours_worked || 0} hrs</td>
                    <td className="p-3.5 font-mono text-amber-400">{a.ot_hours || 0} hrs</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.daily_status === 'LATE' ? 'bg-amber-500/20 text-amber-300' :
                        a.daily_status === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-300' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {a.daily_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Leaves */}
        {activeTab === 'leaves' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Apply Leave Form */}
            <div className="md:col-span-1 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-white">Apply for Leave</h3>
              {applySuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs">
                  {applySuccess}
                </div>
              )}
              <form onSubmit={handleApplyLeave} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Leave Type</label>
                  <select
                    value={leaveForm.leave_type_id}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leave_type_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-sky-500"
                  >
                    {leaveTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">From Date</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.from_date}
                      onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">To Date</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.to_date}
                      onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Reason</label>
                  <textarea
                    required
                    rows={2}
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition cursor-pointer"
                >
                  Submit Request
                </button>
              </form>
            </div>

            {/* Leave Balances & History */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {leaveBalances.map((b) => (
                  <div key={b.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">{b.leaveType?.name}</span>
                    <div className="text-xl font-bold text-sky-400">{b.remaining} days left</div>
                    <span className="text-[10px] text-slate-500">Allocated: {b.allocated} • Used: {b.used}</span>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto rounded-2xl bg-slate-900 border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Type</th>
                      <th className="p-3">Duration</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {leaveRequests.map((r) => (
                      <tr key={r.id}>
                        <td className="p-3 font-semibold text-white">{r.leaveType?.name}</td>
                        <td className="p-3 font-mono text-slate-300">{r.from_date} to {r.to_date}</td>
                        <td className="p-3 text-slate-400">{r.reason}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' :
                            r.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Payroll & Salary Slips */}
        {activeTab === 'payroll' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-white">Monthly Salary History & Official Slips</h3>
            <div className="overflow-x-auto rounded-2xl bg-slate-900 border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Month</th>
                    <th className="p-3.5">Base Pay</th>
                    <th className="p-3.5">OT Pay</th>
                    <th className="p-3.5">Advance Settled</th>
                    <th className="p-3.5">Net Salary</th>
                    <th className="p-3.5 text-right">Download Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {payrolls.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-mono font-bold text-white">{p.month}</td>
                      <td className="p-3.5 font-mono text-slate-300">₹{p.base_pay}</td>
                      <td className="p-3.5 font-mono text-amber-400">₹{p.ot_pay}</td>
                      <td className="p-3.5 font-mono text-rose-400">-₹{p.advance_settled || 0}</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-400 text-sm">₹{p.total_salary}</td>
                      <td className="p-3.5 text-right">
                        <a
                          href={`/api/salary-slips/${p.id}/download`}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF Slip</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                  {payrolls.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        No finalized payroll records available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="px-6 py-3 border-t border-slate-900 text-center text-xs text-slate-500">
        SPTech Employee Portal • Protected by Role-Based Access Control
      </footer>
    </div>
  );
};
