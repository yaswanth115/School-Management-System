import React, { useState, useEffect } from 'react';
import { PaymentMethod, OnlinePaymentResponse } from '../../types';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import {
  CreditCard,
  QrCode,
  Building2,
  Lock,
  CheckCircle2,
  Printer,
  ShieldCheck,
  Receipt,
} from 'lucide-react';

interface InvoiceSummary {
  id: string;
  invoice_number: string;
  title: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date?: string;
}

interface OnlineFeePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  childId: string;
  childName: string;
  invoice: InvoiceSummary | null;
  onPaymentSuccess: (res: OnlinePaymentResponse) => void;
}

export const OnlineFeePaymentModal: React.FC<OnlineFeePaymentModalProps> = ({
  isOpen,
  onClose,
  childId,
  childName,
  invoice,
  onPaymentSuccess,
}) => {
  const [payAmount, setPayAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'CREDIT_CARD' | 'NET_BANKING'>('UPI');
  const [upiId, setUpiId] = useState('parent@okaxis');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('321');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<OnlinePaymentResponse | null>(null);

  useEffect(() => {
    if (invoice) {
      setPayAmount(invoice.balance_amount.toString());
      setError(null);
      setPaymentResult(null);
    }
  }, [invoice, isOpen]);

  if (!invoice) return null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please specify a valid payment amount greater than ₹0.');
      return;
    }
    if (amountNum > invoice.balance_amount) {
      setError(`Payment amount cannot exceed the balance amount of ₹${invoice.balance_amount.toLocaleString('en-IN')}`);
      return;
    }

    try {
      setIsProcessing(true);

      const gatewayMethod: PaymentMethod =
        selectedMethod === 'UPI'
          ? 'UPI'
          : selectedMethod === 'CREDIT_CARD'
          ? 'CREDIT_CARD'
          : 'ONLINE_GATEWAY';

      const providerLabel =
        selectedMethod === 'UPI'
          ? `Razorpay UPI (${upiId})`
          : selectedMethod === 'CREDIT_CARD'
          ? 'Razorpay Card Gateway'
          : `${bankName} NetBanking`;

      const payload = {
        invoice_id: invoice.id,
        amount: amountNum,
        payment_method: gatewayMethod,
        gateway_provider: providerLabel,
        transaction_reference: `SIM-${selectedMethod}-${Date.now().toString().slice(-6)}`,
      };

      const res = await apiClient.post<OnlinePaymentResponse>(
        `/parent/children/${childId}/invoices/${invoice.id}/pay`,
        payload
      );

      setPaymentResult(res.data);
      onPaymentSuccess(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Online payment failed. Please try again.';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleModalClose = () => {
    setPaymentResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={paymentResult ? 'Payment Successful' : 'Pay School Fees Online'}
      description={
        paymentResult
          ? 'Official transaction receipt and confirmation details.'
          : `Secure fee checkout for ${childName} (${invoice.invoice_number})`
      }
      maxWidth={paymentResult ? 'xl' : 'lg'}
    >
      {/* SUCCESS RECEIPT VIEW */}
      {paymentResult ? (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-emerald-900">Fee Payment Confirmed</h3>
            <p className="text-xs text-emerald-700 mt-1">
              Your transaction has been approved and instantly reconciled in the school fee ledger.
            </p>
          </div>

          {/* Printable Official Receipt */}
          <div
            id="printable-fee-receipt"
            className="border-2 border-slate-200 rounded-xl p-5 bg-white space-y-4 print:border-none print:p-0"
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-slate-900 text-sm uppercase tracking-wide">
                  Official Fee Receipt
                </span>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-bold tracking-wide">
                {paymentResult.receipt_number}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-500 font-medium">Student</p>
                <p className="font-semibold text-slate-800 text-sm">{childName}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Invoice Number</p>
                <p className="font-semibold text-slate-800 text-sm">{paymentResult.invoice_number}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Transaction Reference</p>
                <p className="font-mono text-slate-800 font-medium">{paymentResult.transaction_reference}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Payment Timestamp</p>
                <p className="text-slate-800 font-medium">
                  {new Date(paymentResult.payment_date).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="border-t pt-3 col-span-2 flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-sm">Amount Paid:</span>
                <span className="font-extrabold text-emerald-700 text-lg">
                  ₹{Number(paymentResult.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-between text-slate-600">
                <span>Remaining Invoice Balance:</span>
                <span className="font-bold">
                  ₹{Number(paymentResult.remaining_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 print:hidden">
            <Button
              type="button"
              variant="outline"
              leftIcon={<Printer className="w-4 h-4 text-slate-600" />}
              onClick={handlePrintReceipt}
            >
              Print Receipt
            </Button>
            <Button type="button" variant="primary" onClick={handleModalClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        /* PAYMENT FORM VIEW */
        <form onSubmit={handlePay} className="space-y-5">
          {error && <Alert type="error" message={error} />}

          {/* Invoice Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Invoice Details</p>
              <h4 className="font-semibold text-slate-900 text-sm">{invoice.title}</h4>
              <p className="text-xs text-slate-600 mt-0.5">Invoice: {invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium">Outstanding Balance</p>
              <p className="text-lg font-extrabold text-rose-600">
                ₹{invoice.balance_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Amount to Pay */}
          <div>
            <Input
              label="Payment Amount (INR)"
              type="number"
              step="0.01"
              min="1"
              max={invoice.balance_amount}
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              helperText={`You can pay the full ₹${invoice.balance_amount.toLocaleString('en-IN')} or make a partial payment.`}
            />
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Select Online Payment Gateway Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod('UPI')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  selectedMethod === 'UPI'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <QrCode className="w-5 h-5 mb-1" />
                <span className="text-xs">UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('CREDIT_CARD')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  selectedMethod === 'CREDIT_CARD'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1" />
                <span className="text-xs">Debit / Card</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('NET_BANKING')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  selectedMethod === 'NET_BANKING'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Building2 className="w-5 h-5 mb-1" />
                <span className="text-xs">Net Banking</span>
              </button>
            </div>
          </div>

          {/* Method-Specific Simulated Fields */}
          {selectedMethod === 'UPI' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-white border border-slate-300 rounded-lg p-1 flex items-center justify-center shrink-0">
                  <QrCode className="w-12 h-12 text-slate-800" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Scan & Pay with any UPI App</p>
                  <p className="text-[11px] text-slate-500">GPay, PhonePe, Paytm, BHIM</p>
                </div>
              </div>
              <Input
                label="Or enter Virtual Payment Address (UPI ID)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="username@okhdfcbank"
              />
            </div>
          )}

          {selectedMethod === 'CREDIT_CARD' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <Input
                label="Card Number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4532 0000 0000 0000"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Expires"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="MM/YY"
                />
                <Input
                  label="CVV"
                  type="password"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  placeholder="•••"
                />
              </div>
            </div>
          )}

          {selectedMethod === 'NET_BANKING' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">Select Bank</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="State Bank of India">State Bank of India</option>
                <option value="Axis Bank">Axis Bank</option>
                <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
              </select>
            </div>
          )}

          {/* Security Banner */}
          <div className="flex items-center gap-2 text-slate-500 text-xs bg-slate-100 p-2.5 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>256-bit SSL encrypted. Payment gateway sandbox simulation.</span>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isProcessing}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              Pay ₹{parseFloat(payAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
