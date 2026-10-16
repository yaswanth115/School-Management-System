import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  Search,
  Users,
  ShieldAlert,
  Edit2,
  FileSpreadsheet,
  Check,
  X,
  Phone,
  Mail,
  UserCheck,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  SchoolClass,
  Section,
  AttendanceRegister,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceMatrixResponse,
  SectionMonthlyAttendanceStats,
  StudentAttendanceSummary,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';

// Modals
import { AttendanceCorrectionModal } from './AttendanceCorrectionModal';

export const AttendanceManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrPrincipal = user?.role === 'ADMIN' || user?.role === 'PRINCIPAL';

  const [activeTab, setActiveTab] = useState<'register' | 'matrix' | 'low_attendance' | 'explorer'>('register');

  // Metadata
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  // Tab 1: Daily Register State
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [register, setRegister] = useState<AttendanceRegister | null>(null);
  const [editedRecords, setEditedRecords] = useState<
    Record<string, { status: AttendanceStatus; remarks: string }>
  >({});
  const [isLoadingRegister, setIsLoadingRegister] = useState(false);
  const [isSavingRegister, setIsSavingRegister] = useState(false);

  // Tab 2: Monthly Matrix State
  const [matrixYear, setMatrixYear] = useState<number>(new Date().getFullYear());
  const [matrixMonth, setMatrixMonth] = useState<number>(new Date().getMonth() + 1);
  const [matrixData, setMatrixData] = useState<AttendanceMatrixResponse | null>(null);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);

  // Tab 3: Low Attendance Alerts State
  const [monthlyStats, setMonthlyStats] = useState<SectionMonthlyAttendanceStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Tab 4: Student Attendance Explorer
  const [explorerSearch, setExplorerSearch] = useState('');
  const [explorerStudentId, setExplorerStudentId] = useState<string>('');
  const [studentHistory, setStudentHistory] = useState<any | null>(null);
  const [isLoadingStudentHistory, setIsLoadingStudentHistory] = useState(false);

  // Modal State
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<AttendanceRecord | null>(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load classes initially
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await apiClient.get<SchoolClass[]>('/academics/classes');
        setClasses(res.data);
        if (res.data.length > 0) {
          setSelectedClassId(res.data[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load classes for attendance:', err);
      }
    };
    fetchClasses();
  }, []);

  // Update sections when selectedClassId or classes changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      return;
    }

    const foundClass = classes.find((c) => c.id === selectedClassId);
    if (foundClass && foundClass.sections && foundClass.sections.length > 0) {
      setSections(foundClass.sections);
      setSelectedSectionId(foundClass.sections[0].id);
    } else {
      const fetchSections = async () => {
        try {
          const res = await apiClient.get<Section[]>(`/academics/sections?class_id=${selectedClassId}`);
          setSections(res.data);
          if (res.data.length > 0) {
            setSelectedSectionId(res.data[0].id);
          } else {
            setSelectedSectionId('');
          }
        } catch (err: any) {
          console.error('Failed to load sections for attendance:', err);
          setSections([]);
          setSelectedSectionId('');
        }
      };
      fetchSections();
    }
  }, [selectedClassId, classes]);

  // Load Daily Attendance Register
  const loadDailyRegister = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId || !attendanceDate) {
      setRegister(null);
      setEditedRecords({});
      return;
    }

    try {
      setIsLoadingRegister(true);
      const res = await apiClient.get<AttendanceRegister>(
        `/attendance/register?class_id=${selectedClassId}&section_id=${selectedSectionId}&attendance_date=${attendanceDate}`
      );
      setRegister(res.data);

      // Prepopulate local state
      const initialMap: Record<string, { status: AttendanceStatus; remarks: string }> = {};
      res.data.records.forEach((rec) => {
        initialMap[rec.student_id] = {
          status: rec.status,
          remarks: rec.remarks || '',
        };
      });
      setEditedRecords(initialMap);
    } catch (err: any) {
      console.error('Failed to load daily attendance register:', err);
      setNotification({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to load attendance register.',
      });
      setRegister(null);
    } finally {
      setIsLoadingRegister(false);
    }
  }, [selectedClassId, selectedSectionId, attendanceDate]);

  useEffect(() => {
    if (activeTab === 'register' && selectedClassId && selectedSectionId) {
      loadDailyRegister();
    }
  }, [activeTab, selectedClassId, selectedSectionId, attendanceDate, loadDailyRegister]);

  // Quick Action: Mark All Present
  const handleMarkAllPresent = () => {
    if (!register || register.is_submitted) return;
    setEditedRecords((prev) => {
      const updated = { ...prev };
      register.records.forEach((r) => {
        updated[r.student_id] = {
          status: 'PRESENT',
          remarks: updated[r.student_id]?.remarks || '',
        };
      });
      return updated;
    });
  };

  // Quick Action: Mark All Absent
  const handleClearAll = () => {
    if (!register || register.is_submitted) return;
    setEditedRecords((prev) => {
      const updated = { ...prev };
      register.records.forEach((r) => {
        updated[r.student_id] = {
          status: 'ABSENT',
          remarks: updated[r.student_id]?.remarks || '',
        };
      });
      return updated;
    });
  };

  // Submit Daily Register
  const handleSaveRegister = async () => {
    if (!register || !selectedClassId || !selectedSectionId) return;

    const payloadRecords = register.records.map((r) => ({
      student_id: r.student_id,
      status: editedRecords[r.student_id]?.status || 'PRESENT',
      remarks: editedRecords[r.student_id]?.remarks.trim() || undefined,
    }));

    try {
      setIsSavingRegister(true);
      await apiClient.post('/attendance/register', {
        class_id: selectedClassId,
        section_id: selectedSectionId,
        attendance_date: attendanceDate,
        notes: register.notes || undefined,
        records: payloadRecords,
      });

      setNotification({
        type: 'success',
        text: `Classroom attendance successfully recorded for ${attendanceDate}!`,
      });
      loadDailyRegister();
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to save attendance register.',
      });
    } finally {
      setIsSavingRegister(false);
    }
  };

  // Load Monthly Matrix (Tab 2)
  const loadMonthlyMatrix = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId) return;

    try {
      setIsLoadingMatrix(true);
      const res = await apiClient.get<AttendanceMatrixResponse>(
        `/attendance/matrix?class_id=${selectedClassId}&section_id=${selectedSectionId}&year=${matrixYear}&month=${matrixMonth}`
      );
      setMatrixData(res.data);
    } catch (err: any) {
      console.error('Failed to load monthly attendance matrix:', err);
    } finally {
      setIsLoadingMatrix(false);
    }
  }, [selectedClassId, selectedSectionId, matrixYear, matrixMonth]);

  useEffect(() => {
    if (activeTab === 'matrix') {
      loadMonthlyMatrix();
    }
  }, [activeTab, loadMonthlyMatrix]);

  // Load Low Attendance Alerts (Tab 3)
  const loadLowAttendanceStats = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId) return;

    try {
      setIsLoadingStats(true);
      const res = await apiClient.get<SectionMonthlyAttendanceStats>(
        `/attendance/monthly-stats?class_id=${selectedClassId}&section_id=${selectedSectionId}&year=${matrixYear}&month=${matrixMonth}`
      );
      setMonthlyStats(res.data);
    } catch (err: any) {
      console.error('Failed to load attendance statistics:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [selectedClassId, selectedSectionId, matrixYear, matrixMonth]);

  useEffect(() => {
    if (activeTab === 'low_attendance') {
      loadLowAttendanceStats();
    }
  }, [activeTab, loadLowAttendanceStats]);

  // Load Student History (Tab 4)
  const handleLoadStudentHistory = async (studentId: string) => {
    try {
      setIsLoadingStudentHistory(true);
      const res = await apiClient.get(`/attendance/students/${studentId}`);
      setStudentHistory(res.data);
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to load student attendance history.',
      });
    } finally {
      setIsLoadingStudentHistory(false);
    }
  };

  // Calculate live counters for Tab 1
  const liveTotal = register?.records.length || 0;
  const livePresent = Object.values(editedRecords).filter((r) => r.status === 'PRESENT').length;
  const liveAbsent = Object.values(editedRecords).filter((r) => r.status === 'ABSENT').length;
  const liveLate = Object.values(editedRecords).filter((r) => r.status === 'LATE').length;
  const liveHalfDay = Object.values(editedRecords).filter((r) => r.status === 'HALF_DAY').length;
  const liveLeave = Object.values(editedRecords).filter((r) => r.status === 'APPROVED_LEAVE').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-7 h-7 text-indigo-600" />
            Attendance Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Conduct daily classroom roll calls, view monthly attendance heatmaps, audit corrections, and detect low-attendance alerts.
          </p>
        </div>
      </div>

      {/* Global Notification Banner */}
      {notification && (
        <Alert
          type={notification.type}
          message={notification.text}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('register')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'register'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Daily Classroom Register
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'matrix'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Monthly Attendance Matrix
          </button>

          <button
            onClick={() => setActiveTab('low_attendance')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'low_attendance'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Low Attendance Alerts (&lt; 75%)
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'explorer'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Student Attendance Explorer
          </button>
        </div>
      </div>

      {/* Global Class & Section Filter Bar */}
      <Card className="p-4 bg-slate-50/70 border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Class Grade</label>
            <select
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
            <select
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={sections.length === 0}
            >
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>

          {activeTab === 'register' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Attendance Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Month</label>
                <select
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={matrixMonth}
                  onChange={(e) => setMatrixMonth(parseInt(e.target.value))}
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December',
                  ].map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Year</label>
                <select
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={matrixYear}
                  onChange={(e) => setMatrixYear(parseInt(e.target.value))}
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ========================================================= */}
      {/* TAB 1: DAILY CLASSROOM REGISTER */}
      {/* ========================================================= */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {isLoadingRegister ? (
            <div className="py-16 flex justify-center">
              <Spinner size="lg" label="Loading student attendance register..." />
            </div>
          ) : !register ? (
            <Card className="py-12 text-center">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Select Class & Section</h3>
              <p className="text-sm text-slate-500 mt-1">
                Choose a class and section to load the daily roll call roster.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Submission Status Alert */}
              {register.is_submitted ? (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-bold text-emerald-900 block">
                        Attendance Already Recorded for {attendanceDate}
                      </span>
                      <span className="text-emerald-700">
                        Recorded by {register.taken_by_name || 'Class Teacher'}. To make authorized modifications,
                        click the &ldquo;Correct&rdquo; button next to a student.
                      </span>
                    </div>
                  </div>
                  <Badge variant="emerald">RECORDED</Badge>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-amber-600 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-bold text-amber-900 block">
                        Unrecorded Attendance — {attendanceDate}
                      </span>
                      <span className="text-amber-800">
                        Review student presence, mark any absentees or late arrivals, and click &ldquo;Save Attendance
                        Register&rdquo;.
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleMarkAllPresent}>
                      Mark All Present
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClearAll}>
                      Clear All
                    </Button>
                  </div>
                </div>
              )}

              {/* Live Status Counter Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 uppercase font-semibold block">Total</span>
                  <span className="text-xl font-bold text-slate-900">{liveTotal}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-xs text-emerald-600 uppercase font-semibold block">Present</span>
                  <span className="text-xl font-bold text-emerald-700">{livePresent}</span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-xs text-rose-600 uppercase font-semibold block">Absent</span>
                  <span className="text-xl font-bold text-rose-700">{liveAbsent}</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-xs text-amber-600 uppercase font-semibold block">Late</span>
                  <span className="text-xl font-bold text-amber-700">{liveLate}</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <span className="text-xs text-blue-600 uppercase font-semibold block">Half Day</span>
                  <span className="text-xl font-bold text-blue-700">{liveHalfDay}</span>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <span className="text-xs text-purple-600 uppercase font-semibold block">Leave</span>
                  <span className="text-xl font-bold text-purple-700">{liveLeave}</span>
                </div>
              </div>

              {/* Roster Table */}
              <Card className="overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                      <tr>
                        <th className="py-3 px-4">Roll No</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Admission No</th>
                        <th className="py-3 px-4">Attendance Status</th>
                        <th className="py-3 px-4">Remarks</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {register.records.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            No active enrolled students found in this section.
                          </td>
                        </tr>
                      ) : (
                        register.records.map((r) => {
                          const current = editedRecords[r.student_id] || {
                            status: r.status,
                            remarks: r.remarks || '',
                          };

                          return (
                            <tr key={r.student_id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-mono text-xs text-slate-600">
                                {r.roll_number || 'N/A'}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900">{r.student_name}</td>
                              <td className="py-3 px-4 font-mono text-xs text-slate-500">
                                {r.admission_number}
                              </td>
                              <td className="py-3 px-4">
                                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                                  {(
                                    [
                                      { key: 'PRESENT', label: 'P', title: 'Present', activeBg: 'bg-emerald-600 text-white' },
                                      { key: 'ABSENT', label: 'A', title: 'Absent', activeBg: 'bg-rose-600 text-white' },
                                      { key: 'LATE', label: 'L', title: 'Late', activeBg: 'bg-amber-500 text-white' },
                                      { key: 'HALF_DAY', label: 'H', title: 'Half Day', activeBg: 'bg-blue-600 text-white' },
                                      { key: 'APPROVED_LEAVE', label: 'E', title: 'Leave', activeBg: 'bg-purple-600 text-white' },
                                    ] as const
                                  ).map((item) => (
                                    <button
                                      key={item.key}
                                      type="button"
                                      title={item.title}
                                      disabled={register.is_submitted}
                                      onClick={() => {
                                        setEditedRecords((prev) => ({
                                          ...prev,
                                          [r.student_id]: {
                                            ...prev[r.student_id],
                                            status: item.key,
                                          },
                                        }));
                                      }}
                                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                        current.status === item.key
                                          ? `${item.activeBg} shadow-sm`
                                          : 'text-slate-600 hover:text-slate-900'
                                      } ${register.is_submitted ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                      {item.label}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100"
                                  placeholder="e.g. Bus delay, Doctor slip"
                                  value={current.remarks}
                                  disabled={register.is_submitted}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditedRecords((prev) => ({
                                      ...prev,
                                      [r.student_id]: {
                                        ...prev[r.student_id],
                                        remarks: val,
                                      },
                                    }));
                                  }}
                                />
                              </td>
                              <td className="py-3 px-4 text-center">
                                {register.is_submitted && r.id ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Edit2 className="w-3.5 h-3.5 text-indigo-600" />}
                                    onClick={() => {
                                      setSelectedRecordForCorrection(r);
                                      setIsCorrectionModalOpen(true);
                                    }}
                                  >
                                    Correct
                                  </Button>
                                ) : (
                                  <span className="text-xs text-slate-400">Ready</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Submit Button */}
                {!register.is_submitted && register.records.length > 0 && (
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Ensure all absentees are verified before recording. Double submissions on the same date are
                      blocked.
                    </span>
                    <Button
                      variant="primary"
                      leftIcon={<Check className="w-4 h-4" />}
                      isLoading={isSavingRegister}
                      onClick={handleSaveRegister}
                    >
                      Save Attendance Register
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MONTHLY ATTENDANCE MATRIX */}
      {/* ========================================================= */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Monthly Heatmap: {matrixMonth}/{matrixYear}
              </h3>
              <p className="text-xs text-slate-500">
                Individual daily records across days of the month.
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <span className="w-3 h-3 rounded bg-emerald-600 inline-block"></span> P (Present)
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                <span className="w-3 h-3 rounded bg-rose-600 inline-block"></span> A (Absent)
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span> L (Late)
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                <span className="w-3 h-3 rounded bg-blue-600 inline-block"></span> H (Half Day)
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-purple-700">
                <span className="w-3 h-3 rounded bg-purple-600 inline-block"></span> E (Leave)
              </span>
            </div>
          </div>

          {isLoadingMatrix ? (
            <div className="py-16 flex justify-center">
              <Spinner size="lg" label="Generating monthly attendance matrix..." />
            </div>
          ) : !matrixData || matrixData.students.length === 0 ? (
            <Card className="py-12 text-center">
              <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No Records Found</h3>
              <p className="text-sm text-slate-500 mt-1">
                No attendance registers found for this class and section in {matrixMonth}/{matrixYear}.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 sticky left-0 bg-slate-100 z-10 border-r border-slate-200">
                        Roll
                      </th>
                      <th className="py-2.5 px-3 sticky left-14 bg-slate-100 z-10 border-r border-slate-200 w-36">
                        Student Name
                      </th>
                      {Array.from({ length: matrixData.days_in_month }, (_, i) => i + 1).map((d) => (
                        <th key={d} className="py-2 px-1 text-center font-mono w-7">
                          {d}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-center border-l border-slate-200">Attended</th>
                      <th className="py-2.5 px-3 text-center">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {matrixData.students.map((st) => (
                      <tr key={st.student_id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                          {st.roll_number || 'N/A'}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 sticky left-14 bg-white z-10 border-r border-slate-200 whitespace-nowrap">
                          {st.student_name}
                        </td>
                        {Array.from({ length: matrixData.days_in_month }, (_, i) => i + 1).map((d) => {
                          const code = st.daily_statuses[d];
                          let badgeClass = 'text-slate-300';
                          if (code === 'P') badgeClass = 'bg-emerald-100 text-emerald-800 font-bold';
                          else if (code === 'A') badgeClass = 'bg-rose-100 text-rose-800 font-bold';
                          else if (code === 'L') badgeClass = 'bg-amber-100 text-amber-800 font-bold';
                          else if (code === 'H') badgeClass = 'bg-blue-100 text-blue-800 font-bold';
                          else if (code === 'E') badgeClass = 'bg-purple-100 text-purple-800 font-bold';

                          return (
                            <td key={d} className="py-1 px-0.5 text-center">
                              {code ? (
                                <span className={`inline-block w-5 h-5 leading-5 rounded text-[10px] ${badgeClass}`}>
                                  {code}
                                </span>
                              ) : (
                                <span className="text-slate-200">&bull;</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center font-semibold text-slate-800 border-l border-slate-200">
                          {st.present_days} / {st.total_days}
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          <span
                            className={
                              st.attendance_percentage < 75
                                ? 'text-rose-600 font-extrabold'
                                : 'text-emerald-700'
                            }
                          >
                            {st.attendance_percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: LOW ATTENDANCE ALERTS (< 75%) */}
      {/* ========================================================= */}
      {activeTab === 'low_attendance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Institutional 75% Attendance Compliance Monitoring
            </h3>
          </div>

          {isLoadingStats ? (
            <div className="py-16 flex justify-center">
              <Spinner size="lg" label="Scanning attendance compliance records..." />
            </div>
          ) : !monthlyStats ? (
            <Card className="py-12 text-center">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No Data Available</h3>
              <p className="text-sm text-slate-500 mt-1">
                Select a class and section to evaluate attendance compliance.
              </p>
            </Card>
          ) : monthlyStats.low_attendance_students.length === 0 ? (
            <Card className="py-12 text-center bg-emerald-50/50 border-emerald-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-emerald-950">
                100% Attendance Compliance!
              </h3>
              <p className="text-sm text-emerald-700 mt-1 max-w-md mx-auto">
                All enrolled students in {monthlyStats.class_name} ({monthlyStats.section_name}) have maintained above
                the mandatory 75% attendance threshold for {matrixMonth}/{matrixYear}.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-bold text-rose-900 block">
                    {monthlyStats.low_attendance_students.length} Student(s) Falling Below Mandatory 75% Threshold
                  </span>
                  <span className="text-rose-700">
                    Proactive parental notification recommended to avoid examination withholding.
                  </span>
                </div>
              </div>

              <Card className="overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                      <tr>
                        <th className="py-3 px-4">Roll / Adm</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4 text-center">Days Present</th>
                        <th className="py-3 px-4 text-center">Days Absent</th>
                        <th className="py-3 px-4 text-center">Days Late</th>
                        <th className="py-3 px-4 text-center">Attendance %</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {monthlyStats.low_attendance_students.map((st) => (
                        <tr key={st.student_id} className="hover:bg-rose-50/40">
                          <td className="py-3 px-4 font-mono text-xs text-slate-700">
                            {st.roll_number || st.admission_number}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">{st.student_name}</td>
                          <td className="py-3 px-4 text-center font-semibold text-emerald-700">
                            {st.present_days}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-rose-700">{st.absent_days}</td>
                          <td className="py-3 px-4 text-center text-amber-700">{st.late_days}</td>
                          <td className="py-3 px-4 text-center font-extrabold text-rose-600">
                            {st.attendance_percentage}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                              Warning &bull; Below 75%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: STUDENT ATTENDANCE EXPLORER */}
      {/* ========================================================= */}
      {activeTab === 'explorer' && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter Student Admission Number (e.g. ADM-2026-0001)..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={explorerSearch}
                  onChange={(e) => setExplorerSearch(e.target.value)}
                />
              </div>
              <Button
                variant="primary"
                onClick={async () => {
                  if (!explorerSearch.trim()) return;
                  try {
                    const res = await apiClient.get(`/students?search=${explorerSearch.trim()}`);
                    if (res.data.length > 0) {
                      setExplorerStudentId(res.data[0].id);
                      handleLoadStudentHistory(res.data[0].id);
                    } else {
                      setNotification({ type: 'error', text: 'No student found with that identifier.' });
                    }
                  } catch (err: any) {
                    setNotification({ type: 'error', text: 'Failed to search student.' });
                  }
                }}
              >
                Search Student
              </Button>
            </div>
          </Card>

          {isLoadingStudentHistory ? (
            <div className="py-16 flex justify-center">
              <Spinner size="lg" label="Loading student attendance history..." />
            </div>
          ) : studentHistory ? (
            <div className="space-y-4">
              {/* Student Summary Header */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wider block">Student Profile</span>
                    <h3 className="text-lg font-bold text-slate-900">{studentHistory.student_name}</h3>
                    <span className="text-xs font-mono text-slate-600">{studentHistory.admission_number}</span>
                  </div>
                  <div>
                    <Badge variant={studentHistory.is_low_attendance ? 'rose' : 'emerald'}>
                      Overall Attendance: {studentHistory.attendance_percentage}%
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500 block">Total Days</span>
                    <span className="text-lg font-bold text-slate-900">{studentHistory.total_days}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-xs text-emerald-600 block">Present</span>
                    <span className="text-lg font-bold text-emerald-700">{studentHistory.present_days}</span>
                  </div>
                  <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200">
                    <span className="text-xs text-rose-600 block">Absent</span>
                    <span className="text-lg font-bold text-rose-700">{studentHistory.absent_days}</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-xs text-amber-600 block">Late</span>
                    <span className="text-lg font-bold text-amber-700">{studentHistory.late_days}</span>
                  </div>
                  <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200">
                    <span className="text-xs text-purple-600 block">Leave</span>
                    <span className="text-lg font-bold text-purple-700">{studentHistory.leave_days}</span>
                  </div>
                </div>
              </div>

              {/* History Timeline Table */}
              <Card className="overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4">Remarks</th>
                        <th className="py-2.5 px-4">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {studentHistory.records.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            {item.attendance_date}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <Badge
                              variant={
                                item.status === 'PRESENT'
                                  ? 'emerald'
                                  : item.status === 'ABSENT'
                                  ? 'rose'
                                  : item.status === 'LATE'
                                  ? 'amber'
                                  : item.status === 'HALF_DAY'
                                  ? 'blue'
                                  : 'purple'
                              }
                            >
                              {item.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-xs text-slate-600 italic">
                            {item.remarks || '--'}
                          </td>
                          <td className="py-2.5 px-4 text-xs text-slate-500">
                            {item.taken_by || 'Staff'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="py-12 text-center">
              <Search className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Search for a Student</h3>
              <p className="text-sm text-slate-500 mt-1">
                Enter an admission number above to inspect complete historical attendance timeline.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Modal: Status Correction */}
      <AttendanceCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => {
          setIsCorrectionModalOpen(false);
          setSelectedRecordForCorrection(null);
        }}
        record={selectedRecordForCorrection}
        onSuccess={() => {
          setNotification({ type: 'success', text: 'Attendance record successfully adjusted.' });
          loadDailyRegister();
        }}
      />
    </div>
  );
};
