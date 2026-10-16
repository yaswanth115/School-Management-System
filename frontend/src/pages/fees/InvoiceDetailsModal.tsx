import React, { useState, useEffect } from 'react';
import { InvoiceDetail } from '../../types';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { Printer, CreditCard } from 'lucide-react';

interface InvoiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string | null;
  onOpenPayment?: (inv: any) => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  onOpenPayment,
}) => {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && invoiceId) {
      setIsLoading(true);
      setError(null);
      apiClient
        .get(`/fees/invoices/${invoiceId}`)
        .then((res) => setInvoice(res.data))
        .catch((err) => setError(err.response?.data?.detail || 'Failed to load invoice voucher.'))
        .finally(() => setIsLoading(false));
    } else {
      setInvoice(null);
    }
  }, [isOpen, invoiceId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="emerald">PAID</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge variant="amber">PARTIALLY PAID</Badge>;
      case 'OVERDUE':
        return <Badge variant="rose">OVERDUE</Badge>;
      case 'CANCELLED':
        return <Badge variant="slate">CANCELLED</Badge>;
      default:
        return <Badge variant="slate">UNPAID</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Fee Invoice & Receipt Voucher"
      maxWidth="lg"
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <Alert type="error" message={error} />
      ) : invoice ? (
        <div className="space-y-6 text-slate-800">
          {/* Printable Voucher Sheet */}
          <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm print:shadow-none print:border-none print:p-0">
            {/* Institution Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Greenwood Public High School
                </h2>
                <p className="text-xs text-slate-500">
                  Affiliated to CBSE, New Delhi • Affiliation No: 1930281
                </p>
                <p className="text-xs text-slate-500">
                  12th Avenue, Knowledge City, Bangalore - 560100
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold uppercase text-slate-400">Tax / Fee Voucher</span>
                <p className="text-lg font-mono font-bold text-indigo-700">{invoice.invoice_number}</p>
                <div className="mt-1">{getStatusBadge(invoice.status)}</div>
              </div>
            </div>

            {/* Student & Bill Metadata */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-sm">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase">Billed Student</p>
                <p className="font-semibold text-slate-900 text-base">{invoice.student_name}</p>
                <p className="text-slate-600">Admission No: <span className="font-mono">{invoice.admission_number}</span></p>
                <p className="text-slate-600">Class & Section: {invoice.class_name} - {invoice.section_name || 'A'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium uppercase">Billing Particulars</p>
                <p className="text-slate-700">Academic Year: <span className="font-medium">{invoice.academic_year_name}</span></p>
                <p className="text-slate-700">Billing Title: <span className="font-medium">{invoice.title}</span></p>
                <p className="text-slate-700">Issue Date: <span className="font-medium">{new Date(invoice.issue_date).toLocaleDateString()}</span></p>
                <p className="text-slate-700">Due Date: <span className="font-medium text-amber-600">{new Date(invoice.due_date).toLocaleDateString()}</span></p>
              </div>
            </div>

            {/* Line Items Breakdown Table */}
            <div className="py-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Fee Items Breakdown
              </h4>
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2 px-3 font-semibold">#</th>
                    <th className="py-2 px-3 font-semibold">Fee Category</th>
                    <th className="py-2 px-3 font-semibold">Description</th>
                    <th className="py-2 px-3 text-right font-semibold">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{item.fee_type_name || item.fee_type_code}</td>
                      <td className="py-2 px-3 text-slate-500">{item.description || 'Standard institutional fee'}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">
                        ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="flex justify-end pt-2 border-t border-slate-200">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(invoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount / Waiver:</span>
                    <span className="font-mono">-₹{Number(invoice.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 pt-1">
                  <span>Total Payable:</span>
                  <span className="font-mono">₹{Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Total Paid:</span>
                  <span className="font-mono">₹{Number(invoice.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-700 text-base border-t border-slate-200 pt-1">
                  <span>Balance Due:</span>
                  <span className="font-mono">₹{Number(invoice.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Payment Receipts History */}
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Receipts & Payment History
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="py-2 px-2">Receipt #</th>
                        <th className="py-2 px-2">Date</th>
                        <th className="py-2 px-2">Method</th>
                        <th className="py-2 px-2">Txn Ref</th>
                        <th className="py-2 px-2 text-right">Amount (₹)</th>
                        <th className="py-2 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoice.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2 px-2 font-mono font-medium text-indigo-600">{p.receipt_number}</td>
                          <td className="py-2 px-2 text-slate-600">{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td className="py-2 px-2 text-slate-600">{p.payment_method}</td>
                          <td className="py-2 px-2 text-slate-500 font-mono">{p.transaction_reference || 'N/A'}</td>
                          <td className="py-2 px-2 text-right font-mono font-semibold text-emerald-700">
                            ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
            >
              Print Voucher
            </Button>

            <div className="flex gap-2">
              {Number(invoice.balance_amount) > 0 && onOpenPayment && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    onClose();
                    onOpenPayment(invoice);
                  }}
                  leftIcon={<CreditCard className="w-4 h-4" />}
                >
                  Collect Payment (₹{Number(invoice.balance_amount).toLocaleString('en-IN')})
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
