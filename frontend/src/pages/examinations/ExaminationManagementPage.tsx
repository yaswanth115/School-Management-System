import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Exam,
  ExamSchedule,
  ExamSubmissionBatch,
  GradingScale,
  SchoolClass,
  Section,
  AcademicYear,
  StudentReportCard,
  StudentMark,
  Student,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';

// Modals
import { CreateExamModal } from './CreateExamModal';
import { AddExamScheduleModal } from './AddExamScheduleModal';
import { ReviewMarksModal } from './ReviewMarksModal';
import { ReportCardModal } from './ReportCardModal';

export const ExaminationManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrPrincipal = user?.role === 'ADMIN' || user?.role === 'PRINCIPAL';
  const isTeacher = user?.role === 'TEACHER';

  const [activeTab, setActiveTab] = useState<'schedules' | 'marks_entry' | 'approvals' | 'report_cards' | 'grading_scales'>('schedules');

  // Metadata
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  // Tab 1: Schedules
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('');
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  // Tab 2: Marks Entry
  const [entryClassId, setEntryClassId] = useState<string>('');
  const [entrySectionId, setEntrySectionId] = useState<string>('');
  const [entryScheduleId, setEntryScheduleId] = useState<string>('');
  const [availableSchedulesForEntry, setAvailableSchedulesForEntry] = useState<ExamSchedule[]>([]);
  const [marksBatch, setMarksBatch] = useState<ExamSubmissionBatch | null>(null);
  const [editedMarks, setEditedMarks] = useState<Record<string, { marks_obtained: string; is_absent: boolean; remarks: string }>>({});
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isSavingMarks, setIsSavingMarks] = useState(false);

  // Tab 3: Principal Approvals
  const [pendingSubmissions, setPendingSubmissions] = useState<ExamSubmissionBatch[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [selectedBatchForReview, setSelectedBatchForReview] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Tab 4: Student Report Cards
  const [reportClassId, setReportClassId] = useState<string>('');
  const [reportSectionId, setReportSectionId] = useState<string>('');
  const [reportStudents, setReportStudents] = useState<Student[]>([]);
  const [isLoadingReportStudents, setIsLoadingReportStudents] = useState(false);
  const [activeReportCard, setActiveReportCard] = useState<StudentReportCard | null>(null);
  const [isLoadingReportCard, setIsLoadingReportCard] = useState(false);
  const [isReportCardModalOpen, setIsReportCardModalOpen] = useState(false);

  // Tab 5: Grading Scales
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [isLoadingScales, setIsLoadingScales] = useState(false);

  // Modals state
  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false);
  const [isAddScheduleModalOpen, setIsAddScheduleModalOpen] = useState(false);

  // Global state
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load initial academic years, classes, and exams
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [yearsRes, classesRes, examsRes] = await Promise.all([
        apiClient.get<AcademicYear[]>('/academics/years'),
        apiClient.get<SchoolClass[]>('/academics/classes'),
        apiClient.get<Exam[]>('/exams'),
      ]);

      setAcademicYears(yearsRes.data);
      setClasses(classesRes.data);
      setExams(examsRes.data);

      if (examsRes.data.length > 0) {
        setSelectedExamId(examsRes.data[0].id);
      }
      if (classesRes.data.length > 0) {
        setEntryClassId(classesRes.data[0].id);
        setReportClassId(classesRes.data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load initial exam metadata:', err);
      setNotification({ type: 'error', text: 'Failed to load examination initial data.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load schedules for Tab 1
  const loadSchedules = useCallback(async () => {
    if (!selectedExamId) {
      setSchedules([]);
      return;
    }
    try {
      setIsLoadingSchedules(true);
      let url = `/exams/${selectedExamId}/schedules`;
      if (selectedClassFilter) {
        url += `?class_id=${selectedClassFilter}`;
      }
      const res = await apiClient.get<ExamSchedule[]>(url);
      setSchedules(res.data);
    } catch (err: any) {
      console.error('Failed to load exam schedules:', err);
    } finally {
      setIsLoadingSchedules(false);
    }
  }, [selectedExamId, selectedClassFilter]);

  useEffect(() => {
    if (activeTab === 'schedules') {
      loadSchedules();
    }
  }, [activeTab, loadSchedules]);

  // Load pending approvals for Tab 3
  const loadPendingSubmissions = useCallback(async () => {
    if (!isAdminOrPrincipal) return;
    try {
      setIsLoadingSubmissions(true);
      const res = await apiClient.get<ExamSubmissionBatch[]>('/exams/submissions/pending');
      setPendingSubmissions(res.data);
    } catch (err: any) {
      console.error('Failed to load pending submissions:', err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [isAdminOrPrincipal]);

  useEffect(() => {
    if (activeTab === 'approvals' || isAdminOrPrincipal) {
      loadPendingSubmissions();
    }
  }, [activeTab, isAdminOrPrincipal, loadPendingSubmissions]);

  // Load grading scales for Tab 5
  const loadGradingScales = useCallback(async () => {
    try {
      setIsLoadingScales(true);
      const res = await apiClient.get<GradingScale[]>('/exams/grading-scales');
      setGradingScales(res.data);
    } catch (err: any) {
      console.error('Failed to load grading scales:', err);
    } finally {
      setIsLoadingScales(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'grading_scales') {
      loadGradingScales();
    }
  }, [activeTab, loadGradingScales]);

  // Update sections when entryClassId changes
  useEffect(() => {
    if (!entryClassId) {
      setSections([]);
      setEntrySectionId('');
      return;
    }
    const fetchSections = async () => {
      try {
        const res = await apiClient.get<Section[]>(`/academics/sections?class_id=${entryClassId}`);
        setSections(res.data);
        if (res.data.length > 0) {
          setEntrySectionId(res.data[0].id);
        } else {
          setEntrySectionId('');
        }
      } catch (err: any) {
        console.error('Failed to load sections:', err);
      }
    };
    fetchSections();
  }, [entryClassId]);

  // Update entry available schedules when selectedExamId or entryClassId changes
  useEffect(() => {
    if (!selectedExamId || !entryClassId) {
      setAvailableSchedulesForEntry([]);
      setEntryScheduleId('');
      return;
    }
    const fetchSchedulesForEntry = async () => {
      try {
        const res = await apiClient.get<ExamSchedule[]>(
          `/exams/${selectedExamId}/schedules?class_id=${entryClassId}`
        );
        setAvailableSchedulesForEntry(res.data);
        if (res.data.length > 0) {
          setEntryScheduleId(res.data[0].id);
        } else {
          setEntryScheduleId('');
        }
      } catch (err: any) {
        console.error('Failed to fetch class exam schedules:', err);
      }
    };
    fetchSchedulesForEntry();
  }, [selectedExamId, entryClassId]);

  // Load marks roster for Tab 2
  const loadMarksRoster = useCallback(async () => {
    if (!entryScheduleId || !entrySectionId) {
      setMarksBatch(null);
      setEditedMarks({});
      return;
    }

    try {
      setIsLoadingRoster(true);
      const res = await apiClient.get<ExamSubmissionBatch>(
        `/exams/schedules/${entryScheduleId}/sections/${entrySectionId}/marks`
      );
      setMarksBatch(res.data);

      // Pre-fill local state
      const initialMap: Record<string, { marks_obtained: string; is_absent: boolean; remarks: string }> = {};
      res.data.marks.forEach((m) => {
        initialMap[m.student_id] = {
          marks_obtained: m.marks_obtained !== null && m.marks_obtained !== undefined ? m.marks_obtained.toString() : '',
          is_absent: m.is_absent || false,
          remarks: m.remarks || '',
        };
      });
      setEditedMarks(initialMap);
    } catch (err: any) {
      console.error('Failed to load marks roster:', err);
      setNotification({ type: 'error', text: err.response?.data?.detail || 'Failed to load marks roster.' });
      setMarksBatch(null);
    } finally {
      setIsLoadingRoster(false);
    }
  }, [entryScheduleId, entrySectionId]);

  // Handle saving or submitting marks
  const handleSaveMarks = async (isSubmit: boolean) => {
    if (!entryScheduleId || !entrySectionId || !marksBatch) return;

    const maxMarks = Number(marksBatch.max_marks || 100);

    // Validate inputs
    const payloadItems = marksBatch.marks.map((m) => {
      const entry = editedMarks[m.student_id] || { marks_obtained: '', is_absent: false, remarks: '' };
      const score = entry.marks_obtained.trim() !== '' ? parseFloat(entry.marks_obtained) : null;

      if (!entry.is_absent && score !== null) {
        if (isNaN(score) || score < 0 || score > maxMarks) {
          throw new Error(`Score for ${m.student_name} must be between 0 and maximum marks (${maxMarks}).`);
        }
      }

      return {
        student_id: m.student_id,
        marks_obtained: entry.is_absent ? null : score,
        is_absent: entry.is_absent,
        remarks: entry.remarks.trim() || undefined,
      };
    });

    try {
      setIsSavingMarks(true);
      await apiClient.post(`/exams/schedules/${entryScheduleId}/sections/${entrySectionId}/marks`, {
        marks: payloadItems,
        is_submit: isSubmit,
      });

      setNotification({
        type: 'success',
        text: isSubmit
          ? 'Marks successfully submitted for Principal approval!'
          : 'Marks draft saved successfully.',
      });

      loadMarksRoster();
      loadPendingSubmissions();
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.message || err.response?.data?.detail || 'Failed to save marks.',
      });
    } finally {
      setIsSavingMarks(false);
    }
  };

  // Tab 4: Sections and Students for Report Cards
  const [reportSections, setReportSections] = useState<Section[]>([]);
  useEffect(() => {
    if (!reportClassId) {
      setReportSections([]);
      setReportSectionId('');
      return;
    }
    const fetchSections = async () => {
      try {
        const res = await apiClient.get<Section[]>(`/academics/sections?class_id=${reportClassId}`);
        setReportSections(res.data);
        if (res.data.length > 0) {
          setReportSectionId(res.data[0].id);
        } else {
          setReportSectionId('');
        }
      } catch (err: any) {
        console.error('Failed to load report card sections:', err);
      }
    };
    fetchSections();
  }, [reportClassId]);

  // Load students for report card tab
  const loadReportStudents = useCallback(async () => {
    if (!reportClassId || !reportSectionId) {
      setReportStudents([]);
      return;
    }
    try {
      setIsLoadingReportStudents(true);
      const res = await apiClient.get<Student[]>(
        `/students?class_id=${reportClassId}&section_id=${reportSectionId}&status=ACTIVE`
      );
      setReportStudents(res.data);
    } catch (err: any) {
      console.error('Failed to load students for report card:', err);
    } finally {
      setIsLoadingReportStudents(false);
    }
  }, [reportClassId, reportSectionId]);

  useEffect(() => {
    if (activeTab === 'report_cards') {
      loadReportStudents();
    }
  }, [activeTab, loadReportStudents]);

  // View individual report card
  const handleViewReportCard = async (studentId: string) => {
    if (!selectedExamId) {
      setNotification({ type: 'error', text: 'Please select an examination event.' });
      return;
    }

    try {
      setIsLoadingReportCard(true);
      const res = await apiClient.get<StudentReportCard>(
        `/exams/${selectedExamId}/report-cards/students/${studentId}`
      );
      setActiveReportCard(res.data);
      setIsReportCardModalOpen(true);
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to generate report card.',
      });
    } finally {
      setIsLoadingReportCard(false);
    }
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-7 h-7 text-indigo-600" />
            Examinations & Marks Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Conduct assessments, grade submissions with principal approval workflow, and generate official student report cards.
          </p>
        </div>

        {/* Header Actions */}
        {isAdminOrPrincipal && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddScheduleModalOpen(true)}
            >
              Add Schedule
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateExamModalOpen(true)}
            >
              Create Exam
            </Button>
          </div>
        )}
      </div>

      {/* Global Notification Banner */}
      {notification && (
        <Alert
          type={notification.type}
          message={notification.text}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Primary Navigation Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'schedules'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Exams & Timetables
          </button>

          <button
            onClick={() => setActiveTab('marks_entry')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'marks_entry'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Marks Entry Roster
          </button>

          {isAdminOrPrincipal && (
            <button
              onClick={() => setActiveTab('approvals')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap transition-colors relative ${
                activeTab === 'approvals'
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              Principal Approvals
              {pendingSubmissions.length > 0 && (
                <span className="ml-1.5 px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white animate-pulse">
                  {pendingSubmissions.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('report_cards')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'report_cards'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Printer className="w-4 h-4" />
            Student Report Cards
          </button>

          <button
            onClick={() => setActiveTab('grading_scales')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'grading_scales'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            Grading Scales
          </button>
        </div>
      </div>

      {/* Global Exam Selector Bar for Tabs that need it */}
      {(activeTab === 'schedules' || activeTab === 'marks_entry' || activeTab === 'report_cards') && (
        <Card className="p-4 bg-slate-50/70 border border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                Select Exam Event:
              </label>
              <select
                className="w-full sm:w-80 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.exam_type})
                  </option>
                ))}
              </select>
            </div>

            {selectedExam && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 font-semibold text-indigo-700">
                  <Calendar className="w-3.5 h-3.5" />
                  {selectedExam.start_date} to {selectedExam.end_date}
                </span>
                <span className="text-slate-300">|</span>
                <span className="font-medium text-slate-700">
                  Session: {selectedExam.academic_year_name || 'Current'}
                </span>
                <Badge variant={selectedExam.is_active ? 'emerald' : 'slate'}>
                  {selectedExam.is_active ? 'Active' : 'Archived'}
                </Badge>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ========================================================= */}
      {/* TAB 1: EXAMS & TIMETABLES */}
      {/* ========================================================= */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-slate-500">
              Showing {schedules.length} scheduled exam papers
            </span>
          </div>

          {isLoadingSchedules ? (
            <div className="py-16 flex justify-center">
              <Spinner size="lg" label="Loading exam schedule timetable..." />
            </div>
          ) : schedules.length === 0 ? (
            <Card className="py-12 text-center">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No schedules configured</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                No subject schedules have been assigned for this examination event yet.
              </p>
              {isAdminOrPrincipal && (
                <Button
                  variant="primary"
                  className="mt-4"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsAddScheduleModalOpen(true)}
                >
                  Schedule First Subject
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedules.map((item) => (
                <Card key={item.id} className="p-5 border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-mono font-semibold text-indigo-600 block">
                        {item.subject_code}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base">{item.subject_name}</h3>
                    </div>
                    <Badge variant="purple">{item.class_name}</Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Date: <strong>{item.exam_date}</strong>
                      </span>
                    </div>
                    {(item.start_time || item.end_time) && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Time: {item.start_time || '--'} - {item.end_time || '--'}
                        </span>
                      </div>
                    )}
                    {item.room_number && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono text-[11px]">ROOM:</span>
                        <span className="font-semibold text-slate-800">{item.room_number}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block">Pass / Max</span>
                      <span className="font-bold text-slate-800">
                        {Number(item.pass_marks)} / {Number(item.max_marks)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveTab('marks_entry');
                        setEntryClassId(item.class_id);
                        setEntryScheduleId(item.id);
                      }}
                    >
                      Enter Marks
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MARKS ENTRY ROSTER */}
      {/* ========================================================= */}
      {activeTab === 'marks_entry' && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Class Grade</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={entryClassId}
                  onChange={(e) => setEntryClassId(e.target.value)}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Section</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={entrySectionId}
                  onChange={(e) => setEntrySectionId(e.target.value)}
                  disabled={sections.length === 0}
                >
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Subject Exam Schedule</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={entryScheduleId}
                  onChange={(e) => setEntryScheduleId(e.target.value)}
                  disabled={availableSchedulesForEntry.length === 0}
                >
                  {availableSchedulesForEntry.length === 0 ? (
                    <option value="">No schedules for class</option>
                  ) : (
                    availableSchedulesForEntry.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subject_name} ({s.exam_date})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={!entryScheduleId || !entrySectionId || isLoadingRoster}
                  isLoading={isLoadingRoster}
                  onClick={loadMarksRoster}
                >
                  Load Student Roster
                </Button>
              </div>
            </div>
          </Card>

          {/* Roster & Batch Content */}
          {isLoadingRoster ? (
            <div className="py-16 flex justify-center">
              <Spinner size="lg" label="Loading student examination roster..." />
            </div>
          ) : !marksBatch ? (
            <Card className="py-12 text-center">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No Roster Selected</h3>
              <p className="text-sm text-slate-500 mt-1">
                Choose a Class, Section, and Subject Exam Schedule above, then click &ldquo;Load Student Roster&rdquo;.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Batch Status Alert */}
              {marksBatch.status === 'APPROVED' && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-bold text-emerald-900 block">Marks Submission Approved</span>
                    <span className="text-emerald-700">
                      Approved by {marksBatch.reviewed_by_name || 'Principal'} on{' '}
                      {marksBatch.reviewed_at ? new Date(marksBatch.reviewed_at).toLocaleDateString() : 'N/A'}. Scores
                      are locked and published for report cards.
                    </span>
                  </div>
                </div>
              )}

              {marksBatch.status === 'RETURNED' && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
                  <RotateCcw className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-bold text-amber-900 block">Marks Returned for Correction</span>
                    <span className="text-amber-800">
                      Reviewer feedback: &ldquo;{marksBatch.review_comments || 'Please recheck scores.'}&rdquo;
                    </span>
                  </div>
                </div>
              )}

              {marksBatch.status === 'SUBMITTED' && (
                <div className="p-4 bg-blue-50 border border-blue-300 rounded-xl flex items-center gap-3">
                  <UserCheck className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-bold text-blue-900 block">Pending Principal Review</span>
                    <span className="text-blue-700">
                      Submitted by {marksBatch.submitted_by_name || 'Teacher'}. Awaiting approval before grades are
                      finalized.
                    </span>
                  </div>
                </div>
              )}

              {/* Roster Table Card */}
              <Card className="overflow-hidden border border-slate-200">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {marksBatch.subject_name} — Class {marksBatch.class_name} ({marksBatch.section_name})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Maximum Marks: <strong className="text-slate-800">{Number(marksBatch.max_marks)}</strong> | Pass
                      Cutoff: <strong className="text-slate-800">{Number(marksBatch.pass_marks)}</strong>
                    </p>
                  </div>

                  <Badge
                    variant={
                      marksBatch.status === 'APPROVED'
                        ? 'emerald'
                        : marksBatch.status === 'SUBMITTED'
                        ? 'blue'
                        : marksBatch.status === 'RETURNED'
                        ? 'amber'
                        : 'slate'
                    }
                  >
                    Status: {marksBatch.status}
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                      <tr>
                        <th className="py-3 px-4">Roll / Adm</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4 text-center">Absent?</th>
                        <th className="py-3 px-4 w-40">Marks (0 - {Number(marksBatch.max_marks)})</th>
                        <th className="py-3 px-4 text-center">Grade</th>
                        <th className="py-3 px-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {marksBatch.marks.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                            No active students found in this section.
                          </td>
                        </tr>
                      ) : (
                        marksBatch.marks.map((student) => {
                          const currentEntry = editedMarks[student.student_id] || {
                            marks_obtained: '',
                            is_absent: false,
                            remarks: '',
                          };
                          const isLocked = marksBatch.status === 'APPROVED';

                          return (
                            <tr key={student.student_id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-mono text-xs text-slate-600">
                                {student.roll_number || student.admission_number}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-900">
                                {student.student_name}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:opacity-50"
                                  checked={currentEntry.is_absent}
                                  disabled={isLocked}
                                  onChange={(e) => {
                                    setEditedMarks((prev) => ({
                                      ...prev,
                                      [student.student_id]: {
                                        ...prev[student.student_id],
                                        is_absent: e.target.checked,
                                        marks_obtained: e.target.checked ? '' : prev[student.student_id]?.marks_obtained || '',
                                      },
                                    }));
                                  }}
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  min="0"
                                  max={Number(marksBatch.max_marks)}
                                  step="0.5"
                                  className={`w-full px-2.5 py-1.5 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 ${
                                    currentEntry.is_absent ? 'bg-slate-100 text-slate-400' : 'border-slate-300'
                                  }`}
                                  placeholder={currentEntry.is_absent ? 'ABSENT' : 'Score'}
                                  value={currentEntry.is_absent ? '' : currentEntry.marks_obtained}
                                  disabled={isLocked || currentEntry.is_absent}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditedMarks((prev) => ({
                                      ...prev,
                                      [student.student_id]: {
                                        ...prev[student.student_id],
                                        marks_obtained: val,
                                      },
                                    }));
                                  }}
                                />
                              </td>
                              <td className="py-3 px-4 text-center font-bold text-indigo-600">
                                {student.is_absent ? 'AB' : student.grade || '-'}
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                                  placeholder="e.g. Excellent, Needs help in algebra"
                                  value={currentEntry.remarks}
                                  disabled={isLocked}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditedMarks((prev) => ({
                                      ...prev,
                                      [student.student_id]: {
                                        ...prev[student.student_id],
                                        remarks: val,
                                      },
                                    }));
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Actions */}
                {marksBatch.status !== 'APPROVED' && marksBatch.marks.length > 0 && (
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      Saving draft allows ongoing edits. Submitting sends the batch to the Principal review queue.
                    </p>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        isLoading={isSavingMarks}
                        disabled={isSavingMarks}
                        onClick={() => handleSaveMarks(false)}
                      >
                        Save Draft
                      </Button>
                      <Button
                        variant="primary"
                        leftIcon={<UserCheck className="w-4 h-4" />}
                        isLoading={isSavingMarks}
                        disabled={isSavingMarks}
                        onClick={() => handleSaveMarks(true)}
                      >
                        Submit for Principal Review
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PRINCIPAL APPROVALS QUEUE */}
      {/* ========================================================= */}
      {activeTab === 'approvals' && isAdminOrPrincipal && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              Teacher Marks Submissions Pending Approval ({pendingSubmissions.length})
            </h3>
            <Button variant="outline" size="sm" onClick={loadPendingSubmissions} isLoading={isLoadingSubmissions}>
              Refresh Queue
            </Button>
          </div>

          {isLoadingSubmissions ? (
            <div className="py-16 flex justify-center">
              <Spinner size="lg" label="Loading approval queue..." />
            </div>
          ) : pendingSubmissions.length === 0 ? (
            <Card className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Review Queue Clear</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                No marks submissions are currently waiting for Principal approval. All evaluated marks have been
                reviewed.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingSubmissions.map((batch) => (
                <Card key={batch.id} className="p-5 border border-slate-200">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                        {batch.exam_name}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-0.5">
                        {batch.subject_name} — Class {batch.class_name} ({batch.section_name})
                      </h4>
                    </div>
                    <Badge variant="blue">SUBMITTED</Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 py-3 border-y border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Submitted By:</span>
                      <span className="font-semibold text-slate-800">{batch.submitted_by_name || 'Subject Teacher'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Max / Pass Marks:</span>
                      <span className="font-semibold text-slate-800">
                        {Number(batch.max_marks)} / {Number(batch.pass_marks)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Submission Date:</span>
                      <span className="font-semibold text-slate-800">
                        {batch.submitted_at ? new Date(batch.submitted_at).toLocaleDateString() : 'Today'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<UserCheck className="w-4 h-4" />}
                      onClick={() => {
                        setSelectedBatchForReview(batch.id);
                        setIsReviewModalOpen(true);
                      }}
                    >
                      Review & Approve
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: STUDENT REPORT CARDS */}
      {/* ========================================================= */}
      {activeTab === 'report_cards' && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Class</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={reportClassId}
                  onChange={(e) => setReportClassId(e.target.value)}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Section</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={reportSectionId}
                  onChange={(e) => setReportSectionId(e.target.value)}
                  disabled={reportSections.length === 0}
                >
                  {reportSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={!reportClassId || !reportSectionId || isLoadingReportStudents}
                  isLoading={isLoadingReportStudents}
                  onClick={loadReportStudents}
                >
                  Filter Students
                </Button>
              </div>
            </div>
          </Card>

          {isLoadingReportStudents ? (
            <div className="py-16 flex justify-center">
              <Spinner size="lg" label="Loading students..." />
            </div>
          ) : reportStudents.length === 0 ? (
            <Card className="py-12 text-center">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No Students Found</h3>
              <p className="text-sm text-slate-500 mt-1">
                Select a class and section to view student report cards.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden border border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">
                  Enrolled Students in Section ({reportStudents.length})
                </span>
                <span className="text-xs text-slate-500">
                  Select a student to generate their terminal report card.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                    <tr>
                      <th className="py-3 px-4">Admission No</th>
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Gender</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                          {st.admission_number}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">
                          {st.current_roll_number || 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{st.full_name}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">{st.gender}</td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Printer className="w-3.5 h-3.5 text-indigo-600" />}
                            onClick={() => handleViewReportCard(st.id)}
                            isLoading={isLoadingReportCard}
                          >
                            View Report Card
                          </Button>
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
      {/* TAB 5: GRADING SCALES */}
      {/* ========================================================= */}
      {activeTab === 'grading_scales' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Configured Academic Grading Scales
            </h3>
          </div>

          {isLoadingScales ? (
            <div className="py-16 flex justify-center">
              <Spinner size="lg" label="Loading grading scales..." />
            </div>
          ) : gradingScales.length === 0 ? (
            <Card className="py-12 text-center">
              <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No Grading Scale Found</h3>
              <p className="text-sm text-slate-500 mt-1">Default scale has not been configured.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {gradingScales.map((scale) => (
                <Card key={scale.id} className="border border-slate-200 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{scale.name}</h4>
                      <p className="text-xs text-slate-500">{scale.description || 'Institutional scale'}</p>
                    </div>
                    {scale.is_default && <Badge variant="emerald">Default System Scale</Badge>}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                        <tr>
                          <th className="py-2.5 px-4">Grade</th>
                          <th className="py-2.5 px-4 text-center">Percentage Range</th>
                          <th className="py-2.5 px-4 text-center">Grade Point</th>
                          <th className="py-2.5 px-4">Performance Descriptor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {scale.rules.map((rule) => (
                          <tr key={rule.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-bold text-indigo-700">{rule.grade}</td>
                            <td className="py-2.5 px-4 text-center font-mono text-slate-800">
                              {Number(rule.min_percentage)}% &ndash; {Number(rule.max_percentage)}%
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold text-slate-900">
                              {Number(rule.grade_point).toFixed(1)}
                            </td>
                            <td className="py-2.5 px-4 text-xs text-slate-600">{rule.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}
      <CreateExamModal
        isOpen={isCreateExamModalOpen}
        onClose={() => setIsCreateExamModalOpen(false)}
        academicYears={academicYears}
        onSuccess={() => {
          setNotification({ type: 'success', text: 'Examination event successfully created!' });
          loadInitialData();
        }}
      />

      <AddExamScheduleModal
        isOpen={isAddScheduleModalOpen}
        onClose={() => setIsAddScheduleModalOpen(false)}
        exams={exams}
        classes={classes}
        defaultExamId={selectedExamId}
        onSuccess={() => {
          setNotification({ type: 'success', text: 'Subject exam schedule added!' });
          loadSchedules();
        }}
      />

      <ReviewMarksModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedBatchForReview(null);
        }}
        batchId={selectedBatchForReview}
        onSuccess={() => {
          setNotification({ type: 'success', text: 'Marks submission reviewed successfully.' });
          loadPendingSubmissions();
          loadMarksRoster();
        }}
      />

      <ReportCardModal
        isOpen={isReportCardModalOpen}
        onClose={() => {
          setIsReportCardModalOpen(false);
          setActiveReportCard(null);
        }}
        reportCard={activeReportCard}
      />
    </div>
  );
};
