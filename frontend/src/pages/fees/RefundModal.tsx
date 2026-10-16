import React, { useState } from 'react';
import { Payment } from '../../types';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  onSuccess: (refundNumber: string) => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  payment,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (payment) {
      const alreadyRefunded = (payment.refunds || []).reduce((acc, r) => acc + Number(r.amount), 0);
      const refundable = Number(payment.amount) - alreadyRefunded;
      setAmount(refundable.toString());
      setReason('');
      setError(null);
    }
  }, [payment]);

  if (!payment) return null;

  const alreadyRefunded = (payment.refunds || []).reduce((acc, r) => acc + Number(r.amount), 0);
  const maxRefundable = Number(payment.amount) - alreadyRefunded;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const refAmount = parseFloat(amount);
    if (isNaN(refAmount) || refAmount <= 0) {
      setError('Please enter a valid refund amount greater than zero.');
      return;
    }

    if (refAmount > maxRefundable) {
      setError(`Refund amount cannot exceed refundable balance of ₹${maxRefundable.toLocaleString('en-IN')}`);
      return;
    }

    if (reason.trim().length < 3) {
      setError('Please provide a specific justification/reason for this reversal.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient.post(`/fees/payments/${payment.id}/refund`, {
        amount: refAmount,
        reason: reason.trim(),
      });

      onSuccess(res.data.refund_number);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process refund.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Process Payment Reversal: ${payment.receipt_number}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between font-medium text-rose-950">
            <span>Student:</span>
            <span>{payment.student_name}</span>
          </div>
          <div className="flex justify-between text-rose-800">
            <span>Original Paid:</span>
            <span>₹{Number(payment.amount).toLocaleString('en-IN')}</span>
          </div>
          {alreadyRefunded > 0 && (
            <div className="flex justify-between text-rose-700">
              <span>Already Refunded:</span>
              <span>₹{alreadyRefunded.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-rose-900 border-t border-rose-200 pt-1 text-sm">
            <span>Max Refundable:</span>
            <span>₹{maxRefundable.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <Input
          label="Refund Amount (₹)"
          type="number"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Reason / Justification for Reversal
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="e.g. Accidental double charge, scholarship adjustment, or transfer rebate..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" isLoading={isSubmitting}>
            Authorize Refund
          </Button>
        </div>
      </form>
    </Modal>
  );
};
