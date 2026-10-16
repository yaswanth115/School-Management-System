import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  StudentAcademicProfile,
  ClassWeeklyTimetable,
  StudentReportCard,
  Exam,
} from '../../types';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ReportCardModal } from '../examinations/ReportCardModal';
import {
  GraduationCap,
  Calendar,
  Clock,
  Award,
  CreditCard,
  User,
  BookOpen,
  CheckCircle,
  FileText,
  Printer,
  ShieldCheck,
} from 'lucide-react';

export const StudentPortalPage: React.FC = () => {
  const [profile, setProfile] = useState<StudentAcademicProfile | null>(null);
  const [timetable, setTimetable] = useState<ClassWeeklyTimetable | null>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [invoicesData, setInvoicesData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'timetable' | 'attendance' | 'results' | 'fees'>('timetable');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exam Results & Report Card
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [reportCard, setReportCard] = useState<StudentReportCard | null>(null);
  const [isReportCardModalOpen, setIsReportCardModalOpen] = useState(false);
  const [isLoadingReportCard, setIsLoadingReportCard] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [profRes, ttRes, attRes, invRes, examsRes] = await Promise.all([
        apiClient.get<StudentAcademicProfile>('/student/profile'),
        apiClient.get<ClassWeeklyTimetable>('/student/timetable').catch(() => ({ data: null })),
        apiClient.get('/student/attendance'),
        apiClient.get('/student/invoices'),
        apiClient.get<Exam[]>('/exams').catch(() => ({ data: [] })),
      ]);

      setProfile(profRes.data);
      setTimetable(ttRes.data);
      setAttendance(attRes.data);
      setInvoicesData(invRes.data);
      setExams(examsRes.data || []);

      if (examsRes.data && examsRes.data.length > 0) {
        setSelectedExamId(examsRes.data[0].id);
        fetchReportCard(examsRes.data[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load student portal. Please check login credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReportCard = async (examId: string) => {
    try {
      setIsLoadingReportCard(true);
      const res = await apiClient.get<StudentReportCard>(`/student/report-cards/${examId}`);
      setReportCard(res.data);
    } catch (err) {
      setReportCard(null);
    } finally {
      setIsLoadingReportCard(false);
    }
  };

  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    if (examId) {
      fetchReportCard(examId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" label="Loading student academic profile..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert type="error" message={error} />
      </div>
    );
  }

  if (!profile) return null;

  const attRate = parseFloat(profile.attendance_percentage as any || 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Student Banner Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl border border-indigo-800 text-white p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <GraduationCap className="w-10 h-10 text-white/90" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{profile.full_name}</h1>
                <span className="px-3 py-0.5 bg-indigo-500/30 text-indigo-200 rounded-full text-xs font-semibold border border-indigo-400/30">
                  {profile.admission_number}
                </span>
              </div>
              <p className="text-slate-300 text-sm mt-1">
                Class: <span className="font-semibold text-white">{profile.class_name}</span> &bull; Section:{' '}
                <span className="font-semibold text-white">{profile.section_name}</span>
                {profile.roll_number && (
                  <span> &bull; Roll No: <span className="font-semibold text-white">{profile.roll_number}</span></span>
                )}
                <span> &bull; Academic Year: <span className="font-semibold text-white">{profile.academic_year_name}</span></span>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 px-5 py-3 rounded-xl text-center">
              <span className="block text-[11px] text-slate-300 uppercase font-medium tracking-wider">
                Attendance Rate
              </span>
              <span
                className={`text-xl font-extrabold ${
                  attRate >= 75 ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {attRate.toFixed(1)}%
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 px-5 py-3 rounded-xl text-center">
              <span className="block text-[11px] text-slate-300 uppercase font-medium tracking-wider">
                Fee Status
              </span>
              <span
                className={`text-xl font-extrabold ${
                  parseFloat(profile.outstanding_fee_amount as any || 0) > 0
                    ? 'text-rose-300'
                    : 'text-emerald-300'
                }`}
              >
                {parseFloat(profile.outstanding_fee_amount as any || 0) > 0
                  ? `₹${parseFloat(profile.outstanding_fee_amount as any).toLocaleString('en-IN')} Due`
                  : 'Paid'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('timetable')}
            className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'timetable'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            My Weekly Timetable
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            My Attendance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'results'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            My Exam Results
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fees')}
            className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'fees'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Fee Invoices & Receipts
          </button>
        </div>

        <div className="p-6">
          {/* 1. TIMETABLE TAB */}
          {activeTab === 'timetable' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Class Schedule</h3>
                  <p className="text-xs text-slate-500">
                    {profile.class_name} - {profile.section_name} &bull; Room & Period Timetable
                  </p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                  {timetable?.periods?.length || 0} Periods Scheduled
                </span>
              </div>

              {!timetable || timetable.periods.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No Timetable Configured</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Your class timetable has not been published yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Day</th>
                        <th className="px-4 py-3">Period</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Teacher</th>
                        <th className="px-4 py-3">Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {timetable.periods.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-900">{p.day_of_week}</td>
                          <td className="px-4 py-3 font-semibold text-indigo-700">Period {p.period_number}</td>
                          <td className="px-4 py-3 text-slate-600 font-mono">
                            {p.start_time.slice(0, 5)} - {p.end_time.slice(0, 5)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800">{p.subject_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                              ({p.subject_code})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-medium">{p.teacher_name || 'Instructor'}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {p.room_number ? `Room ${p.room_number}` : 'Assigned Classroom'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 2. ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <span className="block text-xs text-slate-500 font-medium">Total Days</span>
                  <span className="text-2xl font-bold text-slate-900">{attendance?.total_days || 0}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <span className="block text-xs text-emerald-700 font-medium">Present Days</span>
                  <span className="text-2xl font-bold text-emerald-800">{attendance?.present_days || 0}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
                  <span className="block text-xs text-rose-700 font-medium">Absent Days</span>
                  <span className="text-2xl font-bold text-rose-800">{attendance?.absent_days || 0}</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                  <span className="block text-xs text-indigo-700 font-medium">Overall Percentage</span>
                  <span className="text-2xl font-extrabold text-indigo-900">
                    {parseFloat(attendance?.attendance_percentage || 0).toFixed(1)}%
                  </span>
                </div>
              </div>

              {parseFloat(attendance?.attendance_percentage || 0) < 75 && (
                <Alert
                  type="warning"
                  title="Notice: Attendance Below 75%"
                  message="Your attendance is below the mandatory 75% requirement. Please attend classes regularly to avoid examination debarment."
                />
              )}

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {attendance?.records && attendance.records.length > 0 ? (
                      attendance.records.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{r.date}</td>
                          <td className="px-4 py-3">
                            {r.status === 'PRESENT' && <Badge variant="emerald">Present</Badge>}
                            {r.status === 'ABSENT' && <Badge variant="rose">Absent</Badge>}
                            {r.status === 'LATE' && <Badge variant="amber">Late</Badge>}
                            {r.status === 'HALF_DAY' && <Badge variant="blue">Half Day</Badge>}
                            {r.status === 'EXCUSED_LEAVE' && <Badge variant="slate">Excused</Badge>}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{r.remarks || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center py-8 text-slate-400">
                          No attendance logs available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. RESULTS TAB */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Examination:
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => handleExamChange(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} ({ex.exam_type})
                      </option>
                    ))}
                  </select>
                </div>

                {reportCard && (
                  <Button
                    type="button"
                    variant="outline"
                    leftIcon={<Printer className="w-4 h-4 text-slate-600" />}
                    onClick={() => setIsReportCardModalOpen(true)}
                  >
                    View Official Report Card
                  </Button>
                )}
              </div>

              {isLoadingReportCard ? (
                <div className="py-12 flex justify-center">
                  <Spinner size="md" label="Loading examination marks..." />
                </div>
              ) : reportCard ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                      <span className="block text-xs text-slate-500 font-medium">Total Marks</span>
                      <span className="text-xl font-bold text-slate-900">
                        {reportCard.total_marks_obtained} / {reportCard.total_max_marks}
                      </span>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                      <span className="block text-xs text-indigo-700 font-medium">Overall Score</span>
                      <span className="text-xl font-extrabold text-indigo-900">
                        {reportCard.overall_percentage}%
                      </span>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                      <span className="block text-xs text-purple-700 font-medium">Class Rank</span>
                      <span className="text-xl font-extrabold text-purple-900">
                        {reportCard.class_rank ? `#${reportCard.class_rank}` : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                      <span className="block text-xs text-emerald-700 font-medium">Result Status</span>
                      <span className="text-xl font-extrabold text-emerald-800">
                        {reportCard.result_status}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Subject</th>
                          <th className="px-4 py-3">Max Marks</th>
                          <th className="px-4 py-3">Pass Marks</th>
                          <th className="px-4 py-3">Marks Scored</th>
                          <th className="px-4 py-3">Percentage</th>
                          <th className="px-4 py-3">Grade</th>
                          <th className="px-4 py-3">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {reportCard.subjects.map((sub) => (
                          <tr key={sub.subject_id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-900">{sub.subject_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                                ({sub.subject_code})
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{sub.max_marks}</td>
                            <td className="px-4 py-3 text-slate-600">{sub.pass_marks}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {sub.is_absent ? (
                                <span className="text-rose-600">ABSENT</span>
                              ) : (
                                sub.marks_obtained
                              )}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              {sub.percentage ? `${sub.percentage}%` : '—'}
                            </td>
                            <td className="px-4 py-3 font-bold text-indigo-700">
                              {sub.grade || '—'}
                            </td>
                            <td className="px-4 py-3">
                              {sub.is_passed ? (
                                <Badge variant="emerald">Passed</Badge>
                              ) : (
                                <Badge variant="rose">Needs Improvement</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                  <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No Published Marks Found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Marks for this examination have not been published by the administration yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 4. FEES TAB */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <span className="block text-xs text-slate-500 font-medium uppercase tracking-wider">
                    Total Invoiced
                  </span>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    ₹{(invoicesData?.total_invoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <span className="block text-xs text-emerald-700 font-medium uppercase tracking-wider">
                    Total Paid
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-800 mt-1 block">
                    ₹{(invoicesData?.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <span className="block text-xs text-rose-700 font-medium uppercase tracking-wider">
                    Outstanding Balance
                  </span>
                  <span className="text-2xl font-extrabold text-rose-700 mt-1 block">
                    ₹{(invoicesData?.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-3">Issued Fee Invoices</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Invoice #</th>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Total Amount</th>
                        <th className="px-4 py-3">Paid Amount</th>
                        <th className="px-4 py-3">Balance</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {invoicesData?.invoices && invoicesData.invoices.length > 0 ? (
                        invoicesData.invoices.map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">
                              {inv.invoice_number}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{inv.title}</td>
                            <td className="px-4 py-3 text-slate-700">
                              ₹{inv.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-emerald-700 font-medium">
                              ₹{inv.paid_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              ₹{inv.balance_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-slate-500">{inv.due_date}</td>
                            <td className="px-4 py-3">
                              {inv.status === 'PAID' && <Badge variant="emerald">Paid</Badge>}
                              {inv.status === 'PARTIALLY_PAID' && (
                                <Badge variant="amber">Partially Paid</Badge>
                              )}
                              {inv.status === 'UNPAID' && <Badge variant="rose">Unpaid</Badge>}
                              {inv.status === 'OVERDUE' && <Badge variant="rose">Overdue</Badge>}
                              {inv.status === 'CANCELLED' && <Badge variant="slate">Cancelled</Badge>}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-400">
                            No invoices recorded for your account.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Official Report Card Printable Modal */}
      {reportCard && (
        <ReportCardModal
          isOpen={isReportCardModalOpen}
          onClose={() => setIsReportCardModalOpen(false)}
          reportCard={reportCard}
        />
      )}
    </div>
  );
};
