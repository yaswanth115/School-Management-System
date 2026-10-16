import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Upload,
  Search,
  Filter,
  Eye,
  RotateCcw,
  GraduationCap,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Student, AcademicYear, SchoolClass, StudentStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Table, Column } from '../../components/ui/Table';
import { BulkImportModal } from './BulkImportModal';

export const StudentListPage: React.FC = () => {
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [isLoading, setIsLoading] = useState(true);

  // Filter Metadata
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  // Filter Values
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');

  // Bulk Import Modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Fetch filter dropdown options once
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [yearsRes, classesRes] = await Promise.all([
          apiClient.get('/academics/years'),
          apiClient.get('/academics/classes'),
        ]);
        setYears(yearsRes.data);
        setClasses(classesRes.data);
      } catch (err) {
        console.error('Failed to load filter metadata', err);
      }
    };
    fetchMetadata();
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      if (search.trim()) params.append('search', search.trim());
      if (selectedYear) params.append('academic_year_id', selectedYear);
      if (selectedClass) params.append('class_id', selectedClass);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await apiClient.get(`/students?${params.toString()}`);
      setStudents(response.data.items);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, selectedYear, selectedClass, selectedStatus]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const columns: Column<Student>[] = [
    {
      key: 'admission_number',
      header: 'Admission ID',
      render: (s) => (
        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
          {s.admission_number}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Student Name',
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
            {s.first_name.charAt(0)}{s.last_name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-900 leading-tight">{s.full_name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{s.gender} • {s.blood_group || 'Blood N/A'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class / Section',
      render: (s) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800">{s.current_class_name || 'Unassigned'}</span>
          <span className="text-slate-400 ml-1">({s.current_section_name || '—'})</span>
        </div>
      ),
    },
    {
      key: 'roll',
      header: 'Roll No',
      render: (s) => (
        <span className="text-xs font-mono text-slate-600">
          {s.current_roll_number || '—'}
        </span>
      ),
    },
    {
      key: 'guardian',
      header: 'Primary Guardian',
      render: (s) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800 leading-tight">{s.guardian_name || '—'}</p>
          <p className="text-slate-400 mt-0.5">{s.guardian_phone || '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <Badge variant={s.status === 'ACTIVE' ? 'emerald' : 'amber'}>
          {s.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (s) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/students/${s.id}`)}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
        >
          Profile
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Student Directory & Admissions</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Administer admissions, enrollment records, class placements, and student lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setIsBulkOpen(true)}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Bulk Import
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/students/admission')}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            New Admission
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by student name, admission number, or roll no..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto">
          <div className="w-full sm:w-40">
            <Select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Classes' },
                ...classes.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          <div className="w-full sm:w-36">
            <Select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'TRANSFERRED', label: 'Transferred' },
                { value: 'WITHDRAWN', label: 'Withdrawn' },
                { value: 'ALUMNI', label: 'Alumni' },
              ]}
            />
          </div>

          {(search || selectedClass || selectedStatus !== 'ACTIVE') && (
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setSearch('');
                setSelectedClass('');
                setSelectedStatus('ACTIVE');
                setPage(1);
              }}
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Student Data Table */}
      <Table
        columns={columns}
        data={students}
        isLoading={isLoading}
        emptyMessage="No students found matching current filters"
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(newPage) => setPage(newPage)}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        years={years}
        classes={classes}
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSuccess={() => fetchStudents()}
      />
    </div>
  );
};
