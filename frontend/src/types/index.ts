export type Role = 'ADMIN' | 'PRINCIPAL' | 'ACCOUNTANT' | 'TEACHER' | 'PARENT' | 'STUDENT';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: Role;
  avatar_url?: string | null;
  is_active: boolean;
  last_login?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAuthSummary {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserAuthSummary;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  timestamp: string;
}

// --- Academics ---
export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_active: boolean;
}

export interface Section {
  id: string;
  class_id: string;
  name: string;
  room_number?: string | null;
  capacity: number;
  is_active: boolean;
}

export interface SchoolClass {
  id: string;
  name: string;
  numeric_order: number;
  description?: string | null;
  sections: Section[];
  is_active: boolean;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  subject_type: string;
  description?: string | null;
  is_active: boolean;
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  teacher_name?: string | null;
  teacher_email?: string | null;
  class_id: string;
  class_name?: string | null;
  section_id: string;
  section_name?: string | null;
  subject_id: string;
  subject_name?: string | null;
  subject_code?: string | null;
  academic_year_id: string;
  academic_year_name?: string | null;
}

// --- Students ---
export type StudentStatus = 'ACTIVE' | 'TRANSFERRED' | 'WITHDRAWN' | 'ALUMNI';
export type EnrollmentStatus = 'ENROLLED' | 'PROMOTED' | 'TRANSFERRED' | 'WITHDRAWN';

export interface Student {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  blood_group?: string | null;
  admission_date: string;
  status: StudentStatus;
  photo_url?: string | null;
  current_class_name?: string | null;
  current_section_name?: string | null;
  current_roll_number?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
}

export interface Guardian {
  id: string;
  full_name: string;
  relationship_type: string;
  email?: string | null;
  phone: string;
  occupation?: string | null;
  address?: string | null;
  is_primary: boolean;
}

export interface EnrollmentHistoryItem {
  id: string;
  academic_year_id: string;
  academic_year_name?: string | null;
  class_id: string;
  class_name?: string | null;
  section_id: string;
  section_name?: string | null;
  roll_number?: string | null;
  status: EnrollmentStatus;
  enrolled_at: string;
  remarks?: string | null;
}

export interface StudentDetail extends Student {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  emergency_contact?: string | null;
  guardians: Guardian[];
  enrollment_history: EnrollmentHistoryItem[];
}

// --- Staff ---
export interface StaffProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  employee_id: string;
  designation: string;
  department: string;
  qualification?: string | null;
  joining_date: string;
  emergency_contact?: string | null;
  is_active: boolean;
  assigned_subjects_count: number;
}

// --- Fees & Financials ---
export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CREDIT_CARD' | 'ONLINE_GATEWAY';
export type PaymentStatus = 'COMPLETED' | 'REFUNDED' | 'REVERSED';

export interface FeeType {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeeStructureItem {
  id: string;
  fee_structure_id: string;
  fee_type_id: string;
  fee_type_name?: string | null;
  fee_type_code?: string | null;
  amount: number;
}

export interface FeeStructure {
  id: string;
  academic_year_id: string;
  academic_year_name?: string | null;
  class_id: string;
  class_name?: string | null;
  name: string;
  total_amount: number;
  due_date?: string | null;
  is_active: boolean;
  created_at: string;
  items: FeeStructureItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  fee_type_id: string;
  fee_type_name?: string | null;
  fee_type_code?: string | null;
  description?: string | null;
  amount: number;
}

export interface PaymentRefund {
  id: string;
  payment_id: string;
  refund_number: string;
  amount: number;
  reason: string;
  approved_by_id?: string | null;
  approved_by_name?: string | null;
  refund_date: string;
  created_at: string;
}

export interface Payment {
  id: string;
  receipt_number: string;
  invoice_id: string;
  invoice_number?: string | null;
  student_id: string;
  student_name?: string | null;
  admission_number?: string | null;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  transaction_reference?: string | null;
  collected_by_id?: string | null;
  collected_by_name?: string | null;
  status: PaymentStatus;
  notes?: string | null;
  created_at: string;
  refunds?: PaymentRefund[];
}

export interface Invoice {
  id: string;
  invoice_number: string;
  student_id: string;
  student_name?: string | null;
  admission_number?: string | null;
  class_name?: string | null;
  section_name?: string | null;
  academic_year_id: string;
  academic_year_name?: string | null;
  title: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  notes?: string | null;
  created_at: string;
}

export interface InvoiceDetail extends Invoice {
  items: InvoiceItem[];
  payments: Payment[];
}

export interface FeeSummaryReport {
  today_collection: number;
  month_collection: number;
  total_collected: number;
  total_outstanding: number;
  total_invoiced: number;
  paid_invoices_count: number;
  partially_paid_invoices_count: number;
  unpaid_invoices_count: number;
  overdue_invoices_count: number;
}

// --- Examinations & Marks ---
export type ExamType = 'UNIT_TEST' | 'MIDTERM' | 'FINAL' | 'PRACTICAL' | 'QUIZ';
export type MarksSubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RETURNED';

export interface GradeRule {
  id: string;
  grading_scale_id: string;
  grade: string;
  min_percentage: number;
  max_percentage: number;
  grade_point: number;
  remarks?: string | null;
}

export interface GradingScale {
  id: string;
  name: string;
  is_default: boolean;
  description?: string | null;
  rules: GradeRule[];
  created_at: string;
}

export interface Exam {
  id: string;
  academic_year_id: string;
  academic_year_name?: string | null;
  name: string;
  exam_type: ExamType;
  start_date: string;
  end_date: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ExamSchedule {
  id: string;
  exam_id: string;
  exam_name?: string | null;
  class_id: string;
  class_name?: string | null;
  subject_id: string;
  subject_name?: string | null;
  subject_code?: string | null;
  exam_date: string;
  start_time?: string | null;
  end_time?: string | null;
  max_marks: number;
  pass_marks: number;
  room_number?: string | null;
  created_at: string;
}

export interface StudentMark {
  id: string;
  exam_schedule_id: string;
  student_id: string;
  student_name?: string | null;
  admission_number?: string | null;
  roll_number?: string | null;
  section_id: string;
  marks_obtained?: number | null;
  is_absent: boolean;
  grade?: string | null;
  grade_point?: number | null;
  remarks?: string | null;
}

export interface ExamSubmissionBatch {
  id: string;
  exam_schedule_id: string;
  exam_name?: string | null;
  class_id?: string | null;
  class_name?: string | null;
  section_id: string;
  section_name?: string | null;
  subject_id?: string | null;
  subject_name?: string | null;
  max_marks?: number | null;
  pass_marks?: number | null;
  status: MarksSubmissionStatus;
  submitted_by_id?: string | null;
  submitted_by_name?: string | null;
  submitted_at?: string | null;
  reviewed_by_id?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_comments?: string | null;
  student_count: number;
  marks: StudentMark[];
}

export interface SubjectMarkReport {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  exam_date?: string | null;
  max_marks: number;
  pass_marks: number;
  marks_obtained?: number | null;
  is_absent: boolean;
  percentage?: number | null;
  grade?: string | null;
  grade_point?: number | null;
  remarks?: string | null;
  is_passed: boolean;
}

export interface StudentReportCard {
  student_id: string;
  admission_number: string;
  student_name: string;
  class_name: string;
  section_name: string;
  roll_number?: string | null;
  academic_year_name: string;
  exam_id: string;
  exam_name: string;
  exam_type: ExamType;
  subjects: SubjectMarkReport[];
  total_max_marks: number;
  total_marks_obtained: number;
  overall_percentage: number;
  overall_grade?: string | null;
  overall_grade_point?: number | null;
  class_rank?: number | null;
  total_students_in_class?: number | null;
  result_status: string;
  attendance_percentage?: number | null;
  issued_date: string;
}

// --- Attendance Management ---
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'APPROVED_LEAVE';

export interface AttendanceCorrectionLog {
  id: string;
  attendance_record_id: string;
  previous_status: AttendanceStatus;
  new_status: AttendanceStatus;
  reason: string;
  changed_by_id?: string | null;
  changed_by_name?: string | null;
  changed_at: string;
}

export interface AttendanceRecord {
  id?: string | null;
  student_id: string;
  student_name: string;
  admission_number: string;
  roll_number?: string | null;
  status: AttendanceStatus;
  remarks?: string | null;
  corrections: AttendanceCorrectionLog[];
}

export interface AttendanceRegister {
  id?: string | null;
  class_id: string;
  class_name?: string | null;
  section_id: string;
  section_name?: string | null;
  academic_year_id?: string | null;
  academic_year_name?: string | null;
  attendance_date: string;
  taken_by_id?: string | null;
  taken_by_name?: string | null;
  notes?: string | null;
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  half_day_count: number;
  leave_count: number;
  is_submitted: boolean;
  created_at?: string | null;
  records: AttendanceRecord[];
}

export interface StudentAttendanceSummary {
  student_id: string;
  admission_number: string;
  student_name: string;
  roll_number?: string | null;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  half_day_days: number;
  leave_days: number;
  attendance_percentage: number;
  is_low_attendance: boolean;
}

export interface SectionMonthlyAttendanceStats {
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  year: number;
  month: number;
  total_working_days: number;
  average_attendance_percentage: number;
  low_attendance_students: StudentAttendanceSummary[];
}

export interface AttendanceMatrixStudentRow {
  student_id: string;
  admission_number: string;
  student_name: string;
  roll_number?: string | null;
  daily_statuses: Record<number, string | null>;
  present_days: number;
  total_days: number;
  attendance_percentage: number;
}

export interface AttendanceMatrixResponse {
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  year: number;
  month: number;
  days_in_month: number;
  students: AttendanceMatrixStudentRow[];
}

// --- Phase 6: Timetable & Parent / Student Portal ---
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface TimetablePeriod {
  id: string;
  day_of_week: DayOfWeek;
  period_number: number;
  start_time: string;
  end_time: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  teacher_name?: string | null;
  room_number?: string | null;
}

export interface ClassWeeklyTimetable {
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  academic_year_name: string;
  periods: TimetablePeriod[];
}

export interface ChildSummary {
  student_id: string;
  admission_number: string;
  full_name: string;
  first_name: string;
  last_name: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  roll_number?: string | null;
  photo_url?: string | null;
  attendance_percentage: number;
  outstanding_fee_amount: number;
  is_primary_guardian: boolean;
}

export interface GuardianProfileItem {
  id: string;
  full_name: string;
  relationship_type: string;
  email?: string | null;
  phone: string;
  occupation?: string | null;
  is_primary: boolean;
}

export interface StudentAcademicProfile {
  student_id: string;
  admission_number: string;
  full_name: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  blood_group?: string | null;
  admission_date: string;
  photo_url?: string | null;
  class_name: string;
  section_name: string;
  roll_number?: string | null;
  academic_year_name: string;
  guardians: GuardianProfileItem[];
  attendance_percentage: number;
  outstanding_fee_amount: number;
}

export interface OnlinePaymentRequest {
  invoice_id: string;
  amount: number;
  payment_method?: PaymentMethod;
  gateway_provider?: string;
  transaction_reference?: string;
}

export interface OnlinePaymentResponse {
  payment_id: string;
  receipt_number: string;
  invoice_id: string;
  invoice_number: string;
  amount_paid: number;
  remaining_balance: number;
  invoice_status: InvoiceStatus;
  transaction_reference: string;
  payment_date: string;
}

// --- Notices ---
export type NoticeAudience = 'ALL' | 'TEACHERS' | 'PARENTS' | 'STUDENTS' | 'CLASS_SPECIFIC';

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  target_audience: NoticeAudience;
  class_id?: string | null;
  class_name?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  is_published: boolean;
  is_pinned: boolean;
  publish_date: string;
  expires_at?: string | null;
  author_id: string;
  author_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoticeCreateRequest {
  title: string;
  content: string;
  target_audience: NoticeAudience;
  class_id?: string | null;
  section_id?: string | null;
  is_published?: boolean;
  is_pinned?: boolean;
  publish_date?: string | null;
  expires_at?: string | null;
}

export interface NoticeListResponse {
  items: NoticeItem[];
  total: number;
  page: number;
  limit: number;
}

// --- Dashboards ---
export interface DashboardNoticeItem {
  id: string;
  title: string;
  content: string;
  target_audience: string;
  publish_date: string;
  is_pinned: boolean;
  author_name?: string | null;
}

export interface AdminDashboardStats {
  role: 'ADMIN' | 'PRINCIPAL';
  total_students: number;
  total_teachers: number;
  total_classes: number;
  total_fees_collected: number;
  attendance_rate_today: number;
  recent_notices: DashboardNoticeItem[];
  recent_activities: {
    id: string;
    action: string;
    resource_type: string;
    user_email?: string | null;
    timestamp: string;
  }[];
}

export interface AccountantDashboardStats {
  role: 'ACCOUNTANT';
  total_invoiced: number;
  total_collected: number;
  total_outstanding: number;
  total_invoices_count: number;
  overdue_invoices_count: number;
  recent_payments: {
    id: string;
    receipt_number: string;
    amount: number;
    payment_method: string;
    payment_date?: string | null;
    student_name: string;
    invoice_number?: string | null;
  }[];
  recent_notices: DashboardNoticeItem[];
}

export interface TeacherDashboardStats {
  role: 'TEACHER';
  assigned_classes_count: number;
  total_students_taught: number;
  today_attendance_marked: boolean;
  pending_marks_entry: number;
  today_periods: {
    period_number: number;
    start_time: string;
    end_time: string;
    subject_name: string;
    class_name: string;
    section_name: string;
    room_number: string;
  }[];
  recent_notices: DashboardNoticeItem[];
}

export interface ParentDashboardStats {
  role: 'PARENT';
  children_count: number;
  children: {
    student_id: string;
    full_name: string;
    admission_number: string;
    class_name: string;
    section_name: string;
    attendance_percentage: number;
    outstanding_fee_amount: number;
  }[];
  total_outstanding_fees: number;
  recent_notices: DashboardNoticeItem[];
}

export interface StudentDashboardStats {
  role: 'STUDENT';
  attendance_percentage: number;
  fee_balance: number;
  recent_exam_score?: string | null;
  today_periods: {
    period_number: number;
    start_time: string;
    end_time: string;
    subject_name: string;
    teacher_name: string;
    room_number: string;
  }[];
  recent_notices: DashboardNoticeItem[];
}

export type DashboardStatsResponse =
  | AdminDashboardStats
  | AccountantDashboardStats
  | TeacherDashboardStats
  | ParentDashboardStats
  | StudentDashboardStats;

// --- Institutional Reports ---
export interface ClassDistributionItem {
  class_name: string;
  section_name: string;
  total: number;
  male?: number;
  female?: number;
}

export interface StudentReportItem {
  admission_number: string;
  full_name: string;
  class_name: string;
  section_name: string;
  roll_number?: string | null;
  gender: string;
  blood_group?: string | null;
  date_of_birth: string;
  admission_date: string;
  status: string;
}

export interface StudentDemographicsReport {
  total_students: number;
  gender_distribution: Record<string, number>;
  class_distribution: ClassDistributionItem[];
  status_distribution: Record<string, number>;
  students?: StudentReportItem[];
}

export interface DefaulterReportItem {
  student_name: string;
  admission_number: string;
  class_name: string;
  invoice_number?: string | null;
  title?: string | null;
  total_amount?: number;
  paid_amount?: number;
  balance_amount: number;
  due_date?: string | null;
  status?: string;
}

export interface FinancialSummaryReport {
  total_invoiced: number;
  total_collected: number;
  total_outstanding: number;
  collection_percentage: number;
  fee_type_breakdown?: { fee_type_name: string; total_amount: number }[];
  payment_method_breakdown?: { method: string; total_amount: number; count: number }[];
  defaulters: DefaulterReportItem[];
}

export interface ExaminationPerformanceReport {
  exam_name: string;
  total_students_evaluated: number;
  overall_pass_percentage: number;
  class_averages: {
    class_name: string;
    average_percentage: number;
    students_evaluated: number;
  }[];
  top_performers?: {
    student_name: string;
    class_name: string;
    percentage: number;
  }[];
}

export interface AttendanceAnalyticsReport {
  academic_year_name: string;
  month?: number | null;
  year?: number | null;
  class_attendance_summary: {
    class_name: string;
    section_name: string;
    total_registers: number;
    average_attendance_percentage: number;
  }[];
  low_attendance_students?: {
    student_name: string;
    admission_number: string;
    class_name: string;
    attendance_percentage: number;
    parent_phone?: string | null;
  }[];
}


