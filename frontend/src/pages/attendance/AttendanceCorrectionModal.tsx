import React, { useState, useEffect } from 'react';
import { AttendanceRecord, AttendanceStatus } from '../../types';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { History, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onSuccess: () => void;
}

export const AttendanceCorrectionModal: React.FC<AttendanceCorrectionModalProps> = ({
  isOpen,
  onClose,
  record,
  onSuccess,
}) => {
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('PRESENT');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      setNewStatus(record.status);
      setReason('');
      setError(null);
    }
  }, [record]);

  if (!record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newStatus === record.status) {
      setError('Please select a different status to make a correction.');
      return;
    }

    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a descriptive audit reason for this correction (at least 5 characters).');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.put(`/attendance/records/${record.id}/correct`, {
        new_status: newStatus,
        reason: reason.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update attendance record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (st: AttendanceStatus) => {
    switch (st) {
      case 'PRESENT':
        return 'emerald';
      case 'ABSENT':
        return 'rose';
      case 'LATE':
        return 'amber';
      case 'HALF_DAY':
        return 'blue';
      case 'APPROVED_LEAVE':
        return 'purple';
      default:
        return 'slate';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Authorized Attendance Correction"
      description="Adjust recorded attendance status with mandatory audit explanation."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Student Context */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-sm">
          <div>
            <span className="text-xs text-slate-500 block">Student</span>
            <span className="font-bold text-slate-900">{record.student_name}</span>
            <span className="text-xs text-slate-500 font-mono ml-2">({record.admission_number})</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block text-right">Current Status</span>
            <Badge variant={getStatusBadgeVariant(record.status)}>{record.status}</Badge>
          </div>
        </div>

        {/* New Status Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Corrected Attendance Status
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(
              [
                { value: 'PRESENT', label: 'Present' },
                { value: 'ABSENT', label: 'Absent' },
                { value: 'LATE', label: 'Late' },
                { value: 'HALF_DAY', label: 'Half Day' },
                { value: 'APPROVED_LEAVE', label: 'Leave' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNewStatus(opt.value)}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                  newStatus === opt.value
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Reason */}
        <div>
          <label htmlFor="correction-reason" className="block text-sm font-medium text-slate-700 mb-1">
            Audit Reason for Adjustment <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="correction-reason"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            placeholder="e.g. Student arrived at 8:45 AM due to bus breakdown on Route 4; verified by reception."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            This reason will be permanently recorded in the institutional audit log.
          </p>
        </div>

        {/* Past Correction History if any */}
        {record.corrections && record.corrections.length > 0 && (
          <div className="pt-2 border-t border-slate-200">
            <h5 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5 mb-2">
              <History className="w-3.5 h-3.5 text-slate-500" />
              Prior Adjustment History
            </h5>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {record.corrections.map((c) => (
                <div key={c.id} className="text-xs p-2 bg-slate-50 rounded border border-slate-200">
                  <div className="flex items-center justify-between font-semibold">
                    <span>
                      {c.previous_status} &rarr; {c.new_status}
                    </span>
                    <span className="text-slate-400 font-normal">
                      {new Date(c.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 italic mt-0.5">&ldquo;{c.reason}&rdquo;</p>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Adjusted by {c.changed_by_name || 'Staff'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Confirm Correction
          </Button>
        </div>
      </form>
    </Modal>
  );
};
