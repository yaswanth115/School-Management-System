import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

interface AddSectionModalProps {
  classId: string | null;
  className: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddSectionModal: React.FC<AddSectionModalProps> = ({
  classId,
  className,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [capacity, setCapacity] = useState('40');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId) return;
    setError(null);

    try {
      setIsLoading(true);
      await apiClient.post(`/academics/classes/${classId}/sections`, {
        name,
        room_number: roomNumber || null,
        capacity: parseInt(capacity, 10),
      });

      setName('');
      setRoomNumber('');
      setCapacity('40');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add section');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Section to ${className || 'Class'}`}
      description="Configure a new physical classroom section."
    >
      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Section Name"
          placeholder="e.g. Section C"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Room Number"
            placeholder="e.g. Room 103"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
          />
          <Input
            label="Student Capacity"
            type="number"
            min="1"
            max="100"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Add Section
          </Button>
        </div>
      </form>
    </Modal>
  );
};
