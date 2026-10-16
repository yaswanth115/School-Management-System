import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Users,
  DollarSign,
  Award,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
  Filter,
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
  const [attendanceStartDate, setAttendanceStartDate] = useState('');
  const [attendanceEndDate, setAttendanceEndDate] = useState('');
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
      setError(err.response?.data?.detail || 'Failed to load financial report.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExamsAndReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const examsRes = await apiClient.get<Exam[]>('/examinations');
      setExamsList(examsRes.data);

      const targetId = selectedExamId || (examsRes.data.length > 0 ? examsRes.data[0].id : '');
      if (targetId) {
        setSelectedExamId(targetId);
        const repRes = await apiClient.get<ExaminationPerformanceReport>(
          `/reports/examinations?exam_id=${targetId}`
        );
        setExamReport(repRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load examination reports.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExamChange = async (examId: string) => {
    setSelectedExamId(examId);
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
      if (attendanceStartDate) url += `start_date=${attendanceStartDate}&`;
      if (attendanceEndDate) url += `end_date=${attendanceEndDate}&`;
      const res = await apiClient.get<AttendanceAnalyticsReport>(url);
      setAttendanceReport(res.data);
    } catch (err: any) {
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
                if (attendanceStartDate) url += `start_date=${attendanceStartDate}&`;
                if (attendanceEndDate) url += `end_date=${attendanceEndDate}&`;
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
          {activeTab === 'DEMOGRAPHICS' && demographics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-indigo-50/50 border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-600 uppercase">Total Enrolled</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2">{demographics.total_students}</p>
                  <p className="text-xs text-slate-500 mt-1">Across all registered classes</p>
                </Card>

                <Card className="bg-purple-50/50 border-purple-100">
                  <p className="text-xs font-semibold text-purple-600 uppercase">Gender Ratio</p>
                  <div className="flex items-center gap-3 mt-2 text-sm font-bold text-slate-800">
                    <span>M: {demographics.gender_distribution['MALE'] || 0}</span>
                    <span>•</span>
                    <span>F: {demographics.gender_distribution['FEMALE'] || 0}</span>
                    {demographics.gender_distribution['OTHER'] ? (
                      <>
                        <span>•</span>
                        <span>O: {demographics.gender_distribution['OTHER']}</span>
                      </>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Institutional demographic balance</p>
                </Card>

                <Card className="bg-emerald-50/50 border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-600 uppercase">Enrollment Status</p>
                  <p className="text-xl font-bold text-slate-900 mt-2">
                    {Object.entries(demographics.status_distribution)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' | ') || 'All Active'}
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
                        <th className="py-3 px-4 text-right">Student Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {demographics.class_enrollment_counts.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-slate-400 text-xs">
                            No active class enrollments recorded.
                          </td>
                        </tr>
                      ) : (
                        demographics.class_enrollment_counts.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-semibold text-slate-800">{item.class_name}</td>
                            <td className="py-3 px-4 text-slate-600">Section {item.section_name}</td>
                            <td className="py-3 px-4 text-right font-bold text-indigo-600">{item.student_count}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* 2. Finances & Defaulters Tab */}
          {activeTab === 'FINANCES' && finances && (
            <div className="space-y-6">
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
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{finances.collection_rate_percentage}%</p>
                </Card>
              </div>

              {/* Defaulters Ledger */}
              <Card
                title={`Fee Defaulters & Unpaid Invoices (${finances.defaulters.length})`}
                subtitle="Students with overdue and outstanding fees"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Admission No.</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4 text-right">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {finances.defaulters.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-emerald-600 text-xs font-semibold">
                            ✓ No outstanding fee defaulters. All billing accounts settled!
                          </td>
                        </tr>
                      ) : (
                        finances.defaulters.map((d, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-semibold text-slate-800">{d.student_name}</td>
                            <td className="py-3 px-4 text-slate-600 font-mono text-xs">{d.admission_number}</td>
                            <td className="py-3 px-4 text-slate-600">{d.class_name}</td>
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
                    {examsList.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                {examReport && (
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-600">
                      Total Marks Records: <strong className="text-slate-900">{examReport.total_marks_recorded}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold">
                      Overall Average: {examReport.overall_average_percentage}%
                    </span>
                  </div>
                )}
              </div>

              {examReport && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Subject-Wise Performance */}
                  <Card title="Subject Performance" subtitle="Average, highest, and lowest mark benchmarks">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                            <th className="py-3 px-4">Subject</th>
                            <th className="py-3 px-4 text-center">Avg %</th>
                            <th className="py-3 px-4 text-right">Max</th>
                            <th className="py-3 px-4 text-right">Min</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {examReport.subject_performance.map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-semibold text-slate-800">{s.subject_name}</td>
                              <td className="py-3 px-4 text-center font-bold text-indigo-600">
                                {s.average_percentage}%
                              </td>
                              <td className="py-3 px-4 text-right text-emerald-600 font-medium">{s.highest_mark}</td>
                              <td className="py-3 px-4 text-right text-red-500 font-medium">{s.lowest_mark}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Class-Wise Performance */}
                  <Card title="Class-Wise Average" subtitle="Aggregated evaluation across classes">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                            <th className="py-3 px-4">Class</th>
                            <th className="py-3 px-4 text-center">Students Evaluated</th>
                            <th className="py-3 px-4 text-right">Class Average</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {examReport.class_performance.map((c, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-semibold text-slate-800">{c.class_name}</td>
                              <td className="py-3 px-4 text-center text-slate-600">{c.students_evaluated}</td>
                              <td className="py-3 px-4 text-right font-bold text-indigo-600">
                                {c.average_percentage}%
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

          {/* 4. Attendance Analytics Tab */}
          {activeTab === 'ATTENDANCE' && attendanceReport && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Date Range:</span>
                  <input
                    type="date"
                    value={attendanceStartDate}
                    onChange={(e) => setAttendanceStartDate(e.target.value)}
                    className="text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={attendanceEndDate}
                    onChange={(e) => setAttendanceEndDate(e.target.value)}
                    className="text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 focus:outline-none focus:border-indigo-500"
                  />
                  <Button variant="outline" size="sm" onClick={loadAttendanceReport}>
                    Filter
                  </Button>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">Total Entries: {attendanceReport.total_records}</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                    Institutional Rate: {attendanceReport.overall_attendance_rate}%
                  </span>
                </div>
              </div>

              {/* Status Breakdown Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-emerald-50/50 border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-700 uppercase">Present</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">
                    {attendanceReport.status_breakdown['PRESENT'] || 0}
                  </p>
                </Card>
                <Card className="bg-red-50/50 border-red-100">
                  <p className="text-xs font-semibold text-red-700 uppercase">Absent</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">
                    {attendanceReport.status_breakdown['ABSENT'] || 0}
                  </p>
                </Card>
                <Card className="bg-amber-50/50 border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 uppercase">Late</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">
                    {attendanceReport.status_breakdown['LATE'] || 0}
                  </p>
                </Card>
                <Card className="bg-purple-50/50 border-purple-100">
                  <p className="text-xs font-semibold text-purple-700 uppercase">Excused</p>
                  <p className="text-2xl font-bold text-purple-700 mt-1">
                    {attendanceReport.status_breakdown['EXCUSED'] || 0}
                  </p>
                </Card>
              </div>

              {/* Class-Wise Attendance Rates */}
              <Card title="Class-Wise Attendance Register Rates" subtitle="Breakdown of section-level attendance percentages">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                        <th className="py-3 px-4">Class & Section</th>
                        <th className="py-3 px-4 text-center">Total Marked</th>
                        <th className="py-3 px-4 text-center">Present Days</th>
                        <th className="py-3 px-4 text-right">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceReport.class_wise_rates.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                            No attendance records found for this period.
                          </td>
                        </tr>
                      ) : (
                        attendanceReport.class_wise_rates.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {c.class_name} - Section {c.section_name}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-600">{c.total_marked}</td>
                            <td className="py-3 px-4 text-center text-emerald-600 font-medium">{c.present_count}</td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`font-bold px-2 py-0.5 rounded text-xs ${
                                  c.attendance_rate >= 80
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : c.attendance_rate >= 75
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {c.attendance_rate}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
