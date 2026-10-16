import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { AcademicYear, SchoolClass } from '../../types';

interface BulkImportModalProps {
  years: AcademicYear[];
  classes: SchoolClass[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  years,
  classes,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const currentYear = years.find((y) => y.is_current) || years[0];

  const [academicYearId, setAcademicYearId] = useState(currentYear?.id || '');
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [sectionId, setSectionId] = useState(classes[0]?.sections[0]?.id || '');
  const [csvContent, setCsvContent] = useState(
    'FirstName,LastName,DOB,Gender,GuardianName,GuardianPhone,GuardianRelation\nDaniel,Evans,2015-04-12,Male,Michael Evans,+91 9876500001,Father\nSophia,Davis,2015-09-22,Female,Emma Davis,+91 9876500002,Mother'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedClass = classes.find((c) => c.id === classId);
  const availableSections = selectedClass?.sections || [];

  const handleClassChange = (cId: string) => {
    setClassId(cId);
    const cls = classes.find((c) => c.id === cId);
    if (cls && cls.sections.length > 0) {
      setSectionId(cls.sections[0].id);
    } else {
      setSectionId('');
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const lines = csvContent.trim().split('\n');
    if (lines.length <= 1) {
      setError('Please provide at least one student data row.');
      return;
    }

    const students = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length >= 6) {
        students.push({
          first_name: parts[0],
          last_name: parts[1],
          date_of_birth: parts[2],
          gender: parts[3],
          guardian_name: parts[4],
          guardian_phone: parts[5],
          guardian_relation: parts[6] || 'Parent',
        });
      }
    }

    if (students.length === 0) {
      setError('Invalid CSV format. Please ensure comma-separated values.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiClient.post('/students/bulk-import', {
        academic_year_id: academicYearId,
        class_id: classId,
        section_id: sectionId,
        students,
      });

      setResult(`Successfully imported ${res.data.successfully_imported} of ${res.data.total_submitted} students!`);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Bulk import failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Student Admissions Import"
      description="Batch upload students into a selected class and section using CSV format."
      maxWidth="xl"
    >
      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
      {result && <Alert type="success" message={result} onClose={() => setResult(null)} className="mb-4" />}

      <form onSubmit={handleImport} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Academic Year"
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            options={years.map((y) => ({ value: y.id, label: y.name }))}
          />

          <Select
            label="Target Class"
            value={classId}
            onChange={(e) => handleClassChange(e.target.value)}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
          />

          <Select
            label="Target Section"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            options={availableSections.map((s) => ({ value: s.id, label: s.name }))}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            CSV Student Records (Headers: FirstName, LastName, DOB, Gender, GuardianName, GuardianPhone, Relation)
          </label>
          <textarea
            rows={6}
            className="w-full font-mono text-xs p-3 rounded-lg border border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Run Bulk Import
          </Button>
        </div>
      </form>
    </Modal>
  );
};
