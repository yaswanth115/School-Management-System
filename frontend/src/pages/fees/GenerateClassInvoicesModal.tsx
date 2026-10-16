import React, { useState, useEffect } from 'react';
import { AcademicYear, SchoolClass, FeeStructure } from '../../types';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';

interface GenerateClassInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYears: AcademicYear[];
  classes: SchoolClass[];
  onSuccess: (count: number) => void;
}

export const GenerateClassInvoicesModal: React.FC<GenerateClassInvoicesModalProps> = ({
  isOpen,
  onClose,
  academicYears,
  classes,
  onSuccess,
}) => {
  const currentYear = academicYears.find((y) => y.is_current) || academicYears[0];
  const [academicYearId, setAcademicYearId] = useState<string>(currentYear?.id || '');
  const [classId, setClassId] = useState<string>(classes[0]?.id || '');
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [isLoadingStructures, setIsLoadingStructures] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load fee structures when class or year changes
  useEffect(() => {
    if (isOpen && classId && academicYearId) {
      setIsLoadingStructures(true);
      setError(null);
      apiClient
        .get(`/fees/structures?academic_year_id=${academicYearId}&class_id=${classId}`)
        .then((res) => {
          setFeeStructures(res.data);
          if (res.data.length > 0) {
            setSelectedStructureId(res.data[0].id);
            setTitle(res.data[0].name);
            setDueDate(res.data[0].due_date || '');
          } else {
            setSelectedStructureId('');
            setTitle('');
          }
        })
        .catch(() => setError('Failed to load class fee structures'))
        .finally(() => setIsLoadingStructures(false));
    }
  }, [isOpen, classId, academicYearId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStructureId) {
      setError('Please select a fee structure blueprint.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient.post('/fees/invoices/generate-class', {
        academic_year_id: academicYearId,
        class_id: classId,
        fee_structure_id: selectedStructureId,
        title: title.trim() || undefined,
        due_date: dueDate || undefined,
        discount_amount: parseFloat(discountAmount) || 0,
      });

      onSuccess(res.data.length);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate class invoices.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStructure = feeStructures.find((s) => s.id === selectedStructureId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Invoices for Entire Class"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}

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

        {isLoadingStructures ? (
          <p className="text-sm text-slate-500 italic">Loading fee structures...</p>
        ) : feeStructures.length === 0 ? (
          <Alert
            type="warning"
            message="No fee structure configured for this class yet. Please add a fee structure first."
          />
        ) : (
          <Select
            label="Fee Structure Blueprint"
            value={selectedStructureId}
            onChange={(e) => {
              setSelectedStructureId(e.target.value);
              const struct = feeStructures.find((s) => s.id === e.target.value);
              if (struct) {
                setTitle(struct.name);
                setDueDate(struct.due_date || '');
              }
            }}
            options={feeStructures.map((s) => ({
              label: `${s.name} (₹${Number(s.total_amount).toLocaleString('en-IN')})`,
              value: s.id,
            }))}
          />
        )}

        {selectedStructure && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
            <p className="font-semibold text-slate-700 uppercase">Structure Fee Items:</p>
            {selectedStructure.items.map((it) => (
              <div key={it.id} className="flex justify-between text-slate-600">
                <span>{it.fee_type_name || it.fee_type_code}</span>
                <span>₹{Number(it.amount).toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1 text-sm">
              <span>Total per Student:</span>
              <span>₹{Number(selectedStructure.total_amount).toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}

        <Input
          label="Invoice Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Grade 10 Term 1 Academic Fee"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Input
            label="Universal Discount (₹)"
            type="number"
            step="0.01"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={feeStructures.length === 0}
          >
            Generate Invoices
          </Button>
        </div>
      </form>
    </Modal>
  );
};
