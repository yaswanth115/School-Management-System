import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Users,
  GraduationCap,
  ArrowLeft,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { AcademicYear, SchoolClass } from '../../types';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';

export const StudentAdmissionPage: React.FC = () => {
  const navigate = useNavigate();

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [nextAdmNo, setNextAdmNo] = useState<string>('Loading...');

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('2015-05-15');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Academic Enrollment
  const [academicYearId, setAcademicYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  // Primary Guardian
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('Father');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianOccupation, setGuardianOccupation] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [yearsRes, classesRes, admRes] = await Promise.all([
          apiClient.get('/academics/years'),
          apiClient.get('/academics/classes'),
          apiClient.get('/students/next-admission-number'),
        ]);

        setYears(yearsRes.data);
        setClasses(classesRes.data);
        setNextAdmNo(admRes.data.next_admission_number);

        const currentYear = yearsRes.data.find((y: AcademicYear) => y.is_current) || yearsRes.data[0];
        if (currentYear) setAcademicYearId(currentYear.id);

        if (classesRes.data.length > 0) {
          const firstCls = classesRes.data[0];
          setClassId(firstCls.id);
          if (firstCls.sections.length > 0) {
            setSectionId(firstCls.sections[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load admission form metadata', err);
      }
    };

    fetchMetadata();
  }, []);

  const selectedClass = classes.find((c) => c.id === classId);
  const availableSections = selectedClass?.sections || [];

  const handleClassChange = (cId: string) => {
    setClassId(cId);
    const cls = classes.find((c) => c.id === cId);
    if (cls && cls.sections.length > 0) {
      setSectionId(cls.sections[0].id);
    } else {
      setSectionId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academicYearId || !classId || !sectionId) {
      setError('Please assign student to an academic session, class, and section.');
      return;
    }
    setError(null);

    const payload = {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dob,
      gender,
      blood_group: bloodGroup || null,
      admission_date: admissionDate,
      address: address || null,
      city: city || null,
      emergency_contact: emergencyContact || null,
      academic_year_id: academicYearId,
      class_id: classId,
      section_id: sectionId,
      roll_number: rollNumber || null,
      primary_guardian: {
        full_name: guardianName,
        relationship_type: guardianRelation,
        phone: guardianPhone,
        email: guardianEmail || null,
        occupation: guardianOccupation || null,
      },
    };

    try {
      setIsLoading(true);
      const response = await apiClient.post('/students/admission', payload);
      navigate(`/students/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Admission process failed. Please check form entries.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/students')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Student Directory
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Student Admission & Enrollment</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Register a new student, link primary guardian contacts, and assign classroom placement.
          </p>
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-400 font-mono">System Assigned ID</p>
          <p className="text-base font-bold text-indigo-600 font-mono">{nextAdmNo}</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Student Information */}
        <Card title="1. Student Biographical Details" subtitle="Full personal information of student candidate">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="e.g. Leo"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Vance"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <Input
              label="Date of Birth"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
            <Select
              label="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' },
              ]}
            />
            <Select
              label="Blood Group (Optional)"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              options={[
                { value: 'A+', label: 'A+' },
                { value: 'A-', label: 'A-' },
                { value: 'B+', label: 'B+' },
                { value: 'B-', label: 'B-' },
                { value: 'O+', label: 'O+' },
                { value: 'O-', label: 'O-' },
                { value: 'AB+', label: 'AB+' },
                { value: 'AB-', label: 'AB-' },
              ]}
            />
            <Input
              label="Admission Date"
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              required
            />
            <Input
              label="City / Town"
              placeholder="e.g. Springfield"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              label="Emergency Phone"
              placeholder="+91 9876543210"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
            />
            <div className="sm:col-span-2">
              <Input
                label="Home Address"
                placeholder="Street address, apartment or landmark"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Step 2: Classroom & Academic Placement */}
        <Card title="2. Classroom Placement" subtitle="Designate session, grade level, and section assignment">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Academic Session"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              options={years.map((y) => ({
                value: y.id,
                label: `${y.name} ${y.is_current ? '(Current)' : ''}`,
              }))}
            />
            <Select
              label="Class Grade"
              value={classId}
              onChange={(e) => handleClassChange(e.target.value)}
              options={classes.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
            <Select
              label="Section"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              options={availableSections.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
            />
            <div className="sm:col-span-3">
              <Input
                label="Class Roll Number (Optional)"
                placeholder="e.g. 105"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                helperText="Can be assigned or updated at any point during the term."
              />
            </div>
          </div>
        </Card>

        {/* Step 3: Guardian Details */}
        <Card title="3. Primary Guardian Information" subtitle="Contact details of primary parent or legal guardian">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Guardian Full Name"
              placeholder="e.g. Thomas Vance"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              required
            />
            <Select
              label="Relationship to Student"
              value={guardianRelation}
              onChange={(e) => setGuardianRelation(e.target.value)}
              options={[
                { value: 'Father', label: 'Father' },
                { value: 'Mother', label: 'Mother' },
                { value: 'Guardian', label: 'Legal Guardian' },
              ]}
            />
            <Input
              label="Guardian Contact Phone"
              placeholder="+91 9876543210"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              required
            />
            <Input
              label="Guardian Email (Optional)"
              type="email"
              placeholder="guardian@example.com"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              helperText="Enables parent portal access linking in Phase 6."
            />
            <div className="sm:col-span-2">
              <Input
                label="Occupation / Profession"
                placeholder="e.g. Software Engineer / Accountant"
                value={guardianOccupation}
                onChange={(e) => setGuardianOccupation(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/students')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
            Complete Admission
          </Button>
        </div>
      </form>
    </div>
  );
};
