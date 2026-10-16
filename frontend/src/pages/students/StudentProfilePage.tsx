import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { StudentDetail, AcademicYear, SchoolClass } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { StudentPromotionModal } from './StudentPromotionModal';
import { StudentStatusModal } from './StudentStatusModal';

export const StudentProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const fetchStudentData = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const [studentRes, yearsRes, classesRes] = await Promise.all([
        apiClient.get(`/students/${id}`),
        apiClient.get('/academics/years'),
        apiClient.get('/academics/classes'),
      ]);

      setStudent(studentRes.data);
      setYears(yearsRes.data);
      setClasses(classesRes.data);
    } catch (err) {
      console.error('Failed to load student profile', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  if (isLoading || !student) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Spinner size="lg" label="Loading student record..." />
      </div>
    );
  }

  const latestEnrollment = student.enrollment_history[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/students')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Students Directory
        </button>
      </div>

      {notification && (
        <Alert type="success" message={notification} onClose={() => setNotification(null)} />
      )}

      {/* Student Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-indigo-100 text-indigo-700 font-extrabold text-2xl flex items-center justify-center shadow-xs shrink-0">
            {student.first_name.charAt(0)}{student.last_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900">{student.full_name}</h1>
              <Badge variant={student.status === 'ACTIVE' ? 'emerald' : 'amber'}>
                {student.status}
              </Badge>
            </div>
            <p className="text-xs font-mono text-slate-500 mt-1">
              Admission ID: <span className="font-bold text-slate-800">{student.admission_number}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-600">
              <span className="font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                {student.current_class_name} • {student.current_section_name}
              </span>
              <span>Roll: <strong>{student.current_roll_number || 'Unassigned'}</strong></span>
              <span>•</span>
              <span>Admitted: {new Date(student.admission_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsStatusOpen(true)}
          >
            Update Status
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsPromoOpen(true)}
            rightIcon={<ArrowUpRight className="w-4 h-4" />}
          >
            Promote Student
          </Button>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Personal Information & Guardians */}
        <div className="md:col-span-1 space-y-6">
          <Card title="Biographical Information">
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Gender</span>
                <span className="font-medium text-slate-800">{student.gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Date of Birth</span>
                <span className="font-medium text-slate-800">{new Date(student.date_of_birth).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Blood Group</span>
                <span className="font-medium text-slate-800">{student.blood_group || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Emergency Contact</span>
                <span className="font-medium text-slate-800">{student.emergency_contact || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Address</span>
                <span className="font-medium text-slate-800">{student.address || '—'}, {student.city || ''}</span>
              </div>
            </div>
          </Card>

          <Card title="Guardians & Contacts">
            <div className="space-y-3">
              {student.guardians.map((g) => (
                <div key={g.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{g.full_name}</span>
                    <Badge variant="indigo">{g.relationship_type}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 pt-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{g.phone}</span>
                  </div>
                  {g.email && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{g.email}</span>
                    </div>
                  )}
                  {g.occupation && (
                    <p className="text-[11px] text-slate-400 pt-0.5">{g.occupation}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Historical Enrollment Timeline */}
        <div className="md:col-span-2">
          <Card
            title="Historical Enrollment Timeline"
            subtitle="Permanent multi-year record of all grade promotions, sections, and remarks"
          >
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {student.enrollment_history.map((hist, index) => (
                <div key={hist.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                      index === 0 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${index === 0 ? 'bg-indigo-600' : 'bg-slate-400'}`} />
                  </div>

                  {/* Content card */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{hist.class_name} • {hist.section_name}</span>
                        {index === 0 && <Badge variant="emerald">Current</Badge>}
                      </div>
                      <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {hist.academic_year_name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-500">
                      <div>
                        Status: <strong className="text-slate-700">{hist.status}</strong>
                      </div>
                      <div>
                        Roll Number: <strong className="text-slate-700">{hist.roll_number || '—'}</strong>
                      </div>
                    </div>

                    {hist.remarks && (
                      <p className="text-xs text-slate-600 mt-2 italic bg-white p-2 rounded border border-slate-100">
                        "{hist.remarks}"
                      </p>
                    )}

                    <p className="text-[10px] text-slate-400 mt-2">
                      Recorded on: {new Date(hist.enrolled_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <StudentPromotionModal
        studentId={student.id}
        studentName={student.full_name}
        years={years}
        classes={classes}
        isOpen={isPromoOpen}
        onClose={() => setIsPromoOpen(false)}
        onSuccess={() => {
          setNotification('Student successfully promoted to new academic grade!');
          fetchStudentData();
        }}
      />

      <StudentStatusModal
        studentId={student.id}
        studentName={student.full_name}
        currentStatus={student.status}
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        onSuccess={() => {
          setNotification('Student status successfully updated!');
          fetchStudentData();
        }}
      />
    </div>
  );
};
