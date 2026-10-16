import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ExaminationManagementPage } from '../pages/examinations/ExaminationManagementPage';
import { CreateExamModal } from '../pages/examinations/CreateExamModal';
import { AddExamScheduleModal } from '../pages/examinations/AddExamScheduleModal';
import { ReportCardModal } from '../pages/examinations/ReportCardModal';
import { StudentReportCard } from '../types';

describe('Examinations Management Frontend', () => {
  it('renders ExaminationManagementPage header and navigation tabs', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <ExaminationManagementPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Examinations & Marks Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exams & timetables/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /marks entry roster/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /student report cards/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grading scales/i })).toBeInTheDocument();
  });

  it('renders CreateExamModal with assessment types and form fields', () => {
    render(
      <CreateExamModal
        isOpen={true}
        onClose={vi.fn()}
        academicYears={[
          {
            id: 'ay-1',
            name: '2026-2027',
            start_date: '2026-06-01',
            end_date: '2027-04-30',
            is_current: true,
            is_active: true,
          },
        ]}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Create New Examination Event')).toBeInTheDocument();
    expect(screen.getByLabelText(/Academic Year/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Examination Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Exam Assessment Type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create examination/i })).toBeInTheDocument();
  });

  it('renders AddExamScheduleModal with cutoffs and room controls', () => {
    render(
      <AddExamScheduleModal
        isOpen={true}
        onClose={vi.fn()}
        exams={[
          {
            id: 'exam-1',
            academic_year_id: 'ay-1',
            name: 'Term 1 Midterms',
            exam_type: 'MIDTERM',
            start_date: '2026-09-15',
            end_date: '2026-09-25',
            is_active: true,
            created_at: '2026-09-01T00:00:00Z',
          },
        ]}
        classes={[
          {
            id: 'class-1',
            name: 'Grade 10',
            numeric_order: 10,
            sections: [],
            is_active: true,
          },
        ]}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Add Exam Subject Schedule')).toBeInTheDocument();
    expect(screen.getByLabelText(/Maximum Marks/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pass Marks/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save schedule/i })).toBeInTheDocument();
  });

  it('renders official ReportCardModal with letterhead, subject table, and class ranking', () => {
    const mockReportCard: StudentReportCard = {
      student_id: 'std-1',
      admission_number: 'ADM-2026-0001',
      student_name: 'Alex Miller',
      class_name: 'Grade 10',
      section_name: 'Section A',
      roll_number: '10A-01',
      academic_year_name: '2026-2027',
      exam_id: 'exam-1',
      exam_name: 'Term 1 Midterm Examinations',
      exam_type: 'MIDTERM',
      subjects: [
        {
          subject_id: 'sub-1',
          subject_name: 'Mathematics',
          subject_code: 'MTH-101',
          max_marks: 100,
          pass_marks: 35,
          marks_obtained: 95,
          is_absent: false,
          percentage: 95,
          grade: 'A1',
          grade_point: 10,
          remarks: 'Outstanding logical reasoning',
          is_passed: true,
        },
      ],
      total_max_marks: 100,
      total_marks_obtained: 95,
      overall_percentage: 95,
      overall_grade: 'A1',
      overall_grade_point: 10,
      class_rank: 1,
      total_students_in_class: 28,
      result_status: 'PASS',
      attendance_percentage: 96.5,
      issued_date: '2026-10-15',
    };

    render(
      <ReportCardModal
        isOpen={true}
        onClose={vi.fn()}
        reportCard={mockReportCard}
      />
    );

    expect(screen.getByText(/Greenwood International School/i)).toBeInTheDocument();
    expect(screen.getByText(/Academic Performance Report Card/i)).toBeInTheDocument();
    expect(screen.getByText('Alex Miller')).toBeInTheDocument();
    expect(screen.getByText('ADM-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('MTH-101')).toBeInTheDocument();
    expect(screen.getByText(/#1 \/ 28/i)).toBeInTheDocument();
    expect(screen.getAllByText('PASS').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /print report card/i })).toBeInTheDocument();
  });
});
