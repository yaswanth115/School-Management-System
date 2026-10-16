import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AttendanceManagementPage } from '../pages/attendance/AttendanceManagementPage';
import { AttendanceCorrectionModal } from '../pages/attendance/AttendanceCorrectionModal';
import { AttendanceRecord } from '../types';

describe('Attendance Management Frontend', () => {
  it('renders AttendanceManagementPage header and primary navigation tabs', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <AttendanceManagementPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Attendance Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /daily classroom register/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /monthly attendance matrix/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /low attendance alerts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /student attendance explorer/i })).toBeInTheDocument();
  });

  it('renders AttendanceCorrectionModal with student details and audit reason field', () => {
    const mockRecord: AttendanceRecord = {
      id: 'rec-123',
      student_id: 'std-123',
      student_name: 'Alex Miller',
      admission_number: 'ADM-2026-0001',
      roll_number: '10A-01',
      status: 'ABSENT',
      remarks: 'Morning roll call absent',
      corrections: [
        {
          id: 'cor-1',
          attendance_record_id: 'rec-123',
          previous_status: 'ABSENT',
          new_status: 'LATE',
          reason: 'Arrived at 8:45 AM due to bus breakdown',
          changed_by_name: 'Sarah Jenkins',
          changed_at: '2026-10-06T09:00:00Z',
        },
      ],
    };

    render(
      <AttendanceCorrectionModal
        isOpen={true}
        onClose={vi.fn()}
        record={mockRecord}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Authorized Attendance Correction')).toBeInTheDocument();
    expect(screen.getByText('Alex Miller')).toBeInTheDocument();
    expect(screen.getByText(/ADM-2026-0001/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Audit Reason for Adjustment/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm correction/i })).toBeInTheDocument();
    expect(screen.getByText(/Arrived at 8:45 AM due to bus breakdown/i)).toBeInTheDocument();
  });
});
