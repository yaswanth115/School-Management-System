import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Layers,
  BookOpen,
  UserCheck,
  Plus,
  CheckCircle,
  Building2,
  Users,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { AcademicYear, SchoolClass, Subject, TeacherAssignment } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { Table, Column } from '../../components/ui/Table';

// Modals
import { AddAcademicYearModal } from './AddAcademicYearModal';
import { AddClassModal } from './AddClassModal';
import { AddSectionModal } from './AddSectionModal';
import { AddSubjectModal } from './AddSubjectModal';
import { AssignTeacherModal } from './AssignTeacherModal';

export const AcademicManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'years' | 'classes' | 'subjects' | 'assignments'>('classes');

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals state
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [selectedClassForSection, setSelectedClassForSection] = useState<{ id: string; name: string } | null>(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const fetchAcademicsData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [yearsRes, classesRes, subjectsRes, assignmentsRes, teachersRes] = await Promise.all([
        apiClient.get('/academics/years'),
        apiClient.get('/academics/classes'),
        apiClient.get('/academics/subjects'),
        apiClient.get('/academics/assignments'),
        apiClient.get('/users?role=TEACHER&page_size=100'),
      ]);

      setYears(yearsRes.data);
      setClasses(classesRes.data);
      setSubjects(subjectsRes.data);
      setAssignments(assignmentsRes.data);
      setTeachers(teachersRes.data.items);
    } catch (err) {
      console.error('Failed to load academic management data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademicsData();
  }, [fetchAcademicsData]);

  const handleSetCurrentYear = async (yearId: string) => {
    try {
      await apiClient.post(`/academics/years/${yearId}/current`);
      setNotification('Active academic year updated successfully.');
      fetchAcademicsData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to set active year.');
    }
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Spinner size="lg" label="Loading academic structures..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Academic Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure academic sessions, grade classes, classroom sections, and teacher assignments.
          </p>
        </div>

        {/* Action Button mapped to current tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'years' && (
            <Button variant="primary" onClick={() => setIsYearModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              New Academic Year
            </Button>
          )}
          {activeTab === 'classes' && (
            <Button variant="primary" onClick={() => setIsClassModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Add Class Grade
            </Button>
          )}
          {activeTab === 'subjects' && (
            <Button variant="primary" onClick={() => setIsSubjectModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              New Subject
            </Button>
          )}
          {activeTab === 'assignments' && (
            <Button variant="primary" onClick={() => setIsAssignModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Assign Teacher
            </Button>
          )}
        </div>
      </div>

      {notification && (
        <Alert type="success" message={notification} onClose={() => setNotification(null)} />
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        {[
          { key: 'classes', label: 'Classes & Sections', icon: <Layers className="w-4 h-4" />, count: classes.length },
          { key: 'subjects', label: 'Subjects Catalog', icon: <BookOpen className="w-4 h-4" />, count: subjects.length },
          { key: 'assignments', label: 'Teacher Assignments', icon: <UserCheck className="w-4 h-4" />, count: assignments.length },
          { key: 'years', label: 'Academic Years', icon: <Calendar className="w-4 h-4" />, count: years.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB 1: CLASSES & SECTIONS */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <Card
              key={cls.id}
              className="hover:border-indigo-200 transition-all shadow-xs"
              title={cls.name}
              subtitle={`Level ${cls.numeric_order} • ${cls.sections.length} Sections`}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedClassForSection({ id: cls.id, name: cls.name });
                    setIsSectionModalOpen(true);
                  }}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Section
                </Button>
              }
            >
              <div className="space-y-2">
                {cls.sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="font-semibold text-slate-800">{sec.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>{sec.room_number || 'Room TBD'}</span>
                      <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                        Cap: {sec.capacity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 2: SUBJECTS */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((sub) => (
            <Card key={sub.id} className="hover:border-slate-300 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {sub.code}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mt-2">{sub.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{sub.description || 'Core curriculum course'}</p>
                </div>
                <Badge variant={sub.subject_type === 'Core' ? 'indigo' : 'purple'}>
                  {sub.subject_type}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 3: TEACHER ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <Table<TeacherAssignment>
          columns={[
            {
              key: 'teacher',
              header: 'Teacher / Instructor',
              render: (a) => (
                <div>
                  <p className="font-semibold text-slate-900 leading-tight">{a.teacher_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.teacher_email}</p>
                </div>
              ),
            },
            {
              key: 'class',
              header: 'Class Grade',
              render: (a) => <span className="font-medium text-slate-800">{a.class_name}</span>,
            },
            {
              key: 'section',
              header: 'Section',
              render: (a) => <span className="text-xs text-slate-600">{a.section_name}</span>,
            },
            {
              key: 'subject',
              header: 'Subject',
              render: (a) => (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                    {a.subject_code}
                  </span>
                  <span className="text-sm font-medium text-slate-900">{a.subject_name}</span>
                </div>
              ),
            },
            {
              key: 'year',
              header: 'Academic Session',
              render: (a) => <span className="text-xs font-mono text-slate-500">{a.academic_year_name}</span>,
            },
          ]}
          data={assignments}
          emptyMessage="No teacher assignments registered yet"
        />
      )}

      {/* TAB 4: ACADEMIC YEARS */}
      {activeTab === 'years' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {years.map((y) => (
            <Card
              key={y.id}
              className={`transition-all ${
                y.is_current ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-sm' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-slate-900 font-mono">{y.name}</span>
                {y.is_current ? (
                  <Badge variant="emerald">Active Session</Badge>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => handleSetCurrentYear(y.id)}>
                    Set Active
                  </Button>
                )}
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <p>Start Date: <strong className="text-slate-800">{new Date(y.start_date).toLocaleDateString()}</strong></p>
                <p>End Date: <strong className="text-slate-800">{new Date(y.end_date).toLocaleDateString()}</strong></p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODALS */}
      <AddAcademicYearModal
        isOpen={isYearModalOpen}
        onClose={() => setIsYearModalOpen(false)}
        onSuccess={() => {
          setNotification('Academic session created successfully!');
          fetchAcademicsData();
        }}
      />

      <AddClassModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        onSuccess={() => {
          setNotification('Class grade created successfully!');
          fetchAcademicsData();
        }}
      />

      <AddSectionModal
        classId={selectedClassForSection?.id || null}
        className={selectedClassForSection?.name || null}
        isOpen={isSectionModalOpen}
        onClose={() => {
          setIsSectionModalOpen(false);
          setSelectedClassForSection(null);
        }}
        onSuccess={() => {
          setNotification('Section added successfully!');
          fetchAcademicsData();
        }}
      />

      <AddSubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSuccess={() => {
          setNotification('Subject defined successfully!');
          fetchAcademicsData();
        }}
      />

      <AssignTeacherModal
        years={years}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={() => {
          setNotification('Teacher assigned successfully!');
          fetchAcademicsData();
        }}
      />
    </div>
  );
};
