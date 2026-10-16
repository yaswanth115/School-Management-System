import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

interface AddAcademicYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddAcademicYearModal: React.FC<AddAcademicYearModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setIsLoading(true);
      await apiClient.post('/academics/years', {
        name,
        start_date: startDate,
        end_date: endDate,
        is_current: isCurrent,
      });

      setName('');
      setStartDate('');
      setEndDate('');
      setIsCurrent(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create academic year');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Academic Year"
      description="Define a new academic session and date calendar."
    >
      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Session Name"
          placeholder="e.g. 2027-2028"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-4">
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

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="is_current"
            checked={isCurrent}
            onChange={(e) => setIsCurrent(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
          />
          <label htmlFor="is_current" className="text-sm font-medium text-slate-700 cursor-pointer">
            Set as Active / Current Academic Year
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Create Year
          </Button>
        </div>
      </form>
    </Modal>
  );
};
