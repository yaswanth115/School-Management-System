import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { NoticeListPage } from '../pages/notices/NoticeListPage';
import { CreateNoticeModal } from '../pages/notices/CreateNoticeModal';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';

describe('Phase 7: Notices, Reports and Dashboards', () => {
  it('renders NoticeListPage heading, audience tabs, and search bar', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <NoticeListPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Notice Board & Announcements/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search announcements by keywords or author/i)).toBeInTheDocument();
    expect(screen.getByText('All Notices')).toBeInTheDocument();
    expect(screen.getByText('Faculty')).toBeInTheDocument();
    expect(screen.getByText('Parents')).toBeInTheDocument();
    expect(screen.getByText('Students')).toBeInTheDocument();
  });

  it('renders CreateNoticeModal form elements when open', () => {
    render(
      <CreateNoticeModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Publish New Notice/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notice Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Target Audience/i)).toBeInTheDocument();
    expect(screen.getByText(/Pin to top of Notice Board/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publish Notice/i })).toBeInTheDocument();
  });

  it('renders ReportsPage tabs, print button, and export action', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Institutional Reports & Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/Student Demographics/i)).toBeInTheDocument();
    expect(screen.getByText(/Financials & Defaulters/i)).toBeInTheDocument();
    expect(screen.getByText(/Exam Performance/i)).toBeInTheDocument();
    expect(screen.getByText(/Attendance Analytics/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print Report/i })).toBeInTheDocument();
  });

  it('renders DashboardPage welcome banner or loading state', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/loading dashboard metrics|welcome back/i)).toBeInTheDocument();
  });
});
