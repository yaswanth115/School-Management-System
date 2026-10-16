import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddClassModal: React.FC<AddClassModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [numericOrder, setNumericOrder] = useState('1');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState('Section A, Section B');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const initialSections = sections
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setIsLoading(true);
      await apiClient.post('/academics/classes', {
        name,
        numeric_order: parseInt(numericOrder, 10),
        description: description || null,
        initial_sections: initialSections,
      });

      setName('');
      setNumericOrder('1');
      setDescription('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create class');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Grade Class"
      description="Create a grade class level with default classroom sections."
    >
      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Class Name"
          placeholder="e.g. Grade 11"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Numeric Level / Order"
          type="number"
          min="1"
          max="20"
          value={numericOrder}
          onChange={(e) => setNumericOrder(e.target.value)}
          required
        />

        <Input
          label="Initial Sections (comma separated)"
          placeholder="Section A, Section B"
          value={sections}
          onChange={(e) => setSections(e.target.value)}
          helperText="Sections will be automatically created under this class."
        />

        <Input
          label="Description (Optional)"
          placeholder="e.g. Higher Secondary Stream"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Create Class
          </Button>
        </div>
      </form>
    </Modal>
  );
};
