import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { FeeManagementPage } from '../pages/fees/FeeManagementPage';
import { CollectPaymentModal } from '../pages/fees/CollectPaymentModal';
import { InvoiceDetailsModal } from '../pages/fees/InvoiceDetailsModal';
import { Invoice } from '../types';

describe('Fee Management Frontend', () => {
  it('renders FeeManagementPage header and tabs', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <FeeManagementPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Fee Management & Financials')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /invoices/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /receipts & payments/i })).toBeInTheDocument();
  });

  it('renders CollectPaymentModal with invoice balances and payment methods', () => {
    const mockInvoice: Invoice = {
      id: 'inv-123',
      invoice_number: 'INV-2026-0001',
      student_id: 'std-123',
      student_name: 'Alex Miller',
      admission_number: 'ADM-2026-0001',
      academic_year_id: 'ay-123',
      title: 'Grade 10 Term 1 Academic Fee',
      subtotal: 30000,
      discount_amount: 0,
      total_amount: 30000,
      paid_amount: 10000,
      balance_amount: 20000,
      status: 'PARTIALLY_PAID',
      issue_date: '2026-06-05',
      due_date: '2026-12-31',
      created_at: '2026-06-05T00:00:00Z',
    };

    render(
      <CollectPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        invoice={mockInvoice}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Collect Payment: INV-2026-0001/i)).toBeInTheDocument();
    expect(screen.getByText(/Alex Miller/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Payment Amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Payment Method/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm collection/i })).toBeInTheDocument();
  });

  it('renders InvoiceDetailsModal structure when open', () => {
    render(
      <InvoiceDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        invoiceId="inv-123"
      />
    );

    expect(screen.getByText('Fee Invoice & Receipt Voucher')).toBeInTheDocument();
  });
});
