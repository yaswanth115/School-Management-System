import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Users,
  DollarSign,
  Award,
  CalendarCheck,
  Filter,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import {
  StudentDemographicsReport,
  FinancialSummaryReport,
  ExaminationPerformanceReport,
  AttendanceAnalyticsReport,
  Exam,
} from '../../types';

type ReportTab = 'DEMOGRAPHICS' | 'FINANCES' | 'EXAMINATIONS' | 'ATTENDANCE';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('DEMOGRAPHICS');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demographics Data
  const [demographics, setDemographics] = useState<StudentDemographicsReport | null>(null);

  // Finances Data
  const [finances, setFinances] = useState<FinancialSummaryReport | null>(null);

  // Examinations Data
  const [examsList, setExamsList] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [examReport, setExamReport] = useState<ExaminationPerformanceReport | null>(null);

  // Attendance Data
  const [attendanceMonth, setAttendanceMonth] = useState<number | ''>('');
  const [attendanceYear, setAttendanceYear] = useState<number | ''>('');
  const [attendanceReport, setAttendanceReport] = useState<AttendanceAnalyticsReport | null>(null);

  useEffect(() => {
    if (activeTab === 'DEMOGRAPHICS') loadDemographics();
    if (activeTab === 'FINANCES') loadFinances();
    if (activeTab === 'EXAMINATIONS') loadExamsAndReport();
    if (activeTab === 'ATTENDANCE') loadAttendanceReport();
  }, [activeTab]);

  const loadDemographics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<StudentDemographicsReport>('/reports/students');
      setDemographics(res.data);
    } catch (err: any) {
      console.error('Failed to load demographics report:', err);
      setError(err.response?.data?.detail || 'Failed to load demographics report.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFinances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<FinancialSummaryReport>('/reports/finances');
      setFinances(res.data);
    } catch (err: any) {
      console.error('Failed to load financial report:', err);
      setError(err.response?.data?.detail || 'Failed to load financial report.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExamsAndReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const examsRes = await apiClient.get<Exam[]>('/exams');
      setExamsList(examsRes.data || []);

      const targetId = selectedExamId || (examsRes.data && examsRes.data.length > 0 ? examsRes.data[0].id : '');
      if (targetId) {
        setSelectedExamId(targetId);
        const repRes = await apiClient.get<ExaminationPerformanceReport>(
          `/reports/examinations?exam_id=${targetId}`
        );
        setExamReport(repRes.data);
      } else {
        setExamReport(null);
      }
    } catch (err: any) {
      console.error('Failed to load examination reports:', err);
      setError(err.response?.data?.detail || 'Failed to load examination reports.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExamChange = async (examId: string) => {
    setSelectedExamId(examId);
    if (!examId) {
      setExamReport(null);
      return;
    }
    setIsLoading(true);
    try {
      const repRes = await apiClient.get<ExaminationPerformanceReport>(
        `/reports/examinations?exam_id=${examId}`
      );
      setExamReport(repRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load performance for exam.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAttendanceReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = '/reports/attendance?';
      if (attendanceMonth) url += `month=${attendanceMonth}&`;
      if (attendanceYear) url += `year=${attendanceYear}&`;
      const res = await apiClient.get<AttendanceAnalyticsReport>(url);
      setAttendanceReport(res.data);
    } catch (err: any) {
      console.error('Failed to load attendance report:', err);
      setError(err.response?.data?.detail || 'Failed to load attendance report.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCsv = async (endpoint: string, filename: string) => {
    try {
      const res = await apiClient.get(endpoint, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to download CSV export.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-600" />
            Institutional Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Aggregated institutional statistics, financial health, exam ratings, and printable records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Report
          </Button>
          {activeTab === 'DEMOGRAPHICS' && (
            <Button
              variant="primary"
              onClick={() => downloadCsv('/reports/students?export=csv', 'students_demographics.csv')}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export CSV
            </Button>
          )}
          {activeTab === 'FINANCES' && (
            <Button
              variant="primary"
              onClick={() => downloadCsv('/reports/finances?export=csv', 'fee_defaulters_report.csv')}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export CSV
            </Button>
          )}
          {activeTab === 'EXAMINATIONS' && selectedExamId && (
            <Button
              variant="primary"
              onClick={() =>
                downloadCsv(
                  `/reports/examinations?exam_id=${selectedExamId}&export=csv`,
                  `exam_performance_${selectedExamId}.csv`
                )
              }
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export CSV
            </Button>
          )}
          {activeTab === 'ATTENDANCE' && (
            <Button
              variant="primary"
              onClick={() => {
                let url = '/reports/attendance?export=csv&';
                if (attendanceMonth) url += `month=${attendanceMonth}&`;
                if (attendanceYear) url += `year=${attendanceYear}&`;
                downloadCsv(url, 'attendance_analytics.csv');
              }}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Report Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-2">
        {[
          { id: 'DEMOGRAPHICS', label: 'Student Demographics', icon: <Users className="w-4 h-4" /> },
          { id: 'FINANCES', label: 'Financials & Defaulters', icon: <DollarSign className="w-4 h-4" /> },
          { id: 'EXAMINATIONS', label: 'Exam Performance', icon: <Award className="w-4 h-4" /> },
          { id: 'ATTENDANCE', label: 'Attendance Analytics', icon: <CalendarCheck className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ReportTab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Spinner size="lg" label="Generating analytics report..." />
        </div>
      ) : (
        <div className="space-y-6 printable-report">
          {/* 1. Demographics Tab */}
          {activeTab === 'DEMOGRAPHICS' && (
            <div className="space-y-6">
              {demographics ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="bg-indigo-50/50 border-indigo-100">
                      <p className="text-xs font-semibold text-indigo-600 uppercase">Total Enrolled</p>
                      <p className="text-3xl font-extrabold text-slate-900 mt-2">{demographics.total_students}</p>
                      <p className="text-xs text-slate-500 mt-1">Across all registered classes</p>
                    </Card>

                    <Card className="bg-purple-50/50 border-purple-100">
                      <p className="text-xs font-semibold text-purple-600 uppercase">Gender Ratio</p>
                      <div className="flex items-center gap-3 mt-2 text-sm font-bold text-slate-800">
                        <span>
                          Male: {demographics.gender_distribution?.Male ?? demographics.gender_distribution?.MALE ?? 0}
                        </span>
                        <span>•</span>
                        <span>
                          Female: {demographics.gender_distribution?.Female ?? demographics.gender_distribution?.FEMALE ?? 0}
                        </span>
                        {(demographics.gender_distribution?.Other ?? demographics.gender_distribution?.OTHER) ? (
                          <>
                            <span>•</span>
                            <span>
                              Other: {demographics.gender_distribution?.Other ?? demographics.gender_distribution?.OTHER ?? 0}
                            </span>
                          </>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Institutional demographic balance</p>
                    </Card>

                    <Card className="bg-emerald-50/50 border-emerald-100">
                      <p className="text-xs font-semibold text-emerald-600 uppercase">Enrollment Status</p>
                      <p className="text-xl font-bold text-slate-900 mt-2">
                        {demographics.status_distribution
                          ? Object.entries(demographics.status_distribution)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' | ')
                          : 'All Active'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Student lifecycle distribution</p>
                    </Card>
                  </div>

                  {/* Class-wise enrollment breakdown table */}
                  <Card title="Class-Wise Enrollment Breakdown" subtitle="Distribution across active class sections">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                            <th className="py-3 px-4">Class</th>
                            <th className="py-3 px-4">Section</th>
                            <th className="py-3 px-4 text-center">Male</th>
                            <th className="py-3 px-4 text-center">Female</th>
                            <th className="py-3 px-4 text-right">Total Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(!demographics.class_distribution || demographics.class_distribution.length === 0) ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                                No active class enrollments recorded.
                              </td>
                            </tr>
                          ) : (
                            demographics.class_distribution.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-semibold text-slate-800">{item.class_name}</td>
                                <td className="py-3 px-4 text-slate-600">{item.section_name}</td>
                                <td className="py-3 px-4 text-center text-slate-600">{item.male ?? 0}</td>
                                <td className="py-3 px-4 text-center text-slate-600">{item.female ?? 0}</td>
                                <td className="py-3 px-4 text-right font-bold text-indigo-600">{item.total}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Student Master Roster */}
                  {demographics.students && demographics.students.length > 0 && (
                    <Card title={`Enrolled Students Directory (${demographics.students.length})`} subtitle="Full student records summary">
                      <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50 sticky top-0">
                              <th className="py-2.5 px-3">Admission No</th>
                              <th className="py-2.5 px-3">Student Name</th>
                              <th className="py-2.5 px-3">Class & Section</th>
                              <th className="py-2.5 px-3">Gender</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {demographics.students.map((st, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{st.admission_number}</td>
                                <td className="py-2.5 px-3 font-medium text-slate-800">{st.full_name}</td>
                                <td className="py-2.5 px-3 text-slate-600">{st.class_name} ({st.section_name})</td>
                                <td className="py-2.5 px-3 text-slate-600">{st.gender}</td>
                                <td className="py-2.5 px-3">
                                  <Badge variant="emerald">{st.status}</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">No demographics data available.</div>
              )}
            </div>
          )}

          {/* 2. Finances & Defaulters Tab */}
          {activeTab === 'FINANCES' && (
            <div className="space-y-6">
              {finances ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <Card>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Total Invoiced</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">₹{finances.total_invoiced.toLocaleString()}</p>
                    </Card>
                    <Card className="bg-emerald-50/40 border-emerald-100">
                      <p className="text-xs font-semibold text-emerald-600 uppercase">Total Collected</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">₹{finances.total_collected.toLocaleString()}</p>
                    </Card>
                    <Card className="bg-red-50/40 border-red-100">
                      <p className="text-xs font-semibold text-red-600 uppercase">Total Outstanding</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">₹{finances.total_outstanding.toLocaleString()}</p>
                    </Card>
                    <Card className="bg-indigo-50/40 border-indigo-100">
                      <p className="text-xs font-semibold text-indigo-600 uppercase">Collection Rate</p>
                      <p className="text-2xl font-bold text-indigo-600 mt-1">{finances.collection_percentage}%</p>
                    </Card>
                  </div>

                  {/* Defaulters Ledger */}
                  <Card
                    title={`Fee Defaulters & Overdue Invoices (${finances.defaulters?.length || 0})`}
                    subtitle="Students with outstanding fee balances"
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                            <th className="py-3 px-4">Student</th>
                            <th className="py-3 px-4">Admission No.</th>
                            <th className="py-3 px-4">Class</th>
                            <th className="py-3 px-4">Invoice No</th>
                            <th className="py-3 px-4">Due Date</th>
                            <th className="py-3 px-4 text-right">Balance Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(!finances.defaulters || finances.defaulters.length === 0) ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-emerald-600 text-xs font-semibold">
                                ✓ No outstanding fee defaulters. All billing accounts settled!
                              </td>
                            </tr>
                          ) : (
                            finances.defaulters.map((d, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-semibold text-slate-800">{d.student_name}</td>
                                <td className="py-3 px-4 text-slate-600 font-mono text-xs">{d.admission_number}</td>
                                <td className="py-3 px-4 text-slate-600">{d.class_name}</td>
                                <td className="py-3 px-4 text-slate-500 font-mono text-xs">{d.invoice_number || 'N/A'}</td>
                                <td className="py-3 px-4 text-slate-500 text-xs">
                                  {d.due_date ? new Date(d.due_date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-red-600">
                                  ₹{d.balance_amount.toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">No financial data available.</div>
              )}
            </div>
          )}

          {/* 3. Examination Performance Tab */}
          {activeTab === 'EXAMINATIONS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Select Examination:</span>
                  <select
                    value={selectedExamId}
                    onChange={(e) => handleExamChange(e.target.value)}
                    className="rounded-lg border border-slate-300 py-1.5 px-3 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    {examsList.length === 0 ? (
                      <option value="">No examinations configured</option>
                    ) : (
                      examsList.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {examReport && (
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-600">
                      Evaluated Students: <strong className="text-slate-900">{examReport.total_students_evaluated}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold">
                      Overall Pass Rate: {examReport.overall_pass_percentage}%
                    </span>
                  </div>
                )}
              </div>

              {examReport ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Class-Wise Performance */}
                  <Card title="Class-Wise Average Scores" subtitle="Aggregated evaluation across classes">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                            <th className="py-3 px-4">Class</th>
                            <th className="py-3 px-4 text-center">Evaluated</th>
                            <th className="py-3 px-4 text-right">Class Average</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(!examReport.class_averages || examReport.class_averages.length === 0) ? (
                            <tr>
                              <td colSpan={3} className="py-6 text-center text-slate-400 text-xs">
                                No class averages recorded for this exam.
                              </td>
                            </tr>
                          ) : (
                            examReport.class_averages.map((c, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-semibold text-slate-800">{c.class_name}</td>
                                <td className="py-3 px-4 text-center text-slate-600">{c.students_evaluated}</td>
                                <td className="py-3 px-4 text-right font-bold text-indigo-600">
                                  {c.average_percentage}%
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Top Performers */}
                  <Card title="Top Performing Students" subtitle="Merit benchmark leaders">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                            <th className="py-3 px-4">Rank</th>
                            <th className="py-3 px-4">Student</th>
                            <th className="py-3 px-4">Class</th>
                            <th className="py-3 px-4 text-right">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(!examReport.top_performers || examReport.top_performers.length === 0) ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                                No top performers recorded yet.
                              </td>
                            </tr>
                          ) : (
                            examReport.top_performers.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-bold text-amber-600">#{idx + 1}</td>
                                <td className="py-3 px-4 font-semibold text-slate-800">{p.student_name}</td>
                                <td className="py-3 px-4 text-slate-600">{p.class_name}</td>
                                <td className="py-3 px-4 text-right font-bold text-emerald-600">{p.percentage}%</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">
                  {examsList.length === 0 ? 'No exams available.' : 'Select an exam to view results.'}
                </div>
              )}
            </div>
          )}

          {/* 4. Attendance Analytics Tab */}
          {activeTab === 'ATTENDANCE' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Filters:</span>
                  <select
                    value={attendanceMonth}
                    onChange={(e) => setAttendanceMonth(e.target.value ? Number(e.target.value) : '')}
                    className="text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">All Months</option>
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December',
                    ].map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={attendanceYear}
                    onChange={(e) => setAttendanceYear(e.target.value ? Number(e.target.value) : '')}
                    className="text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">All Years</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={loadAttendanceReport}>
                    Filter
                  </Button>
                </div>

                {attendanceReport && (
                  <div className="text-xs text-slate-500">
                    Academic Session: <strong className="text-slate-800">{attendanceReport.academic_year_name}</strong>
                  </div>
                )}
              </div>

              {attendanceReport ? (
                <div className="space-y-6">
                  {/* Class-Wise Attendance Rates */}
                  <Card title="Class-Wise Average Attendance" subtitle="Aggregated attendance rate across sections">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                            <th className="py-3 px-4">Class & Section</th>
                            <th className="py-3 px-4 text-center">Registers Taken</th>
                            <th className="py-3 px-4 text-right">Average Attendance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(!attendanceReport.class_attendance_summary || attendanceReport.class_attendance_summary.length === 0) ? (
                            <tr>
                              <td colSpan={3} className="py-6 text-center text-slate-400 text-xs">
                                No attendance records found.
                              </td>
                            </tr>
                          ) : (
                            attendanceReport.class_attendance_summary.map((c, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-semibold text-slate-800">
                                  {c.class_name} - {c.section_name}
                                </td>
                                <td className="py-3 px-4 text-center text-slate-600">{c.total_registers}</td>
                                <td className="py-3 px-4 text-right">
                                  <span
                                    className={`font-bold px-2 py-0.5 rounded text-xs ${
                                      c.average_attendance_percentage >= 80
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : c.average_attendance_percentage >= 75
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {c.average_attendance_percentage}%
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Low Attendance Alerts */}
                  {attendanceReport.low_attendance_students && attendanceReport.low_attendance_students.length > 0 && (
                    <Card
                      title={`Low Attendance Alerts (< 75%) — ${attendanceReport.low_attendance_students.length} Students`}
                      subtitle="Students requiring institutional counseling or guardian notification"
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                              <th className="py-2.5 px-3">Admission No</th>
                              <th className="py-2.5 px-3">Student Name</th>
                              <th className="py-2.5 px-3">Class</th>
                              <th className="py-2.5 px-3 text-center">Attendance %</th>
                              <th className="py-2.5 px-3">Parent Phone</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {attendanceReport.low_attendance_students.map((st, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{st.admission_number}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">{st.student_name}</td>
                                <td className="py-2.5 px-3 text-slate-600">{st.class_name}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <Badge variant="rose">{st.attendance_percentage}%</Badge>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">{st.parent_phone || 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">No attendance analytics recorded.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
