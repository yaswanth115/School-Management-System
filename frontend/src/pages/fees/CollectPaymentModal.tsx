import React, { useState } from 'react';
import { Invoice, PaymentMethod } from '../../types';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess: (receiptNumber: string) => void;
}

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize amount to remaining balance when modal opens
  React.useEffect(() => {
    if (invoice) {
      setAmount(invoice.balance_amount.toString());
      setPaymentMethod('CASH');
      setTransactionRef('');
      setNotes('');
      setError(null);
    }
  }, [invoice]);

  if (!invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (payAmount > invoice.balance_amount) {
      setError(`Payment amount cannot exceed outstanding balance of ₹${invoice.balance_amount.toLocaleString('en-IN')}`);
      return;
    }

    if (paymentMethod !== 'CASH' && !transactionRef.trim()) {
      setError('Transaction reference / UTR is required for non-cash payments.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient.post('/fees/payments/collect', {
        invoice_id: invoice.id,
        amount: payAmount,
        payment_method: paymentMethod,
        transaction_reference: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess(res.data.receipt_number);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to collect payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Collect Payment: ${invoice.invoice_number}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}

        {/* Invoice Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between font-medium text-slate-800">
            <span>Student:</span>
            <span>{invoice.student_name} ({invoice.admission_number})</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Total Invoiced:</span>
            <span>₹{Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Already Paid:</span>
            <span className="text-emerald-600">₹{Number(invoice.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1 text-base">
            <span>Outstanding Balance:</span>
            <span className="text-amber-600">₹{Number(invoice.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <Input
          label="Payment Amount (₹)"
          type="number"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter payment amount"
        />

        <Select
          label="Payment Method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          options={[
            { label: 'Cash', value: 'CASH' },
            { label: 'UPI / QR Code', value: 'UPI' },
            { label: 'Bank Transfer / NEFT / IMPS', value: 'BANK_TRANSFER' },
            { label: 'Cheque / Demand Draft', value: 'CHEQUE' },
            { label: 'Credit / Debit Card', value: 'CREDIT_CARD' },
            { label: 'Online Payment Gateway', value: 'ONLINE_GATEWAY' },
          ]}
        />

        {paymentMethod !== 'CASH' && (
          <Input
            label="Transaction Reference / Cheque No / UTR"
            required
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="e.g. UPI-1234567890 or Cheque #8872"
          />
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Payment Notes / Remarks (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Optional cashier notes..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Confirm Collection
          </Button>
        </div>
      </form>
    </Modal>
  );
};
