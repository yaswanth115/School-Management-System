import React, { useState, useEffect } from 'react';
import { Exam, SchoolClass, Subject } from '../../types';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';

interface AddExamScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  classes: SchoolClass[];
  defaultExamId?: string;
  onSuccess: () => void;
}

export const AddExamScheduleModal: React.FC<AddExamScheduleModalProps> = ({
  isOpen,
  onClose,
  exams,
  classes,
  defaultExamId,
  onSuccess,
}) => {
  const [examId, setExamId] = useState(defaultExamId || '');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examDate, setExamDate] = useState('');
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('12:30');
  const [maxMarks, setMaxMarks] = useState('100');
  const [passMarks, setPassMarks] = useState('35');
  const [roomNumber, setRoomNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultExamId) {
      setExamId(defaultExamId);
    } else if (exams.length > 0 && !examId) {
      setExamId(exams[0].id);
    }
  }, [defaultExamId, exams, examId]);

  useEffect(() => {
    if (classes.length > 0 && !classId) {
      setClassId(classes[0].id);
    }
  }, [classes, classId]);

  // Fetch subjects whenever selected class changes
  useEffect(() => {
    if (!classId) {
      setSubjects([]);
      setSubjectId('');
      return;
    }

    const fetchSubjects = async () => {
      try {
        setIsLoadingSubjects(true);
        const res = await apiClient.get<Subject[]>(`/academics/subjects?class_id=${classId}`);
        setSubjects(res.data);
        if (res.data.length > 0) {
          setSubjectId(res.data[0].id);
        } else {
          setSubjectId('');
        }
      } catch (err: any) {
        console.error('Failed to load subjects for class:', err);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, [classId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!examId) {
      setError('Please select an examination event.');
      return;
    }
    if (!classId) {
      setError('Please select a class grade.');
      return;
    }
    if (!subjectId) {
      setError('Please select an academic subject.');
      return;
    }
    if (!examDate) {
      setError('Please provide the examination date.');
      return;
    }

    const max = parseFloat(maxMarks);
    const pass = parseFloat(passMarks);

    if (isNaN(max) || max <= 0) {
      setError('Maximum marks must be a positive number.');
      return;
    }
    if (isNaN(pass) || pass < 0 || pass > max) {
      setError(`Pass marks must be between 0 and maximum marks (${max}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/exams/schedules', {
        exam_id: examId,
        class_id: classId,
        subject_id: subjectId,
        exam_date: examDate,
        start_time: startTime ? `${startTime}:00` : undefined,
        end_time: endTime ? `${endTime}:00` : undefined,
        max_marks: max,
        pass_marks: pass,
        room_number: roomNumber.trim() || undefined,
      });

      onSuccess();
      onClose();
      setRoomNumber('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add exam schedule. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Exam Subject Schedule"
      description="Schedule subject exam date, duration, room, and marks threshold for a class."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <Select
          label="Examination Event"
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          options={exams.map((ex) => ({
            value: ex.id,
            label: `${ex.name} (${ex.exam_type})`,
          }))}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Class Grade"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            options={classes.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            required
          />

          <Select
            label="Subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={isLoadingSubjects || subjects.length === 0}
            options={
              subjects.length === 0
                ? [{ value: '', label: isLoadingSubjects ? 'Loading subjects...' : 'No subjects found' }]
                : subjects.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.code})`,
                  }))
            }
            required
          />
        </div>

        <Input
          label="Examination Date"
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            label="End Time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Maximum Marks"
            type="number"
            min="1"
            max="1000"
            step="1"
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
            required
          />
          <Input
            label="Pass Marks"
            type="number"
            min="0"
            max="1000"
            step="1"
            value={passMarks}
            onChange={(e) => setPassMarks(e.target.value)}
            required
          />
          <Input
            label="Room / Hall"
            placeholder="e.g. Hall A-102"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Save Schedule
          </Button>
        </div>
      </form>
    </Modal>
  );
};
