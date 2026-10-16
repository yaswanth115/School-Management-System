import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { StudentListPage } from '../pages/students/StudentListPage';
import { StudentAdmissionPage } from '../pages/students/StudentAdmissionPage';

describe('Student Management Frontend', () => {
  it('renders student list page header and controls', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <StudentListPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Student Directory & Admissions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new admission/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulk import/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by student name/i)).toBeInTheDocument();
  });

  it('renders student admission page with biographical and guardian sections', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <StudentAdmissionPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Student Admission & Enrollment')).toBeInTheDocument();
    expect(screen.getByText(/1\. Student Biographical Details/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Classroom Placement/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Primary Guardian Information/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete admission/i })).toBeInTheDocument();
  });
});
