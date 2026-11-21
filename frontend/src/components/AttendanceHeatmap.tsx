import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Info
} from 'lucide-react';

export interface DailyAttendanceRecord {
  id?: number;
  date: string; // YYYY-MM-DD
  morning_in?: string | null;
  lunch_out?: string | null;
  lunch_in?: string | null;
  evening_out?: string | null;
  hours_worked?: number | null;
  ot_hours?: number | null;
  daily_status?: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'OVERTIME' | 'ABSENT' | 'ON_LEAVE' | 'REST_DAY' | string;
  is_manual_override?: boolean;
  kiosk_name?: string;
  notes?: string;
}

interface AttendanceHeatmapProps {
  employee: {
    id: number;
    name: string;
    employee_code: string;
    department?: string;
    designation?: string;
  };
  month: string; // 'YYYY-MM'
  attendances: DailyAttendanceRecord[];
  onMonthChange?: (newMonth: string) => void;
  onSelectDay?: (date: string, record?: DailyAttendanceRecord) => void;
}

export const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = ({
  employee,
  month,
  attendances,
  onMonthChange,
  onSelectDay,
}) => {
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    dayNum: number;
    record?: DailyAttendanceRecord;
    x: number;
    y: number;
  } | null>(null);

  // Parse Year and Month
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1; // 0-indexed

  // Month date computations
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthName = firstDayOfMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Map attendances by Date string: 'YYYY-MM-DD'
  const attendanceMap = new Map<string, DailyAttendanceRecord>();
  attendances.forEach((att) => {
    attendanceMap.set(att.date, att);
  });

  // Calculate Monthly Summary Stats
  let totalHours = 0;
  let totalOt = 0;
  let presentDays = 0;
  let lateDays = 0;
  let halfDays = 0;
  let leaveDays = 0;
  let absentDays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const rec = attendanceMap.get(dateStr);
    const dayOfWeek = new Date(year, monthIndex, d).getDay(); // 0 is Sunday

    if (rec) {
      if (rec.hours_worked) totalHours += Number(rec.hours_worked);
      if (rec.ot_hours) totalOt += Number(rec.ot_hours);

      const status = rec.daily_status?.toUpperCase();
      if (status === 'PRESENT' || status === 'OVERTIME') presentDays++;
      else if (status === 'LATE') lateDays++;
      else if (status === 'HALF_DAY') halfDays++;
      else if (status === 'ON_LEAVE' || status === 'LEAVE') leaveDays++;
      else if (status === 'ABSENT') absentDays++;
    } else {
      // Past day with no record on a weekday (Mon-Sat)
      const isPast = new Date(year, monthIndex, d) < new Date(new Date().setHours(0, 0, 0, 0));
      if (isPast && dayOfWeek !== 0) {
        absentDays++;
      }
    }
  }

  // Build GitHub-style Matrix (7 rows for Mon-Sun, cols for Weeks)
  // Day of week: 0 = Mon, 1 = Tue, ..., 6 = Sun (ISO-like)
  const daysOfWeekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Determine starting offset (0 = Mon, ..., 6 = Sun)
  const startDay = (firstDayOfMonth.getDay() + 6) % 7;

  // Total calendar slots (weeks * 7)
  const totalSlots = Math.ceil((startDay + daysInMonth) / 7) * 7;
  const numWeeks = totalSlots / 7;

  // Color Classifier
  const getCellColor = (record?: DailyAttendanceRecord, isCurrentOrPast?: boolean, isSunday?: boolean) => {
    if (!record) {
      if (!isCurrentOrPast) return 'bg-[#F0F2F5] border-[#E4E7EB] opacity-40'; // Future
      if (isSunday) return 'bg-[#F7F8FA] border-[#E4E7EB]'; // Rest day
      return 'bg-rose-50 border-rose-200 text-rose-600'; // Unmarked absent
    }

    const status = record.daily_status?.toUpperCase();
    const hours = Number(record.hours_worked || 0);

    if (status === 'OVERTIME' || hours >= 8.5) {
      return 'bg-[#16A34A] border-[#15803D] text-white'; // Deep green (8h+ / Overtime)
    }
    if (status === 'PRESENT' || hours >= 7.5) {
      return 'bg-[#2FA84F] border-[#23863E] text-white'; // SPTech Accent green
    }
    if (status === 'LATE') {
      return 'bg-[#F59E0B] border-[#D97706] text-white'; // Amber late
    }
    if (status === 'HALF_DAY' || (hours > 0 && hours < 6)) {
      return 'bg-[#38BDF8] border-[#0284C7] text-white'; // Sky blue half day
    }
    if (status === 'ON_LEAVE' || status === 'LEAVE') {
      return 'bg-[#A855F7] border-[#7E22CE] text-white'; // Purple leave
    }
    if (status === 'ABSENT') {
      return 'bg-[#EF4444] border-[#DC2626] text-white'; // Red absent
    }

    return 'bg-[#2FA84F] border-[#23863E] text-white';
  };

  const handlePrevMonth = () => {
    if (!onMonthChange) return;
    const prev = new Date(year, monthIndex - 1, 1);
    const mStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(mStr);
  };

  const handleNextMonth = () => {
    if (!onMonthChange) return;
    const next = new Date(year, monthIndex + 1, 1);
    const mStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(mStr);
  };

  return (
    <div className="bg-white border border-[#E4E7EB] rounded-2xl p-5 shadow-2xs space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4E7EB]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A73C7]/10 border border-[#1A73C7]/20 flex items-center justify-center text-[#1A73C7]">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-[#1A1D23]">{employee.name}</h3>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-[#E4E7EB]">
                {employee.employee_code}
              </span>
              {employee.department && (
                <span className="text-xs text-slate-500">• {employee.department}</span>
              )}
            </div>
            <p className="text-xs text-slate-500">Monthly Attendance Activity Heatmap</p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-[#E4E7EB] hover:bg-[#F7F8FA] text-slate-600 transition"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-[#0F4C81] px-2 min-w-[130px] text-center">
            {monthName}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-[#E4E7EB] hover:bg-[#F7F8FA] text-slate-600 transition"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-[#F7F8FA] border border-[#E4E7EB]">
          <span className="text-[11px] text-slate-500 font-medium block">Days Present</span>
          <span className="text-base font-bold text-[#2FA84F]">
            {presentDays} <span className="text-xs font-normal text-slate-400">/ {daysInMonth}</span>
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#F7F8FA] border border-[#E4E7EB]">
          <span className="text-[11px] text-slate-500 font-medium block">Total Hours</span>
          <span className="text-base font-bold text-[#0F4C81]">{totalHours.toFixed(1)}h</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#F7F8FA] border border-[#E4E7EB]">
          <span className="text-[11px] text-slate-500 font-medium block">Overtime (OT)</span>
          <span className="text-base font-bold text-[#16A34A]">{totalOt.toFixed(1)}h</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#F7F8FA] border border-[#E4E7EB]">
          <span className="text-[11px] text-slate-500 font-medium block">Late Punches</span>
          <span className="text-base font-bold text-[#F59E0B]">{lateDays}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#F7F8FA] border border-[#E4E7EB]">
          <span className="text-[11px] text-slate-500 font-medium block">Half Days</span>
          <span className="text-base font-bold text-[#38BDF8]">{halfDays}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#F7F8FA] border border-[#E4E7EB]">
          <span className="text-[11px] text-slate-500 font-medium block">Leaves / Absent</span>
          <span className="text-base font-bold text-slate-700">
            {leaveDays} <span className="text-xs text-slate-400">lv</span> / {absentDays} <span className="text-xs text-rose-500">ab</span>
          </span>
        </div>
      </div>

      {/* GitHub-Style Contribution Heatmap Matrix */}
      <div className="relative overflow-x-auto pt-2 pb-1">
        <div className="min-w-[500px]">
          {/* Week Column Labels */}
          <div className="flex mb-1 ml-10 text-[10px] font-semibold text-slate-400">
            {Array.from({ length: numWeeks }).map((_, wIdx) => (
              <div key={wIdx} className="w-10 text-center">
                W{wIdx + 1}
              </div>
            ))}
          </div>

          {/* 7 Rows for Days of Week */}
          <div className="space-y-1">
            {daysOfWeekLabels.map((dayLabel, rIdx) => (
              <div key={dayLabel} className="flex items-center">
                {/* Row Header */}
                <div className="w-10 text-[11px] font-semibold text-slate-500 shrink-0">
                  {dayLabel}
                </div>

                {/* Week Cells */}
                <div className="flex space-x-1">
                  {Array.from({ length: numWeeks }).map((_, wIdx) => {
                    const slotIndex = wIdx * 7 + rIdx;
                    const dayNum = slotIndex - startDay + 1;
                    const isValidDay = dayNum >= 1 && dayNum <= daysInMonth;

                    if (!isValidDay) {
                      return (
                        <div
                          key={wIdx}
                          className="w-9 h-9 rounded-lg border border-transparent bg-transparent"
                        />
                      );
                    }

                    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const record = attendanceMap.get(dateStr);
                    const cellDate = new Date(year, monthIndex, dayNum);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isCurrentOrPast = cellDate <= today;
                    const isToday = cellDate.getTime() === today.getTime();
                    const isSunday = rIdx === 6;

                    const colorClass = getCellColor(record, isCurrentOrPast, isSunday);

                    return (
                      <div
                        key={wIdx}
                        onClick={() => onSelectDay && onSelectDay(dateStr, record)}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredDay({
                            date: dateStr,
                            dayNum,
                            record,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-9 h-9 rounded-lg border flex flex-col items-center justify-center font-mono text-[11px] font-bold cursor-pointer transition-transform hover:scale-110 hover:z-20 relative select-none shadow-2xs ${colorClass} ${
                          isToday ? 'ring-2 ring-[#1A73C7] ring-offset-1' : ''
                        }`}
                      >
                        <span>{dayNum}</span>
                        {record?.hours_worked && (
                          <span className="text-[8px] font-normal opacity-90 leading-none">
                            {Number(record.hours_worked).toFixed(0)}h
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Tooltip */}
        {hoveredDay && (
          <div
            className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-2 bg-[#1A1D23] text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 w-60 animate-in fade-in zoom-in-95 duration-100"
            style={{ left: hoveredDay.x, top: hoveredDay.y }}
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
              <span className="font-bold text-white">
                {new Date(hoveredDay.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  hoveredDay.record?.daily_status === 'PRESENT'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : hoveredDay.record?.daily_status === 'LATE'
                    ? 'bg-amber-500/20 text-amber-400'
                    : hoveredDay.record?.daily_status === 'HALF_DAY'
                    ? 'bg-sky-500/20 text-sky-400'
                    : hoveredDay.record?.daily_status === 'ON_LEAVE'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {hoveredDay.record?.daily_status || 'NOT RECORDED'}
              </span>
            </div>

            {hoveredDay.record ? (
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Worked:</span>
                  <span className="font-bold text-white">
                    {hoveredDay.record.hours_worked || 0} hrs
                    {hoveredDay.record.ot_hours ? ` (${hoveredDay.record.ot_hours}h OT)` : ''}
                  </span>
                </div>
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-slate-400">In / Out:</span>
                  <span>
                    {hoveredDay.record.morning_in ? hoveredDay.record.morning_in.slice(0, 5) : '--:--'} →{' '}
                    {hoveredDay.record.evening_out ? hoveredDay.record.evening_out.slice(0, 5) : '--:--'}
                  </span>
                </div>
                {hoveredDay.record.lunch_out && (
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-slate-400">Lunch Break:</span>
                    <span>
                      {hoveredDay.record.lunch_out.slice(0, 5)} - {hoveredDay.record.lunch_in ? hoveredDay.record.lunch_in.slice(0, 5) : '--:--'}
                    </span>
                  </div>
                )}
                {hoveredDay.record.is_manual_override && (
                  <div className="text-[10px] text-amber-300 italic">
                    * Admin Override Applied
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">No attendance registered for this day.</p>
            )}
          </div>
        )}
      </div>

      {/* Color Code Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs pt-3 border-t border-[#E4E7EB] text-slate-500 gap-2">
        <span className="text-[11px] font-semibold text-slate-600">Activity Levels:</span>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#16A34A] border border-[#15803D]" />
            <span>Full Shift (8h+)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#2FA84F] border border-[#23863E]" />
            <span>Standard Present</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#F59E0B] border border-[#D97706]" />
            <span>Late Arrival</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#38BDF8] border border-[#0284C7]" />
            <span>Half Day</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#A855F7] border border-[#7E22CE]" />
            <span>Leave</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300 text-rose-600" />
            <span>Absent</span>
          </div>
        </div>
      </div>
    </div>
  );
};
