import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  CreditCard,
  Award,
  CheckSquare,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldAlert,
  UserCheck,
  Bell,
  Calendar,
  AlertCircle,
  CheckCircle,
  FileText,
  Pin,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  DashboardStatsResponse,
  AdminDashboardStats,
  AccountantDashboardStats,
  TeacherDashboardStats,
  ParentDashboardStats,
  StudentDashboardStats,
  DashboardNoticeItem,
} from '../../types';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardMetrics();
  }, [user]);

  const fetchDashboardMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<DashboardStatsResponse>('/dashboard/stats');
      setStats(response.data);
    } catch (err: any) {
      console.error('Failed to load dashboard metrics', err);
      setError('Failed to fetch dashboard metrics. Please refresh or check connection.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Spinner size="lg" label="Loading dashboard metrics..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Active Session
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.full_name}!
          </h1>
          <p className="text-indigo-100 text-sm mt-2 leading-relaxed">
            Logged in as <span className="font-semibold text-white uppercase">{user?.role}</span>. Here is your operational institutional overview.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchDashboardMetrics}>
            Retry
          </Button>
        </div>
      )}

      {/* 1. ADMIN & PRINCIPAL DASHBOARD */}
      {(user?.role === 'ADMIN' || user?.role === 'PRINCIPAL') && stats && (
        <AdminDashboardView stats={stats as AdminDashboardStats} navigate={navigate} />
      )}

      {/* 2. ACCOUNTANT DASHBOARD */}
      {user?.role === 'ACCOUNTANT' && stats && (
        <AccountantDashboardView stats={stats as AccountantDashboardStats} navigate={navigate} />
      )}

      {/* 3. TEACHER DASHBOARD */}
      {user?.role === 'TEACHER' && stats && (
        <TeacherDashboardView stats={stats as TeacherDashboardStats} navigate={navigate} />
      )}

      {/* 4. PARENT DASHBOARD */}
      {user?.role === 'PARENT' && stats && (
        <ParentDashboardView stats={stats as ParentDashboardStats} navigate={navigate} />
      )}

      {/* 5. STUDENT DASHBOARD */}
      {user?.role === 'STUDENT' && stats && (
        <StudentDashboardView stats={stats as StudentDashboardStats} navigate={navigate} />
      )}
    </div>
  );
};

// ==========================================
// ADMIN / PRINCIPAL DASHBOARD VIEW
// ==========================================
interface ViewProps<T> {
  stats: T;
  navigate: (path: string) => void;
}

const AdminDashboardView: React.FC<ViewProps<AdminDashboardStats>> = ({ stats, navigate }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total_students}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-[11px] text-slate-500">
            <span className="text-indigo-600 font-semibold mr-1">Enrolled</span> active students
          </div>
        </Card>

        <Card className="hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Teachers</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.total_teachers}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-[11px] text-slate-500">
            <span className="text-emerald-600 font-semibold mr-1">Faculty</span> staff members
          </div>
        </Card>

        <Card className="hover:border-purple-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Classes</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.total_classes}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-[11px] text-slate-500">
            <span className="text-purple-600 font-semibold mr-1">Active</span> academic grades
          </div>
        </Card>

        <Card className="hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee Collections</p>
              <p className="text-xl font-bold text-blue-600 mt-1">₹{stats.total_fees_collected.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-[11px] text-slate-500">
            <span className="text-emerald-600 font-semibold mr-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> Settled
            </span>
            payments
          </div>
        </Card>

        <Card className="hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Today</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.attendance_rate_today}%</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-[11px] text-slate-500">
            <span className="text-amber-600 font-semibold mr-1">Daily</span> presence rate
          </div>
        </Card>
      </div>

      {/* Quick Operations & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Administrative Operations" subtitle="Direct access to school management services">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: 'Student Directory', desc: 'Admissions, profiles, enrollments', path: '/students', icon: <GraduationCap className="w-5 h-5 text-indigo-600" /> },
                { title: 'Fee Management', desc: 'Invoices, receipts, fee structures', path: '/fees', icon: <CreditCard className="w-5 h-5 text-blue-600" /> },
                { title: 'Examinations', desc: 'Exams, schedules, and marks entry', path: '/examinations', icon: <Award className="w-5 h-5 text-amber-600" /> },
                { title: 'Attendance Registers', desc: 'Daily tracking and correction matrix', path: '/attendance', icon: <CheckSquare className="w-5 h-5 text-emerald-600" /> },
                { title: 'Notice Board', desc: 'Publish announcements and alerts', path: '/notices', icon: <Bell className="w-5 h-5 text-purple-600" /> },
                { title: 'Institutional Reports', desc: 'Demographics, financial reports, CSV', path: '/reports', icon: <FileText className="w-5 h-5 text-rose-600" /> },
              ].map((act, i) => (
                <div
                  key={i}
                  onClick={() => navigate(act.path)}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                      {act.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{act.title}</h4>
                      <p className="text-xs text-slate-500">{act.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Audit Activities */}
          <Card title="Live Audit Trail" subtitle="Recent institutional events and mutations">
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {stats.recent_activities.length === 0 ? (
                <p className="py-4 text-xs text-slate-400 text-center">No recent activity logs recorded.</p>
              ) : (
                stats.recent_activities.map((act) => (
                  <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="font-semibold text-slate-800">{act.action}</span>
                      <span className="text-slate-500 font-mono text-[11px]">({act.resource_type})</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      <span>{act.user_email || 'System'}</span>
                      <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Recent Notices Panel */}
        <div className="space-y-6">
          <RecentNoticesWidget notices={stats.recent_notices} navigate={navigate} />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// ACCOUNTANT DASHBOARD VIEW
// ==========================================
const AccountantDashboardView: React.FC<ViewProps<AccountantDashboardStats>> = ({ stats, navigate }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Invoiced</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹{stats.total_invoiced.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">{stats.total_invoices_count} total invoices</p>
        </Card>

        <Card className="bg-emerald-50/50 border-emerald-100">
          <p className="text-xs font-semibold text-emerald-600 uppercase">Total Collected</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">₹{stats.total_collected.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 mt-2">Active cash & online receipts</p>
        </Card>

        <Card className="bg-amber-50/50 border-amber-100">
          <p className="text-xs font-semibold text-amber-700 uppercase">Total Outstanding</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">₹{stats.total_outstanding.toLocaleString()}</p>
          <p className="text-xs text-amber-600 mt-2">Unpaid balances across accounts</p>
        </Card>

        <Card className="bg-red-50/50 border-red-100">
          <p className="text-xs font-semibold text-red-600 uppercase">Overdue Invoices</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats.overdue_invoices_count}</p>
          <p className="text-xs text-red-600 mt-2">Past scheduled due dates</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Recent Fee Transactions"
            subtitle="Latest student payment receipts recorded"
            action={
              <Button variant="outline" size="sm" onClick={() => navigate('/fees')}>
                Manage Fees
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                    <th className="py-2.5 px-3">Receipt No.</th>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {stats.recent_payments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">No payment receipts yet.</td>
                    </tr>
                  ) : (
                    stats.recent_payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{p.receipt_number}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{p.student_name}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-[10px] text-slate-700">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                          ₹{p.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div>
          <RecentNoticesWidget notices={stats.recent_notices} navigate={navigate} />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// TEACHER DASHBOARD VIEW
// ==========================================
const TeacherDashboardView: React.FC<ViewProps<TeacherDashboardStats>> = ({ stats, navigate }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase">Assigned Classes</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.assigned_classes_count}</p>
          <p className="text-xs text-slate-400 mt-2">Active teaching sections</p>
        </Card>

        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase">Students Taught</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.total_students_taught}</p>
          <p className="text-xs text-slate-400 mt-2">Total enrolled pupils</p>
        </Card>

        <Card className={stats.today_attendance_marked ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}>
          <p className="text-xs font-semibold uppercase text-slate-600">Today's Attendance</p>
          <p className={`text-xl font-bold mt-1 ${stats.today_attendance_marked ? 'text-emerald-700' : 'text-amber-700'}`}>
            {stats.today_attendance_marked ? '✓ Marked' : 'Pending'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 text-xs"
            onClick={() => navigate('/attendance')}
          >
            Open Register
          </Button>
        </Card>

        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase">Grading & Exams</p>
          <p className="text-xl font-bold text-slate-900 mt-1">Review</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 text-xs"
            onClick={() => navigate('/examinations')}
          >
            Marks Rosters
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Today's Teaching Schedule" subtitle="Your assigned periods and classrooms for today">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Class & Section</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Room</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {stats.today_periods.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No periods scheduled for today. Enjoy your day!
                      </td>
                    </tr>
                  ) : (
                    stats.today_periods.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-800">Period {p.period_number}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{p.start_time} - {p.end_time}</td>
                        <td className="py-2.5 px-3 font-semibold text-indigo-600">
                          {p.class_name} {p.section_name ? `(${p.section_name})` : ''}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800">{p.subject_name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{p.room_number}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div>
          <RecentNoticesWidget notices={stats.recent_notices} navigate={navigate} />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// PARENT DASHBOARD VIEW
// ==========================================
const ParentDashboardView: React.FC<ViewProps<ParentDashboardStats>> = ({ stats, navigate }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-indigo-50/40 border-indigo-100">
          <p className="text-xs font-semibold text-indigo-600 uppercase">Linked Children</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats.children_count} Students</p>
          <p className="text-xs text-slate-500 mt-2">Under active institutional guardianship</p>
        </Card>

        <Card className="bg-amber-50/40 border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase">Outstanding Fee Balance</p>
              <p className="text-3xl font-extrabold text-amber-700 mt-1">₹{stats.total_outstanding_fees.toLocaleString()}</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => navigate('/fees')}>
              Pay Fees
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">Combined balance across all children</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Your Children Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.children.map((child) => (
              <Card key={child.student_id} className="hover:border-indigo-300 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{child.full_name}</h4>
                    <p className="text-xs text-slate-500 font-mono">Adm: {child.admission_number}</p>
                    <p className="text-xs font-medium text-indigo-600 mt-1">
                      {child.class_name} ({child.section_name})
                    </p>
                  </div>
                  <Badge variant={child.attendance_percentage >= 75 ? 'emerald' : 'amber'}>
                    {child.attendance_percentage}% Att.
                  </Badge>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Fee Due:{' '}
                    <strong className={child.outstanding_fee_amount > 0 ? 'text-red-600' : 'text-emerald-600'}>
                      ₹{child.outstanding_fee_amount.toLocaleString()}
                    </strong>
                  </span>
                  <Button variant="outline" size="sm" onClick={() => navigate('/parent/children')}>
                    View Profile
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <RecentNoticesWidget notices={stats.recent_notices} navigate={navigate} />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// STUDENT DASHBOARD VIEW
// ==========================================
const StudentDashboardView: React.FC<ViewProps<StudentDashboardStats>> = ({ stats, navigate }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-emerald-50/40 border-emerald-100">
          <p className="text-xs font-semibold text-emerald-700 uppercase">My Attendance</p>
          <p className="text-3xl font-extrabold text-emerald-700 mt-1">{stats.attendance_percentage}%</p>
          <p className="text-xs text-slate-500 mt-2">Overall presence this term</p>
        </Card>

        <Card className="bg-indigo-50/40 border-indigo-100">
          <p className="text-xs font-semibold text-indigo-700 uppercase">Fee Balance</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">₹{stats.fee_balance.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">Due institutional balance</p>
        </Card>

        <Card className="bg-purple-50/40 border-purple-100">
          <p className="text-xs font-semibold text-purple-700 uppercase">Recent Exam Benchmark</p>
          <p className="text-base font-bold text-purple-800 mt-2">{stats.recent_exam_score || 'No exam evaluated yet'}</p>
          <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => navigate('/student/profile')}>
            Report Card
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Today's Class Schedule" subtitle="Your daily timetable and room locations">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Teacher</th>
                    <th className="py-2.5 px-3">Room</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {stats.today_periods.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No periods scheduled for today. Have a productive day!
                      </td>
                    </tr>
                  ) : (
                    stats.today_periods.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-800">Period {p.period_number}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{p.start_time} - {p.end_time}</td>
                        <td className="py-2.5 px-3 font-semibold text-indigo-600">{p.subject_name}</td>
                        <td className="py-2.5 px-3 text-slate-800">{p.teacher_name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{p.room_number}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div>
          <RecentNoticesWidget notices={stats.recent_notices} navigate={navigate} />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// RECENT NOTICES COMPONENT
// ==========================================
const RecentNoticesWidget: React.FC<{
  notices: DashboardNoticeItem[];
  navigate: (path: string) => void;
}> = ({ notices, navigate }) => {
  return (
    <Card
      title="Notice Board"
      subtitle="Latest announcements"
      action={
        <Button variant="outline" size="sm" onClick={() => navigate('/notices')}>
          View All
        </Button>
      }
    >
      <div className="divide-y divide-slate-100 space-y-2">
        {notices.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">No active announcements.</p>
        ) : (
          notices.map((n) => (
            <div
              key={n.id}
              onClick={() => navigate('/notices')}
              className="pt-2 pb-1 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-1.5 mb-1">
                {n.is_pinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
                <Badge variant={n.target_audience === 'ALL' ? 'emerald' : 'indigo'}>
                  {n.target_audience}
                </Badge>
                <span className="text-[10px] text-slate-400 ml-auto">
                  {new Date(n.publish_date).toLocaleDateString()}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{n.title}</h4>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.content}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
