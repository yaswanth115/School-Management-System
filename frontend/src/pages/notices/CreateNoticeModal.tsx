import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { NoticeAudience, NoticeCreateRequest, SchoolClass, Section } from '../../types';

interface CreateNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateNoticeModal: React.FC<CreateNoticeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<NoticeAudience>('ALL');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadClasses();
    }
  }, [isOpen]);

  useEffect(() => {
    if (classId) {
      loadSections(classId);
    } else {
      setSections([]);
      setSectionId('');
    }
  }, [classId]);

  const loadClasses = async () => {
    try {
      const res = await apiClient.get<SchoolClass[]>('/academics/classes');
      setClasses(res.data);
    } catch (err: any) {
      console.error('Failed to load classes', err);
    }
  };

  const loadSections = async (cId: string) => {
    try {
      const res = await apiClient.get<Section[]>(`/academics/classes/${cId}/sections`);
      setSections(res.data);
    } catch (err: any) {
      console.error('Failed to load sections', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and notice content are required.');
      return;
    }

    if (targetAudience === 'CLASS_SPECIFIC' && !classId) {
      setError('Please select a target class for class-specific notice.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const payload: NoticeCreateRequest = {
        title: title.trim(),
        content: content.trim(),
        target_audience: targetAudience,
        class_id: targetAudience === 'CLASS_SPECIFIC' && classId ? classId : null,
        section_id: targetAudience === 'CLASS_SPECIFIC' && sectionId ? sectionId : null,
        is_pinned: isPinned,
        is_published: true,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      await apiClient.post('/notices', payload);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to publish notice. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setTargetAudience('ALL');
    setClassId('');
    setSectionId('');
    setIsPinned(false);
    setExpiresAt('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Publish New Notice" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <Input
          label="Notice Title"
          placeholder="e.g. Annual Sports Day 2026, Revision Schedule"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Notice Body / Message <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write the full announcement, guidelines, or instructions here..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Target Audience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value as NoticeAudience)}
            options={[
              { value: 'ALL', label: 'All School Members (Public)' },
              { value: 'TEACHERS', label: 'Faculty & Teachers Only' },
              { value: 'PARENTS', label: 'Parents & Guardians Only' },
              { value: 'STUDENTS', label: 'Students Only' },
              { value: 'CLASS_SPECIFIC', label: 'Class / Section Specific' },
            ]}
          />

          <Input
            label="Expiration Date (Optional)"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        {targetAudience === 'CLASS_SPECIFIC' && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
            <Select
              label="Select Target Class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              options={[
                { value: '', label: 'Select a Class...' },
                ...classes.map((c) => ({ value: c.id, label: c.name })),
              ]}
              required
            />

            <Select
              label="Select Section (Optional)"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={!classId}
              options={[
                { value: '', label: 'All Sections in this Class' },
                ...sections.map((s) => ({ value: s.id, label: `Section ${s.name}` })),
              ]}
            />
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="is_pinned"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="is_pinned" className="text-sm font-medium text-slate-700 cursor-pointer">
            Pin to top of Notice Board (Important Announcement)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Publish Notice
          </Button>
        </div>
      </form>
    </Modal>
  );
};
