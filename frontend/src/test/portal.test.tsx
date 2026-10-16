import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ParentPortalPage } from '../pages/parent/ParentPortalPage';
import { OnlineFeePaymentModal } from '../pages/parent/OnlineFeePaymentModal';
import { StudentPortalPage } from '../pages/student/StudentPortalPage';

describe('Phase 6: Parent and Student Portals', () => {
  it('renders ParentPortalPage loading or initial container', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <ParentPortalPage />
        </AuthProvider>
      </BrowserRouter>
    );

    // Initial state displays portal spinner or top elements
    expect(screen.getByText(/loading parent portal|parent portal/i)).toBeInTheDocument();
  });

  it('renders OnlineFeePaymentModal with UPI, Card, and Net Banking gateways', () => {
    const mockInvoice = {
      id: 'inv-123',
      invoice_number: 'INV-2026-0001',
      title: 'Term 1 Tuition Fee',
      total_amount: 30000,
      paid_amount: 10000,
      balance_amount: 20000,
      due_date: '2026-12-31',
    };

    render(
      <OnlineFeePaymentModal
        isOpen={true}
        onClose={vi.fn()}
        childId="child-123"
        childName="Alex Miller"
        invoice={mockInvoice}
        onPaymentSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Pay School Fees Online/i)).toBeInTheDocument();
    expect(screen.getByText(/Term 1 Tuition Fee/i)).toBeInTheDocument();
    expect(screen.getByText(/UPI \/ QR/i)).toBeInTheDocument();
    expect(screen.getByText(/Debit \/ Card/i)).toBeInTheDocument();
    expect(screen.getByText(/Net Banking/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pay ₹20,000/i })).toBeInTheDocument();
  });

  it('renders StudentPortalPage loading or academic container', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <StudentPortalPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/loading student academic profile/i)).toBeInTheDocument();
  });
});
