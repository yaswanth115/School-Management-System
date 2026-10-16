import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { AcademicYear, SchoolClass, Subject } from '../../types';

interface AssignTeacherModalProps {
  years: AcademicYear[];
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Array<{ id: string; full_name: string; email: string }>;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignTeacherModal: React.FC<AssignTeacherModalProps> = ({
  years,
  classes,
  subjects,
  teachers,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const currentYear = years.find((y) => y.is_current) || years[0];

  const [selectedYearId, setSelectedYearId] = useState(currentYear?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || '');
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedSectionId, setSelectedSectionId] = useState(classes[0]?.sections[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter sections based on selected class
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const availableSections = selectedClass?.sections || [];

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const cls = classes.find((c) => c.id === classId);
    if (cls && cls.sections.length > 0) {
      setSelectedSectionId(cls.sections[0].id);
    } else {
      setSelectedSectionId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYearId || !selectedTeacherId || !selectedClassId || !selectedSectionId || !selectedSubjectId) {
      setError('All fields are required to establish an assignment.');
      return;
    }
    setError(null);

    try {
      setIsLoading(true);
      await apiClient.post('/academics/assignments', {
        teacher_id: selectedTeacherId,
        class_id: selectedClassId,
        section_id: selectedSectionId,
        subject_id: selectedSubjectId,
        academic_year_id: selectedYearId,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create teacher assignment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Teacher to Class & Subject"
      description="Designate an instructor for a specific classroom section."
      maxWidth="lg"
    >
      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Academic Year Session"
          value={selectedYearId}
          onChange={(e) => setSelectedYearId(e.target.value)}
          options={years.map((y) => ({
            value: y.id,
            label: `${y.name} ${y.is_current ? '(Current)' : ''}`,
          }))}
        />

        <Select
          label="Teacher / Faculty Member"
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          options={teachers.map((t) => ({
            value: t.id,
            label: `${t.full_name} (${t.email})`,
          }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Class Grade"
            value={selectedClassId}
            onChange={(e) => handleClassChange(e.target.value)}
            options={classes.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />

          <Select
            label="Section"
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            options={availableSections.map((s) => ({
              value: s.id,
              label: s.name,
            }))}
          />
        </div>

        <Select
          label="Subject"
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          options={subjects.map((sub) => ({
            value: sub.id,
            label: `${sub.name} (${sub.code})`,
          }))}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Create Assignment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
