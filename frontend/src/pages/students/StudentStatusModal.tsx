import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { StudentStatus } from '../../types';

interface StudentStatusModalProps {
  studentId: string;
  studentName: string;
  currentStatus: StudentStatus;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StudentStatusModal: React.FC<StudentStatusModalProps> = ({
  studentId,
  studentName,
  currentStatus,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [targetStatus, setTargetStatus] = useState<StudentStatus>('TRANSFERRED');
  const [remarks, setRemarks] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setIsLoading(true);
      await apiClient.post(`/students/${studentId}/status`, {
        status: targetStatus,
        remarks: remarks || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update student status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Student Status: ${studentName}`}
      description="Record a formal transfer, withdrawal, or alumni status update."
    >
      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Target Status"
          value={targetStatus}
          onChange={(e) => setTargetStatus(e.target.value as StudentStatus)}
          options={[
            { value: 'ACTIVE', label: 'Active (Regular Enrollment)' },
            { value: 'TRANSFERRED', label: 'Transferred (Moved to another school)' },
            { value: 'WITHDRAWN', label: 'Withdrawn (Parental request / Discontinued)' },
            { value: 'ALUMNI', label: 'Alumni (Graduated)' },
          ]}
        />

        <Input
          label="Reason / Remarks"
          placeholder="e.g. Relocated to another city, transfer certificate issued"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          required
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Update Status
          </Button>
        </div>
      </form>
    </Modal>
  );
};
