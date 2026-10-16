import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, Search, Filter, BookOpen, Mail, Phone, RotateCcw } from 'lucide-react';
import { apiClient } from '../../api/client';
import { StaffProfile } from '../../types';
import { Table, Column } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const StaffListPage: React.FC = () => {
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const fetchStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (departmentFilter) params.append('department', departmentFilter);

      const res = await apiClient.get(`/staff?${params.toString()}`);
      setStaff(res.data);
    } catch (err) {
      console.error('Failed to load staff list', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, departmentFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const columns: Column<StaffProfile>[] = [
    {
      key: 'employee_id',
      header: 'Staff ID',
      render: (s) => (
        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
          {s.employee_id}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Staff Member',
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
            {s.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-900 leading-tight">{s.full_name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{s.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'designation',
      header: 'Designation & Dept',
      render: (s) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800">{s.designation}</p>
          <p className="text-slate-400 mt-0.5">{s.department}</p>
        </div>
      ),
    },
    {
      key: 'qualification',
      header: 'Qualification',
      render: (s) => (
        <span className="text-xs text-slate-600 font-medium">
          {s.qualification || '—'}
        </span>
      ),
    },
    {
      key: 'assignments',
      header: 'Teaching Load',
      render: (s) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
          <span>{s.assigned_subjects_count} assigned classes</span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact Phone',
      render: (s) => (
        <span className="text-xs font-mono text-slate-600">
          {s.phone || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-indigo-600" />
          Faculty & Staff Directory
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          View teachers, department faculties, academic qualifications, and teaching loads.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search faculty by name, employee ID, or designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="w-full sm:w-44">
            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              options={[
                { value: '', label: 'All Departments' },
                { value: 'Mathematics', label: 'Mathematics' },
                { value: 'Science', label: 'Science' },
                { value: 'Administration', label: 'Administration' },
                { value: 'Finance', label: 'Finance' },
              ]}
            />
          </div>

          {(search || departmentFilter) && (
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setSearch('');
                setDepartmentFilter('');
              }}
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <Table
        columns={columns}
        data={staff}
        isLoading={isLoading}
        emptyMessage="No faculty or staff found"
      />
    </div>
  );
};
