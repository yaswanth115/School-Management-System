import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  ChildSummary,
  ClassWeeklyTimetable,
  StudentReportCard,
  Exam,
  OnlinePaymentResponse,
} from '../../types';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ReportCardModal } from '../examinations/ReportCardModal';
import { OnlineFeePaymentModal } from './OnlineFeePaymentModal';
import {
  Users,
  GraduationCap,
  Calendar,
  CreditCard,
  Award,
  Clock,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  ShieldCheck,
  ChevronRight,
  Printer,
} from 'lucide-react';

export const ParentPortalPage: React.FC = () => {
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timetable' | 'attendance' | 'exams' | 'fees'>('overview');

  // Loading & error states
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [isLoadingChildData, setIsLoadingChildData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Child data states
  const [profileData, setProfileData] = useState<any>(null);
  const [timetableData, setTimetableData] = useState<ClassWeeklyTimetable | null>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [invoicesData, setInvoicesData] = useState<any>(null);

  // Exams & Report Card states
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [reportCard, setReportCard] = useState<StudentReportCard | null>(null);
  const [isReportCardModalOpen, setIsReportCardModalOpen] = useState(false);
  const [isLoadingReportCard, setIsLoadingReportCard] = useState(false);

  // Online Fee Payment Modal states
  const [selectedInvoiceToPay, setSelectedInvoiceToPay] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Fetch children list on mount
  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      setIsLoadingChildren(true);
      setError(null);
      const res = await apiClient.get<ChildSummary[]>('/parent/children');
      setChildren(res.data);
      if (res.data.length > 0 && !selectedChildId) {
        setSelectedChildId(res.data[0].student_id);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load linked children. Please try again.');
    } finally {
      setIsLoadingChildren(false);
    }
  };

  // Fetch selected child data when child or tab changes
  useEffect(() => {
    if (selectedChildId) {
      fetchChildData(selectedChildId);
    }
  }, [selectedChildId]);

  const fetchChildData = async (childId: string) => {
    try {
      setIsLoadingChildData(true);
      const [profRes, ttRes, attRes, invRes, examsRes] = await Promise.all([
        apiClient.get(`/parent/children/${childId}/profile`),
        apiClient.get<ClassWeeklyTimetable>(`/parent/children/${childId}/timetable`).catch(() => ({ data: null })),
        apiClient.get(`/parent/children/${childId}/attendance`),
        apiClient.get(`/parent/children/${childId}/invoices`),
        apiClient.get<Exam[]>('/exams').catch(() => ({ data: [] })),
      ]);

      setProfileData(profRes.data);
      setTimetableData(ttRes.data);
      setAttendanceData(attRes.data);
      setInvoicesData(invRes.data);
      setExams(examsRes.data || []);

      if (examsRes.data && examsRes.data.length > 0) {
        setSelectedExamId(examsRes.data[0].id);
        fetchReportCard(childId, examsRes.data[0].id);
      } else {
        setReportCard(null);
      }
    } catch (err: any) {
      console.error('Failed to load child portal data', err);
    } finally {
      setIsLoadingChildData(false);
    }
  };

  const fetchReportCard = async (childId: string, examId: string) => {
    try {
      setIsLoadingReportCard(true);
      const res = await apiClient.get<StudentReportCard>(`/parent/children/${childId}/report-cards/${examId}`);
      setReportCard(res.data);
    } catch (err) {
      setReportCard(null);
    } finally {
      setIsLoadingReportCard(false);
    }
  };

  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    if (selectedChildId && examId) {
      fetchReportCard(selectedChildId, examId);
    }
  };

  const handleOpenPayment = (invoice: any) => {
    setSelectedInvoiceToPay(invoice);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (res: OnlinePaymentResponse) => {
    // Refresh invoices and children list
    if (selectedChildId) {
      apiClient.get(`/parent/children/${selectedChildId}/invoices`).then((r) => setInvoicesData(r.data));
      fetchChildren();
    }
  };

  const selectedChild = children.find((c) => c.student_id === selectedChildId);

  if (isLoadingChildren) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" label="Loading parent portal..." />
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

  if (children.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center bg-white rounded-2xl border border-slate-200 p-12">
        <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">No Linked Students Found</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Your parent user account is not currently linked to any enrolled students in the school database. Please contact school administration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600" />
            Parent Portal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor real-time academic progress, daily attendance, class schedules, and fee invoices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200">
            {children.length} Linked {children.length === 1 ? 'Child' : 'Children'}
          </span>
        </div>
      </div>

      {/* Multi-Child Switcher Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children.map((child) => {
          const isSelected = child.student_id === selectedChildId;
          const attRate = parseFloat(child.attendance_percentage as any) || 0;
          const outstandingFee = parseFloat(child.outstanding_fee_amount as any) || 0;

          return (
            <button
              key={child.student_id}
              type="button"
              onClick={() => setSelectedChildId(child.student_id)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-600 rounded-bl-lg" />
              )}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                  {child.photo_url ? (
                    <img
                      src={child.photo_url}
                      alt={child.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <GraduationCap className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">{child.full_name}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {child.class_name} • {child.section_name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{child.admission_number}</p>
                </div>
              </div>

              {/* Quick Status Badges */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Attendance:</span>
                  <span
                    className={`font-bold ${
                      attRate >= 75 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {attRate.toFixed(1)}%
                  </span>
                </div>
                <div>
                  {outstandingFee > 0 ? (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[11px]">
                      ₹{outstandingFee.toLocaleString('en-IN')} Due
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">
                      Fees Paid
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Child Details & Tabs Section */}
      {selectedChild && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Child Profile Top Bar */}
          <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                {selectedChild.photo_url ? (
                  <img
                    src={selectedChild.photo_url}
                    alt={selectedChild.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <GraduationCap className="w-8 h-8 text-white/80" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold">{selectedChild.full_name}</h2>
                  <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-200 rounded-full text-xs font-semibold border border-indigo-400/30">
                    {selectedChild.admission_number}
                  </span>
                </div>
                <p className="text-slate-300 text-sm mt-0.5">
                  Class: <span className="font-semibold text-white">{selectedChild.class_name}</span> &bull; Section:{' '}
                  <span className="font-semibold text-white">{selectedChild.section_name}</span>
                  {selectedChild.roll_number && (
                    <span> &bull; Roll No: <span className="font-semibold text-white">{selectedChild.roll_number}</span></span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick KPI stats */}
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-xl text-center">
                <span className="block text-[11px] text-slate-300 font-medium uppercase tracking-wider">Attendance</span>
                <span className="text-base font-extrabold text-emerald-300">
                  {parseFloat(selectedChild.attendance_percentage as any || 0).toFixed(1)}%
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-xl text-center">
                <span className="block text-[11px] text-slate-300 font-medium uppercase tracking-wider">Fee Balance</span>
                <span
                  className={`text-base font-extrabold ${
                    parseFloat(selectedChild.outstanding_fee_amount as any || 0) > 0
                      ? 'text-rose-300'
                      : 'text-emerald-300'
                  }`}
                >
                  ₹{parseFloat(selectedChild.outstanding_fee_amount as any || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-slate-200 bg-slate-50 px-6 flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              Overview & KPIs
            </button>
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
              Class Timetable
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
              Attendance History
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('exams')}
              className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'exams'
                  ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4" />
              Exams & Report Card
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
              Fees & Online Pay
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-6">
            {isLoadingChildData ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size="md" label="Loading student records..." />
              </div>
            ) : (
              <>
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Academic Info */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                          <BookOpen className="w-4 h-4" />
                          Academic Information
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-500">Class & Section:</span>
                            <span className="font-semibold text-slate-900">
                              {selectedChild.class_name} - {selectedChild.section_name}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-500">Roll Number:</span>
                            <span className="font-semibold text-slate-900">{selectedChild.roll_number || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-500">Admission Number:</span>
                            <span className="font-semibold text-slate-900">{selectedChild.admission_number}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-slate-500">Admission Date:</span>
                            <span className="font-semibold text-slate-900">
                              {profileData?.admission_date || '2026-06-01'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Personal Info */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                          <User className="w-4 h-4" />
                          Personal Profile
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-500">Date of Birth:</span>
                            <span className="font-semibold text-slate-900">{profileData?.date_of_birth || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-500">Gender:</span>
                            <span className="font-semibold text-slate-900">{profileData?.gender || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-500">Blood Group:</span>
                            <span className="font-semibold text-slate-900">{profileData?.blood_group || 'O+'}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-slate-500">Status:</span>
                            <Badge variant="emerald">Active Enrolled</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Financial Quick Card */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                          <CreditCard className="w-4 h-4" />
                          Fee Payment Status
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-500">Total Invoiced:</span>
                            <span className="font-semibold text-slate-900">
                              ₹{(invoicesData?.total_invoiced || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-500">Total Paid:</span>
                            <span className="font-semibold text-emerald-700">
                              ₹{(invoicesData?.total_paid || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-500">Outstanding Due:</span>
                            <span className="font-bold text-rose-600">
                              ₹{(invoicesData?.total_outstanding || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="pt-2">
                            <Button
                              type="button"
                              size="sm"
                              className="w-full"
                              onClick={() => setActiveTab('fees')}
                            >
                              Manage & Pay Fees
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. TIMETABLE TAB */}
                {activeTab === 'timetable' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">Weekly Class Timetable</h3>
                        <p className="text-xs text-slate-500">
                          {selectedChild.class_name} - {selectedChild.section_name} &bull; Academic Year:{' '}
                          {timetableData?.academic_year_name || '2026-2027'}
                        </p>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                        {timetableData?.periods?.length || 0} Scheduled Periods
                      </span>
                    </div>

                    {!timetableData || timetableData.periods.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                        <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700">No Timetable Configured</p>
                        <p className="text-xs text-slate-500 mt-1">
                          A period schedule has not yet been published for this class section.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                          <thead className="bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3">Day</th>
                              <th className="px-4 py-3">Period</th>
                              <th className="px-4 py-3">Timing</th>
                              <th className="px-4 py-3">Subject</th>
                              <th className="px-4 py-3">Instructor</th>
                              <th className="px-4 py-3">Room</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {timetableData.periods.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-4 py-3 font-bold text-slate-900">
                                  {p.day_of_week}
                                </td>
                                <td className="px-4 py-3 font-semibold text-indigo-700">
                                  Period {p.period_number}
                                </td>
                                <td className="px-4 py-3 text-slate-600 font-mono">
                                  {p.start_time.slice(0, 5)} - {p.end_time.slice(0, 5)}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-semibold text-slate-800">{p.subject_name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                                    ({p.subject_code})
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-700 font-medium">
                                  {p.teacher_name || 'Class Instructor'}
                                </td>
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

                {/* 3. ATTENDANCE TAB */}
                {activeTab === 'attendance' && (
                  <div className="space-y-6">
                    {/* Attendance Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                        <span className="block text-xs text-slate-500 font-medium">Total Days</span>
                        <span className="text-2xl font-bold text-slate-900">
                          {attendanceData?.total_days || 0}
                        </span>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                        <span className="block text-xs text-emerald-700 font-medium">Present Days</span>
                        <span className="text-2xl font-bold text-emerald-800">
                          {attendanceData?.present_days || 0}
                        </span>
                      </div>
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
                        <span className="block text-xs text-rose-700 font-medium">Absent Days</span>
                        <span className="text-2xl font-bold text-rose-800">
                          {attendanceData?.absent_days || 0}
                        </span>
                      </div>
                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                        <span className="block text-xs text-indigo-700 font-medium">Attendance Rate</span>
                        <span className="text-2xl font-extrabold text-indigo-900">
                          {parseFloat(attendanceData?.attendance_percentage || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Low Attendance Warning */}
                    {parseFloat(attendanceData?.attendance_percentage || 0) < 75 && (
                      <Alert
                        type="warning"
                        title="Low Attendance Alert (< 75%)"
                        message="Your child's attendance is currently below the mandatory institutional threshold of 75%. Please ensure regular attendance to remain eligible for examinations."
                      />
                    )}

                    {/* Records Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Remark / Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {attendanceData?.records && attendanceData.records.length > 0 ? (
                            attendanceData.records.map((r: any) => (
                              <tr key={r.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-semibold text-slate-900">{r.date}</td>
                                <td className="px-4 py-3">
                                  {r.status === 'PRESENT' && <Badge variant="emerald">Present</Badge>}
                                  {r.status === 'ABSENT' && <Badge variant="rose">Absent</Badge>}
                                  {r.status === 'LATE' && <Badge variant="amber">Late</Badge>}
                                  {r.status === 'HALF_DAY' && <Badge variant="blue">Half Day</Badge>}
                                  {r.status === 'EXCUSED_LEAVE' && <Badge variant="slate">Excused Leave</Badge>}
                                </td>
                                <td className="px-4 py-3 text-slate-500">{r.remarks || '—'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="text-center py-8 text-slate-400">
                                No attendance records found for this period.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. EXAMS & REPORT CARD TAB */}
                {activeTab === 'exams' && (
                  <div className="space-y-6">
                    {/* Exam Selector */}
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
                          View / Print Official Report Card
                        </Button>
                      )}
                    </div>

                    {isLoadingReportCard ? (
                      <div className="py-12 flex justify-center">
                        <Spinner size="md" label="Loading examination marks..." />
                      </div>
                    ) : reportCard ? (
                      <div className="space-y-6">
                        {/* Summary Badges Banner */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                            <span className="block text-xs text-slate-500 font-medium">Total Score</span>
                            <span className="text-xl font-bold text-slate-900">
                              {reportCard.total_marks_obtained} / {reportCard.total_max_marks}
                            </span>
                          </div>
                          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                            <span className="block text-xs text-indigo-700 font-medium">Percentage</span>
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

                        {/* Subject Marks Breakdown Table */}
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
                                <th className="px-4 py-3">Status</th>
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
                          Marks for this examination have not been published by the academic board yet.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. FEES & PAYMENTS TAB */}
                {activeTab === 'fees' && (
                  <div className="space-y-6">
                    {/* Financial KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <span className="block text-xs text-slate-500 font-medium uppercase tracking-wider">
                          Total Invoiced Amount
                        </span>
                        <span className="text-2xl font-bold text-slate-900 mt-1 block">
                          ₹{(invoicesData?.total_invoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <span className="block text-xs text-emerald-700 font-medium uppercase tracking-wider">
                          Total Amount Paid
                        </span>
                        <span className="text-2xl font-extrabold text-emerald-800 mt-1 block">
                          ₹{(invoicesData?.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                        <span className="block text-xs text-rose-700 font-medium uppercase tracking-wider">
                          Outstanding Balance Due
                        </span>
                        <span className="text-2xl font-extrabold text-rose-700 mt-1 block">
                          ₹{(invoicesData?.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Invoices List */}
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm mb-3">Fee Invoices & Bills</h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                          <thead className="bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3">Invoice #</th>
                              <th className="px-4 py-3">Title</th>
                              <th className="px-4 py-3">Total Amount</th>
                              <th className="px-4 py-3">Paid</th>
                              <th className="px-4 py-3">Balance</th>
                              <th className="px-4 py-3">Due Date</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Action</th>
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
                                  <td className="px-4 py-3 text-right">
                                    {inv.balance_amount > 0 && inv.status !== 'CANCELLED' ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="primary"
                                        leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                                        onClick={() => handleOpenPayment(inv)}
                                      >
                                        Pay Online
                                      </Button>
                                    ) : (
                                      <span className="text-emerald-600 font-semibold text-xs flex items-center justify-end gap-1">
                                        <CheckCircle className="w-3.5 h-3.5" /> Cleared
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={8} className="text-center py-8 text-slate-400">
                                  No invoices found for this student.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Receipts History */}
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm mb-3">Official Payment Receipts</h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                          <thead className="bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3">Receipt #</th>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Amount</th>
                              <th className="px-4 py-3">Payment Method</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {invoicesData?.invoices?.flatMap((inv: any) => inv.payments || []).length > 0 ? (
                              invoicesData.invoices
                                .flatMap((inv: any) => inv.payments || [])
                                .map((p: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                                      {p.receipt_number}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                      {new Date(p.payment_date).toLocaleDateString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-emerald-700">
                                      ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-700">
                                      {p.payment_method}
                                    </td>
                                    <td className="px-4 py-3">
                                      <Badge variant="emerald">Completed</Badge>
                                    </td>
                                  </tr>
                                ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="text-center py-8 text-slate-400">
                                  No payment receipts generated yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Report Card Printable Modal */}
      {reportCard && (
        <ReportCardModal
          isOpen={isReportCardModalOpen}
          onClose={() => setIsReportCardModalOpen(false)}
          reportCard={reportCard}
        />
      )}

      {/* Online Payment Simulator Modal */}
      {selectedInvoiceToPay && selectedChild && (
        <OnlineFeePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          childId={selectedChild.student_id}
          childName={selectedChild.full_name}
          invoice={selectedInvoiceToPay}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};
