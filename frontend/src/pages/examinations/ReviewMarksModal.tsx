import React, { useState, useEffect } from 'react';
import { ExamSubmissionBatch } from '../../types';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { CheckCircle, RotateCcw, AlertTriangle, UserCheck } from 'lucide-react';

interface ReviewMarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string | null;
  onSuccess: () => void;
}

export const ReviewMarksModal: React.FC<ReviewMarksModalProps> = ({
  isOpen,
  onClose,
  batchId,
  onSuccess,
}) => {
  const [batch, setBatch] = useState<ExamSubmissionBatch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewComments, setReviewComments] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !batchId) {
      setBatch(null);
      setReviewComments('');
      setError(null);
      return;
    }

    const fetchBatch = async () => {
      try {
        setIsLoading(true);
        const res = await apiClient.get<ExamSubmissionBatch>(`/exams/submissions/${batchId}`);
        setBatch(res.data);
        setReviewComments(res.data.review_comments || '');
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load marks submission batch.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatch();
  }, [isOpen, batchId]);

  const handleReview = async (decision: 'APPROVED' | 'RETURNED') => {
    if (!batchId) return;
    setError(null);

    if (decision === 'RETURNED' && !reviewComments.trim()) {
      setError('Please provide review comments explaining why this submission is being returned.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post(`/exams/submissions/${batchId}/review`, {
        status: decision,
        review_comments: reviewComments.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${decision.toLowerCase()} submission.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics calculation
  const totalStudents = batch?.marks.length || 0;
  const absentCount = batch?.marks.filter((m) => m.is_absent).length || 0;
  const evaluatedMarks = batch?.marks.filter((m) => !m.is_absent && m.marks_obtained !== null && m.marks_obtained !== undefined) || [];
  const maxMarks = batch?.max_marks || 100;
  const passMarks = batch?.pass_marks || 35;
  const passedCount = evaluatedMarks.filter((m) => Number(m.marks_obtained) >= passMarks).length;
  const failedCount = evaluatedMarks.length - passedCount;
  const averageMarks = evaluatedMarks.length > 0
    ? (evaluatedMarks.reduce((acc, m) => acc + Number(m.marks_obtained), 0) / evaluatedMarks.length).toFixed(1)
    : '0';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Principal Review: Marks Submission Batch"
      description="Verify scores submitted by the subject teacher before approving into permanent academic records."
      maxWidth="2xl"
    >
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Spinner size="lg" label="Loading batch evaluation details..." />
        </div>
      ) : error && !batch ? (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      ) : batch ? (
        <div className="space-y-6">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          {/* Batch Meta Header */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Examination</span>
                <h4 className="text-base font-bold text-slate-900">{batch.exam_name}</h4>
              </div>
              <div>
                <Badge
                  variant={
                    batch.status === 'APPROVED'
                      ? 'emerald'
                      : batch.status === 'SUBMITTED'
                      ? 'blue'
                      : batch.status === 'RETURNED'
                      ? 'amber'
                      : 'slate'
                  }
                >
                  {batch.status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-slate-500 text-xs block">Class & Section</span>
                <span className="font-semibold text-slate-800">
                  {batch.class_name} - {batch.section_name}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">Subject</span>
                <span className="font-semibold text-slate-800">{batch.subject_name}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">Submitted By</span>
                <span className="font-semibold text-slate-800">{batch.submitted_by_name || 'Teacher'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">Max / Pass Marks</span>
                <span className="font-semibold text-slate-800">
                  {maxMarks} / {passMarks}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Enrolled</span>
              <span className="text-lg font-bold text-slate-800">{totalStudents}</span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-xs text-emerald-600 block">Passed</span>
              <span className="text-lg font-bold text-emerald-700">{passedCount}</span>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200">
              <span className="text-xs text-rose-600 block">Failed</span>
              <span className="text-lg font-bold text-rose-700">{failedCount}</span>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
              <span className="text-xs text-amber-600 block">Absent</span>
              <span className="text-lg font-bold text-amber-700">{absentCount}</span>
            </div>
            <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-200">
              <span className="text-xs text-indigo-600 block">Class Avg</span>
              <span className="text-lg font-bold text-indigo-700">{averageMarks}</span>
            </div>
          </div>

          {/* Student Marks Roster */}
          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700 text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Roll / Adm</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Score / {maxMarks}</th>
                  <th className="py-2.5 px-3 text-center">Grade</th>
                  <th className="py-2.5 px-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {batch.marks.map((mark) => (
                  <tr key={mark.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-600 font-mono text-xs">
                      {mark.roll_number || mark.admission_number}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900">{mark.student_name}</td>
                    <td className="py-2 px-3 text-center">
                      {mark.is_absent ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
                          Absent
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Present
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center font-bold">
                      {mark.is_absent ? '-' : mark.marks_obtained !== null ? Number(mark.marks_obtained) : '-'}
                    </td>
                    <td className="py-2 px-3 text-center font-semibold text-indigo-600">
                      {mark.is_absent ? 'AB' : mark.grade || '-'}
                    </td>
                    <td className="py-2 px-3 text-xs text-slate-500 italic">{mark.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Review Decision & Comments */}
          <div className="space-y-3 pt-2">
            <label className="block text-sm font-medium text-slate-700">
              Principal Review Comments / Feedback
            </label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={2}
              placeholder="e.g. Approved for final report card generation, or mention discrepancies for correction."
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                leftIcon={<RotateCcw className="w-4 h-4 text-amber-600" />}
                onClick={() => handleReview('RETURNED')}
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Return to Teacher
              </Button>
              <Button
                type="button"
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                leftIcon={<CheckCircle className="w-4 h-4 text-white" />}
                onClick={() => handleReview('APPROVED')}
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Approve & Publish Marks
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
