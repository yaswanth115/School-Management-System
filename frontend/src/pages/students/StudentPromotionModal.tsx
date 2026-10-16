import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { AcademicYear, SchoolClass } from '../../types';

interface StudentPromotionModalProps {
  studentId: string;
  studentName: string;
  years: AcademicYear[];
  classes: SchoolClass[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StudentPromotionModal: React.FC<StudentPromotionModalProps> = ({
  studentId,
  studentName,
  years,
  classes,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [targetYearId, setTargetYearId] = useState(years[0]?.id || '');
  const [targetClassId, setTargetClassId] = useState(classes[0]?.id || '');
  const [targetSectionId, setTargetSectionId] = useState(classes[0]?.sections[0]?.id || '');
  const [rollNumber, setRollNumber] = useState('');
  const [remarks, setRemarks] = useState('Promoted to next grade');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClass = classes.find((c) => c.id === targetClassId);
  const availableSections = selectedClass?.sections || [];

  const handleClassChange = (classId: string) => {
    setTargetClassId(classId);
    const cls = classes.find((c) => c.id === classId);
    if (cls && cls.sections.length > 0) {
      setTargetSectionId(cls.sections[0].id);
    } else {
      setTargetSectionId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetYearId || !targetClassId || !targetSectionId) {
      setError('Please select target academic year, class, and section.');
      return;
    }
    setError(null);

    try {
      setIsLoading(true);
      await apiClient.post(`/students/${studentId}/promote`, {
        target_academic_year_id: targetYearId,
        target_class_id: targetClassId,
        target_section_id: targetSectionId,
        roll_number: rollNumber || null,
        remarks: remarks || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to promote student.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Promote Student: ${studentName}`}
      description="Advance student to the next academic session while permanently preserving previous enrollment history."
    >
      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Target Academic Year"
          value={targetYearId}
          onChange={(e) => setTargetYearId(e.target.value)}
          options={years.map((y) => ({
            value: y.id,
            label: `${y.name} ${y.is_current ? '(Active)' : ''}`,
          }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Target Class"
            value={targetClassId}
            onChange={(e) => handleClassChange(e.target.value)}
            options={classes.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />

          <Select
            label="Target Section"
            value={targetSectionId}
            onChange={(e) => setTargetSectionId(e.target.value)}
            options={availableSections.map((s) => ({
              value: s.id,
              label: s.name,
            }))}
          />
        </div>

        <Input
          label="New Roll Number"
          placeholder="e.g. 102"
          value={rollNumber}
          onChange={(e) => setRollNumber(e.target.value)}
        />

        <Input
          label="Promotion Remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Confirm Promotion
          </Button>
        </div>
      </form>
    </Modal>
  );
};
