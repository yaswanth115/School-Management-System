import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Receipt,
  Layers,
  Search,
  Plus,
  TrendingUp,
  AlertCircle,
  FileText,
  DollarSign,
  RotateCcw,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Invoice,
  Payment,
  FeeStructure,
  FeeType,
  FeeSummaryReport,
  SchoolClass,
  AcademicYear,
  InvoiceStatus,
  PaymentMethod,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { Table, Column } from '../../components/ui/Table';

// Modals
import { CollectPaymentModal } from './CollectPaymentModal';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import { GenerateClassInvoicesModal } from './GenerateClassInvoicesModal';
import { AddFeeStructureModal } from './AddFeeStructureModal';
import { RefundModal } from './RefundModal';

export const FeeManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isFinanceStaff = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT' || user?.role === 'PRINCIPAL';
  const canCollect = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'structures'>('invoices');

  // Summary KPI Report
  const [summary, setSummary] = useState<FeeSummaryReport | null>(null);

  // Invoices Tab State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Payments Tab State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('');

  // Structures Tab State
  const [structures, setStructures] = useState<FeeStructure[]>([]);

  // Metadata
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);

  // Modals State
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedInvoiceIdForVoucher, setSelectedInvoiceIdForVoucher] = useState<string | null>(null);

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<Payment | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch summary report
  const fetchSummary = useCallback(async () => {
    if (!isFinanceStaff) return;
    try {
      const res = await apiClient.get('/fees/reports/summary');
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load financial summary', err);
    }
  }, [isFinanceStaff]);

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', invoicePage.toString());
      params.append('page_size', '15');
      if (invoiceSearch.trim()) params.append('search', invoiceSearch.trim());
      if (invoiceStatus) params.append('status', invoiceStatus);
      if (selectedClassId) params.append('class_id', selectedClassId);

      const res = await apiClient.get(`/fees/invoices?${params.toString()}`);
      setInvoices(res.data.items);
      setInvoiceTotal(res.data.total);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.response?.data?.detail || 'Failed to load invoices' });
    } finally {
      setIsLoading(false);
    }
  }, [invoicePage, invoiceSearch, invoiceStatus, selectedClassId]);

  // Fetch Payments
  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', paymentPage.toString());
      params.append('page_size', '15');
      if (paymentSearch.trim()) params.append('search', paymentSearch.trim());
      if (paymentMethodFilter) params.append('payment_method', paymentMethodFilter);

      const res = await apiClient.get(`/fees/payments?${params.toString()}`);
      setPayments(res.data.items);
      setPaymentTotal(res.data.total);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.response?.data?.detail || 'Failed to load payments' });
    } finally {
      setIsLoading(false);
    }
  }, [paymentPage, paymentSearch, paymentMethodFilter]);

  // Fetch Structures
  const fetchStructures = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/fees/structures');
      setStructures(res.data);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.response?.data?.detail || 'Failed to load fee structures' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([
      apiClient.get('/academics/classes'),
      apiClient.get('/academics/years'),
      apiClient.get('/fees/types'),
    ]).then(([clsRes, yrsRes, ftRes]) => {
      setClasses(clsRes.data);
      setAcademicYears(yrsRes.data);
      setFeeTypes(ftRes.data);
    }).catch(console.error);

    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === 'invoices') fetchInvoices();
    else if (activeTab === 'payments') fetchPayments();
    else if (activeTab === 'structures') fetchStructures();
  }, [activeTab, fetchInvoices, fetchPayments, fetchStructures]);

  const handleOpenPayment = (inv: Invoice) => {
    setSelectedInvoiceForPayment(inv);
    setIsCollectModalOpen(true);
  };

  const handleOpenVoucher = (invoiceId: string) => {
    setSelectedInvoiceIdForVoucher(invoiceId);
    setIsVoucherModalOpen(true);
  };

  const handleOpenRefund = (pay: Payment) => {
    setSelectedPaymentForRefund(pay);
    setIsRefundModalOpen(true);
  };

  const getStatusBadge = (status: InvoiceStatus) => {
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

  // Columns for Invoices Table
  const invoiceColumns: Column<Invoice>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      render: (inv: Invoice) => (
        <button
          onClick={() => handleOpenVoucher(inv.id)}
          className="font-mono font-semibold text-indigo-600 hover:text-indigo-900 hover:underline flex items-center gap-1"
        >
          {inv.invoice_number}
          <Eye className="w-3.5 h-3.5 opacity-60" />
        </button>
      ),
    },
    {
      key: 'student',
      header: 'Student',
      render: (inv: Invoice) => (
        <div>
          <div className="font-medium text-slate-900">{inv.student_name}</div>
          <div className="text-xs text-slate-500 font-mono">{inv.admission_number}</div>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      render: (inv: Invoice) => (
        <span className="text-sm text-slate-700">
          {inv.class_name ? `${inv.class_name} - ${inv.section_name || 'A'}` : '—'}
        </span>
      ),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (inv: Invoice) => (
        <span className="text-sm text-slate-600 font-mono">
          {new Date(inv.due_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total (₹)',
      render: (inv: Invoice) => (
        <span className="font-mono font-medium text-slate-800">
          ₹{Number(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'paid_amount',
      header: 'Paid (₹)',
      render: (inv: Invoice) => (
        <span className="font-mono text-emerald-600 font-medium">
          ₹{Number(inv.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'balance_amount',
      header: 'Balance (₹)',
      render: (inv: Invoice) => (
        <span className="font-mono font-bold text-amber-600">
          ₹{Number(inv.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv: Invoice) => getStatusBadge(inv.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (inv: Invoice) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenVoucher(inv.id)}
            title="View Voucher"
          >
            Voucher
          </Button>
          {canCollect && Number(inv.balance_amount) > 0 && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleOpenPayment(inv)}
            >
              Collect
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Columns for Payments Table
  const paymentColumns: Column<Payment>[] = [
    {
      key: 'receipt_number',
      header: 'Receipt #',
      render: (pay: Payment) => (
        <span className="font-mono font-semibold text-emerald-700">{pay.receipt_number}</span>
      ),
    },
    {
      key: 'payment_date',
      header: 'Date & Time',
      render: (pay: Payment) => (
        <span className="text-xs text-slate-600 font-mono">
          {new Date(pay.payment_date).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'student',
      header: 'Student',
      render: (pay: Payment) => (
        <div>
          <div className="font-medium text-slate-900">{pay.student_name}</div>
          <div className="text-xs text-slate-500 font-mono">{pay.admission_number}</div>
        </div>
      ),
    },
    {
      key: 'invoice',
      header: 'Invoice #',
      render: (pay: Payment) => (
        <button
          onClick={() => handleOpenVoucher(pay.invoice_id)}
          className="font-mono text-xs text-indigo-600 hover:underline"
        >
          {pay.invoice_number || 'View'}
        </button>
      ),
    },
    {
      key: 'payment_method',
      header: 'Method',
      render: (pay: Payment) => (
        <Badge variant="slate">{pay.payment_method}</Badge>
      ),
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (pay: Payment) => (
        <span className="text-xs text-slate-500 font-mono">{pay.transaction_reference || '—'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount (₹)',
      render: (pay: Payment) => (
        <span className="font-mono font-bold text-slate-900">
          ₹{Number(pay.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'collected_by',
      header: 'Collected By',
      render: (pay: Payment) => (
        <span className="text-xs text-slate-600">{pay.collected_by_name || 'System Cashier'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (pay: Payment) => (
        <span
          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
            pay.status === 'COMPLETED'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-rose-100 text-rose-800'
          }`}
        >
          {pay.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (pay: Payment) => (
        <div>
          {canCollect && pay.status === 'COMPLETED' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenRefund(pay)}
              leftIcon={<RotateCcw className="w-3.5 h-3.5 text-rose-600" />}
            >
              Refund
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Fee Management & Financials
          </h1>
          <p className="text-sm text-slate-500">
            Institutional fee structures, student invoices, receipts, and collection audit trails.
          </p>
        </div>

        {canCollect && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setIsStructureModalOpen(true)}
              leftIcon={<Layers className="w-4 h-4" />}
            >
              New Fee Structure
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsGenerateModalOpen(true)}
              leftIcon={<FileText className="w-4 h-4" />}
            >
              Generate Class Invoices
            </Button>
          </div>
        )}
      </div>

      {notification && (
        <Alert
          type={notification.type}
          message={notification.text}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Financial KPI Summary Cards (for Finance Staff) */}
      {isFinanceStaff && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-emerald-500 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Collection</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                  ₹{Number(summary.today_collection).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Verified receipt collections today</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-indigo-500 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Month's Collection</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                  ₹{Number(summary.month_collection).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Calendar month total revenue</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-amber-500 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Outstanding</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1 font-mono">
                  ₹{Number(summary.total_outstanding).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              From ₹{Number(summary.total_invoiced).toLocaleString('en-IN')} total invoiced
            </p>
          </Card>

          <Card className="p-4 border-l-4 border-l-rose-500 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Invoices</p>
                <h3 className="text-2xl font-bold text-rose-600 mt-1 font-mono">
                  {summary.overdue_invoices_count}
                </h3>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
                <Receipt className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Past due date requiring follow-up</p>
          </Card>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'invoices'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Invoices ({invoiceTotal})
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Receipts & Payments ({paymentTotal})
        </button>

        {isFinanceStaff && (
          <button
            onClick={() => setActiveTab('structures')}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'structures'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            Fee Structures ({structures.length})
          </button>
        )}
      </div>

      {/* Tab 1: Invoices */}
      {activeTab === 'invoices' && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={invoiceSearch}
                onChange={(e) => {
                  setInvoiceSearch(e.target.value);
                  setInvoicePage(1);
                }}
                placeholder="Search by Invoice #, student name, or admission #..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {isFinanceStaff && (
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setInvoicePage(1);
                }}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

            <select
              value={invoiceStatus}
              onChange={(e) => {
                setInvoiceStatus(e.target.value);
                setInvoicePage(1);
              }}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <Table
              data={invoices}
              columns={invoiceColumns}
              emptyMessage="No invoices found matching your criteria."
            />
          )}
        </Card>
      )}

      {/* Tab 2: Payments / Receipts */}
      {activeTab === 'payments' && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={paymentSearch}
                onChange={(e) => {
                  setPaymentSearch(e.target.value);
                  setPaymentPage(1);
                }}
                placeholder="Search by receipt #, reference, student name..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                setPaymentPage(1);
              }}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Payment Methods</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CREDIT_CARD">Credit Card</option>
            </select>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <Table
              data={payments}
              columns={paymentColumns}
              emptyMessage="No payment receipts found."
            />
          )}
        </Card>
      )}

      {/* Tab 3: Fee Structures */}
      {activeTab === 'structures' && isFinanceStaff && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {structures.map((s) => (
              <Card key={s.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {s.class_name || 'Class Fee'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{s.academic_year_name}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mt-2">{s.name}</h3>
                  <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                    ₹{Number(s.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700 uppercase">Itemized Breakdown:</p>
                    {s.items.map((it) => (
                      <div key={it.id} className="flex justify-between">
                        <span>{it.fee_type_name || it.fee_type_code}</span>
                        <span className="font-mono">₹{Number(it.amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-500">
                    Due: {s.due_date ? new Date(s.due_date).toLocaleDateString() : 'End of Term'}
                  </span>
                  {canCollect && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsGenerateModalOpen(true)}
                      leftIcon={<FileText className="w-3.5 h-3.5" />}
                    >
                      Bill Class
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <CollectPaymentModal
        isOpen={isCollectModalOpen}
        onClose={() => {
          setIsCollectModalOpen(false);
          setSelectedInvoiceForPayment(null);
        }}
        invoice={selectedInvoiceForPayment}
        onSuccess={(recNo) => {
          setNotification({ type: 'success', text: `Payment collected successfully! Receipt ${recNo} issued.` });
          fetchInvoices();
          fetchSummary();
        }}
      />

      <InvoiceDetailsModal
        isOpen={isVoucherModalOpen}
        onClose={() => {
          setIsVoucherModalOpen(false);
          setSelectedInvoiceIdForVoucher(null);
        }}
        invoiceId={selectedInvoiceIdForVoucher}
        onOpenPayment={handleOpenPayment}
      />

      <GenerateClassInvoicesModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        academicYears={academicYears}
        classes={classes}
        onSuccess={(count) => {
          setNotification({ type: 'success', text: `Successfully generated ${count} invoices for the class!` });
          fetchInvoices();
          fetchSummary();
        }}
      />

      <AddFeeStructureModal
        isOpen={isStructureModalOpen}
        onClose={() => setIsStructureModalOpen(false)}
        academicYears={academicYears}
        classes={classes}
        feeTypes={feeTypes}
        onSuccess={() => {
          setNotification({ type: 'success', text: 'New fee structure saved successfully!' });
          fetchStructures();
        }}
      />

      <RefundModal
        isOpen={isRefundModalOpen}
        onClose={() => {
          setIsRefundModalOpen(false);
          setSelectedPaymentForRefund(null);
        }}
        payment={selectedPaymentForRefund}
        onSuccess={(refNo) => {
          setNotification({ type: 'success', text: `Payment reversal processed! Reversal reference: ${refNo}` });
          fetchPayments();
          fetchSummary();
        }}
      />
    </div>
  );
};
