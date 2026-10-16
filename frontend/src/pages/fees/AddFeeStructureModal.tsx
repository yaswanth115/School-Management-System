import React, { useState } from 'react';
import { AcademicYear, SchoolClass, FeeType } from '../../types';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { Plus, Trash2 } from 'lucide-react';

interface AddFeeStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYears: AcademicYear[];
  classes: SchoolClass[];
  feeTypes: FeeType[];
  onSuccess: () => void;
}

interface StructureItemRow {
  fee_type_id: string;
  amount: string;
}

export const AddFeeStructureModal: React.FC<AddFeeStructureModalProps> = ({
  isOpen,
  onClose,
  academicYears,
  classes,
  feeTypes,
  onSuccess,
}) => {
  const currentYear = academicYears.find((y) => y.is_current) || academicYears[0];
  const [academicYearId, setAcademicYearId] = useState<string>(currentYear?.id || '');
  const [classId, setClassId] = useState<string>(classes[0]?.id || '');
  const [name, setName] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [items, setItems] = useState<StructureItemRow[]>([
    { fee_type_id: feeTypes[0]?.id || '', amount: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { fee_type_id: feeTypes[0]?.id || '', amount: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof StructureItemRow, value: string) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const totalCalculated = items.reduce((acc, curr) => {
    const val = parseFloat(curr.amount);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a name for this fee structure.');
      return;
    }

    const formattedItems = items.map((it) => ({
      fee_type_id: it.fee_type_id,
      amount: parseFloat(it.amount),
    }));

    if (formattedItems.some((it) => isNaN(it.amount) || it.amount < 0)) {
      setError('Please enter valid non-negative amounts for all line items.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/fees/structures', {
        academic_year_id: academicYearId,
        class_id: classId,
        name: name.trim(),
        due_date: dueDate || undefined,
        items: formattedItems,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create fee structure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Class Fee Structure"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Academic Year"
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            options={academicYears.map((y) => ({
              label: `${y.name} ${y.is_current ? '(Current)' : ''}`,
              value: y.id,
            }))}
          />

          <Select
            label="Target Class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            options={classes.map((c) => ({
              label: c.name,
              value: c.id,
            }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Structure Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Grade 10 Annual Academic Fee"
          />
          <Input
            label="Default Due Date (Optional)"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Dynamic Line Items */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-slate-800">Fee Component Breakdown</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Component
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <div className="flex-1">
                  <select
                    value={item.fee_type_id}
                    onChange={(e) => handleItemChange(idx, 'fee_type_id', e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {feeTypes.map((ft) => (
                      <option key={ft.id} value={ft.id}>
                        {ft.name} ({ft.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-40">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Amount (₹)"
                    value={item.amount}
                    onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  disabled={items.length === 1}
                  className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200 text-sm">
            <span className="font-semibold text-slate-700">Total Blueprint Amount:</span>
            <span className="text-lg font-bold text-indigo-700">
              ₹{totalCalculated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Save Structure
          </Button>
        </div>
      </form>
    </Modal>
  );
};
