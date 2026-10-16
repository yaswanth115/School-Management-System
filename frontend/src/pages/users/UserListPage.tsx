import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Search,
  Filter,
  Edit2,
  Power,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { User, Role } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Table, Column } from '../../components/ui/Table';
import { Alert } from '../../components/ui/Alert';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';

export const UserListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      if (search.trim()) params.append('search', search.trim());
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter !== '') params.append('is_active', statusFilter);

      const response = await apiClient.get(`/users?${params.toString()}`);
      setUsers(response.data.items);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user: User) => {
    try {
      const targetStatus = !user.is_active;
      await apiClient.patch(`/users/${user.id}/status?is_active=${targetStatus}`);
      setNotification(`Account for ${user.full_name} is now ${targetStatus ? 'active' : 'inactive'}.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to toggle account status.');
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User Details',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
            {u.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-900 leading-tight">{u.full_name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => <Badge role={u.role} />,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (u) => (
        <span className="text-xs text-slate-600 font-mono">
          {u.phone || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => <Badge isActive={u.is_active} />,
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (u) => (
        <span className="text-xs text-slate-500">
          {new Date(u.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (u) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedUser(u);
              setIsEditOpen(true);
            }}
            title="Edit User"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleStatus(u)}
            title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
          >
            <Power
              className={`w-3.5 h-3.5 ${
                u.is_active ? 'text-rose-500 hover:text-rose-700' : 'text-emerald-500 hover:text-emerald-700'
              }`}
            />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Administer system accounts, role assignments, and access permissions.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsAddOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add New User
        </Button>
      </div>

      {notification && (
        <Alert
          type="success"
          message={notification}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-full md:w-44">
            <Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Roles' },
                { value: 'ADMIN', label: 'Admin' },
                { value: 'PRINCIPAL', label: 'Principal' },
                { value: 'ACCOUNTANT', label: 'Accountant' },
                { value: 'TEACHER', label: 'Teacher' },
                { value: 'PARENT', label: 'Parent' },
                { value: 'STUDENT', label: 'Student' },
              ]}
            />
          </div>

          <div className="w-full md:w-36">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Status' },
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
            />
          </div>

          {(search || roleFilter || statusFilter !== '') && (
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setStatusFilter('');
                setPage(1);
              }}
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Users Data Table */}
      <Table
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="No users found"
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(newPage) => setPage(newPage)}
      />

      {/* Modals */}
      <AddUserModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => {
          setNotification('New user created successfully!');
          fetchUsers();
        }}
      />

      <EditUserModal
        user={selectedUser}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={() => {
          setNotification('User details updated successfully!');
          fetchUsers();
        }}
      />
    </div>
  );
};
