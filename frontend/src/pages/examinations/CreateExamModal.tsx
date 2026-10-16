import React, { useState } from 'react';
import { AcademicYear, ExamType } from '../../types';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';

interface CreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYears: AcademicYear[];
  onSuccess: () => void;
}

export const CreateExamModal: React.FC<CreateExamModalProps> = ({
  isOpen,
  onClose,
  academicYears,
  onSuccess,
}) => {
  const [academicYearId, setAcademicYearId] = useState('');
  const [name, setName] = useState('');
  const [examType, setExamType] = useState<ExamType>('MIDTERM');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default academic year if available
  React.useEffect(() => {
    if (academicYears.length > 0 && !academicYearId) {
      const activeYear = academicYears.find((y) => y.is_current) || academicYears[0];
      setAcademicYearId(activeYear.id);
    }
  }, [academicYears, academicYearId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!academicYearId) {
      setError('Please select an academic year.');
      return;
    }
    if (!name.trim()) {
      setError('Please provide an exam title.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start date and end date are required.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/exams', {
        academic_year_id: academicYearId,
        name: name.trim(),
        exam_type: examType,
        start_date: startDate,
        end_date: endDate,
        description: description.trim() || undefined,
      });

      onSuccess();
      onClose();
      setName('');
      setDescription('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create examination. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Examination Event"
      description="Define an examination term and scheduling window across academic subjects."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <Select
          label="Academic Year"
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          options={academicYears.map((y) => ({
            value: y.id,
            label: `${y.name} ${y.is_current ? '(Current Active)' : ''}`,
          }))}
          required
        />

        <Input
          label="Examination Name"
          placeholder="e.g. Term 1 Midterm Examinations (2026-2027)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Select
          label="Exam Assessment Type"
          value={examType}
          onChange={(e) => setExamType(e.target.value as ExamType)}
          options={[
            { value: 'UNIT_TEST', label: 'Unit Test' },
            { value: 'MIDTERM', label: 'Midterm Examination' },
            { value: 'FINAL', label: 'Annual / Final Examination' },
            { value: 'PRACTICAL', label: 'Practical / Lab Assessment' },
            { value: 'QUIZ', label: 'Classroom Quiz' },
          ]}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Exam Description & Guidelines (Optional)
          </label>
          <textarea
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
            placeholder="e.g. Covers Units 1 to 5; Calculators permitted for Physics & Chemistry."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create Examination
          </Button>
        </div>
      </form>
    </Modal>
  );
};
