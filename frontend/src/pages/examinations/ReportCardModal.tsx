import React from 'react';
import { StudentReportCard } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Printer, GraduationCap, Award, CheckCircle, XCircle } from 'lucide-react';

interface ReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportCard: StudentReportCard | null;
}

export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  isOpen,
  onClose,
  reportCard,
}) => {
  if (!reportCard) return null;

  const handlePrint = () => {
    window.print();
  };

  const isPassed = reportCard.result_status === 'PASS';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Academic Report Card"
      description="Official terminal examination report card with class rank and subject performance."
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Print Button Bar */}
        <div className="flex justify-end gap-2 print:hidden">
          <Button
            type="button"
            variant="outline"
            leftIcon={<Printer className="w-4 h-4 text-slate-600" />}
            onClick={handlePrint}
          >
            Print Report Card
          </Button>
        </div>

        {/* Printable Card Container */}
        <div
          id="printable-report-card"
          className="border-2 border-slate-300 rounded-xl p-6 sm:p-8 bg-white shadow-sm text-slate-900 print:border-none print:p-0 print:shadow-none"
        >
          {/* Institutional Letterhead */}
          <div className="text-center border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <GraduationCap className="w-8 h-8 text-indigo-700" />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 uppercase">
                Greenwood International School
              </h1>
            </div>
            <p className="text-xs uppercase tracking-wider text-slate-600 font-medium">
              Affiliated to CBSE, New Delhi &bull; Excellence in Knowledge and Character
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Sector 12, Academic Enclave, City Campus &bull; Phone: +91 98765 43210 &bull; info@greenwood.edu
            </p>
            <div className="inline-block mt-3 px-4 py-1 bg-indigo-900 text-white text-xs font-bold uppercase tracking-widest rounded-full">
              Academic Performance Report Card
            </div>
          </div>

          {/* Student & Examination Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm mb-6">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider block">Student Name</span>
              <span className="font-bold text-slate-900 text-base">{reportCard.student_name}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider block">Admission Number</span>
              <span className="font-mono font-semibold text-slate-800">{reportCard.admission_number}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider block">Class & Section</span>
              <span className="font-bold text-slate-800">
                {reportCard.class_name} - {reportCard.section_name}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider block">Roll Number</span>
              <span className="font-semibold text-slate-800">{reportCard.roll_number || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider block">Academic Session</span>
              <span className="font-semibold text-slate-800">{reportCard.academic_year_name}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider block">Examination</span>
              <span className="font-semibold text-indigo-700">{reportCard.exam_name}</span>
            </div>
          </div>

          {/* Subject-Wise Performance Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-800 text-xs uppercase font-semibold border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3 text-center">Max</th>
                  <th className="py-2.5 px-3 text-center">Pass</th>
                  <th className="py-2.5 px-3 text-center">Marks Obtained</th>
                  <th className="py-2.5 px-3 text-center">%</th>
                  <th className="py-2.5 px-3 text-center">Grade</th>
                  <th className="py-2.5 px-3 text-center">Grade Pt</th>
                  <th className="py-2.5 px-3 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportCard.subjects.map((sub) => (
                  <tr key={sub.subject_id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-900 block">{sub.subject_name}</span>
                      <span className="text-xs text-slate-500 font-mono">{sub.subject_code}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{Number(sub.max_marks)}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{Number(sub.pass_marks)}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      {sub.is_absent ? (
                        <span className="text-rose-600">Absent</span>
                      ) : sub.marks_obtained !== null && sub.marks_obtained !== undefined ? (
                        Number(sub.marks_obtained)
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700 font-mono">
                      {sub.percentage !== null && sub.percentage !== undefined ? `${Number(sub.percentage)}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-indigo-700">
                      {sub.is_absent ? 'AB' : sub.grade || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      {sub.grade_point !== null && sub.grade_point !== undefined ? Number(sub.grade_point) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {sub.is_absent ? (
                        <span className="text-xs font-semibold text-rose-600">FAIL</span>
                      ) : sub.is_passed ? (
                        <span className="text-xs font-semibold text-emerald-600">PASS</span>
                      ) : (
                        <span className="text-xs font-semibold text-rose-600">FAIL</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-xs text-slate-500 block uppercase">Total Marks</span>
              <span className="text-lg font-extrabold text-slate-900">
                {Number(reportCard.total_marks_obtained)} / {Number(reportCard.total_max_marks)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-xs text-slate-500 block uppercase">Overall %</span>
              <span className="text-lg font-extrabold text-indigo-700">
                {Number(reportCard.overall_percentage)}%
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-xs text-slate-500 block uppercase">Overall Grade</span>
              <span className="text-lg font-extrabold text-slate-900">
                {reportCard.overall_grade || 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
              <span className="text-xs text-indigo-600 block uppercase font-medium">Class Rank</span>
              <span className="text-lg font-extrabold text-indigo-900 flex items-center justify-center gap-1">
                <Award className="w-4 h-4 text-amber-500" />
                {reportCard.class_rank
                  ? `#${reportCard.class_rank} / ${reportCard.total_students_in_class || '-'}`
                  : 'N/A'}
              </span>
            </div>
            <div
              className={`p-3 border rounded-lg text-center ${
                isPassed ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
              }`}
            >
              <span className={`text-xs block uppercase font-medium ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                Final Result
              </span>
              <span
                className={`text-lg font-extrabold flex items-center justify-center gap-1 ${
                  isPassed ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {isPassed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {reportCard.result_status}
              </span>
            </div>
          </div>

          {/* Institutional Grading Scale Reference */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 mb-8">
            <span className="font-semibold text-slate-800 uppercase block mb-1">
              CBSE 10-Point Grading Scale Reference:
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span><strong>A1:</strong> 91-100% (10.0)</span>
              <span><strong>A2:</strong> 81-90% (9.0)</span>
              <span><strong>B1:</strong> 71-80% (8.0)</span>
              <span><strong>B2:</strong> 61-70% (7.0)</span>
              <span><strong>C1:</strong> 51-60% (6.0)</span>
              <span><strong>C2:</strong> 41-50% (5.0)</span>
              <span><strong>D:</strong> 33-40% (4.0)</span>
              <span><strong>E:</strong> 0-32% (Needs Improvement)</span>
            </div>
          </div>

          {/* Signatures & Issue Date Block */}
          <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs text-slate-600 border-t border-slate-300">
            <div>
              <div className="h-10"></div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                Class Teacher
              </div>
            </div>
            <div>
              <div className="h-10"></div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                Examination In-Charge
              </div>
            </div>
            <div>
              <div className="h-10"></div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                Principal & School Seal
              </div>
            </div>
          </div>

          <div className="mt-4 text-center text-[11px] text-slate-400">
            Issued on: {reportCard.issued_date} &bull; Generated securely by Greenwood School Management System
          </div>
        </div>

        {/* Modal Close Action */}
        <div className="flex justify-end pt-2 border-t border-slate-200 print:hidden">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
