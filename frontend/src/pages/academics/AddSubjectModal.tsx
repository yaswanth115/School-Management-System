import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddSubjectModal: React.FC<AddSubjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [subjectType, setSubjectType] = useState('Core');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setIsLoading(true);
      await apiClient.post('/academics/subjects', {
        name,
        code,
        subject_type: subjectType,
        description: description || null,
      });

      setName('');
      setCode('');
      setDescription('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create subject');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Define Curriculum Subject"
      description="Add a new academic course to the institutional subject catalog."
    >
      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Subject Name"
          placeholder="e.g. Physics"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Subject Code"
            placeholder="e.g. PHY-11"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />

          <Select
            label="Subject Classification"
            value={subjectType}
            onChange={(e) => setSubjectType(e.target.value)}
            options={[
              { value: 'Core', label: 'Core / Compulsory' },
              { value: 'Elective', label: 'Elective / Optional' },
              { value: 'Practical', label: 'Laboratory / Practical' },
              { value: 'Extracurricular', label: 'Extracurricular / Activity' },
            ]}
          />
        </div>

        <Input
          label="Course Description (Optional)"
          placeholder="Brief syllabus outline..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Save Subject
          </Button>
        </div>
      </form>
    </Modal>
  );
};
