import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Search, RotateCcw } from 'lucide-react';
import { apiClient } from '../../api/client';
import { AuditLog } from '../../types';
import { Table, Column } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      if (actionFilter.trim()) params.append('action', actionFilter.trim());
      if (resourceFilter.trim()) params.append('resource_type', resourceFilter.trim());

      const response = await apiClient.get(`/audit?${params.toString()}`);
      setLogs(response.data.items);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, actionFilter, resourceFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (log) => (
        <span className="text-xs font-mono text-slate-600">
          {new Date(log.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User Account',
      render: (log) => (
        <span className="text-xs font-medium text-slate-800">
          {log.user_email || 'System / Anonymous'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => {
        const isFailure = log.action.includes('FAILED') || log.action.includes('DEACT');
        return (
          <Badge variant={isFailure ? 'rose' : 'indigo'}>
            {log.action}
          </Badge>
        );
      },
    },
    {
      key: 'resource',
      header: 'Resource',
      render: (log) => (
        <span className="text-xs text-slate-600 uppercase font-mono">
          {log.resource_type}
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'IP Address',
      render: (log) => (
        <span className="text-xs font-mono text-slate-400">
          {log.ip_address || '—'}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (log) => (
        <span className="text-xs text-slate-500 font-mono truncate max-w-xs block">
          {log.details ? JSON.stringify(log.details) : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-indigo-600" />
          Audit Trail & Activity Log
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Immutable event log tracking security operations, user logins, and data modifications.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Filter by action (e.g. LOGIN, USER_CREATED)..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Input
            placeholder="Filter by resource type..."
            value={resourceFilter}
            onChange={(e) => {
              setResourceFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-60"
          />

          {(actionFilter || resourceFilter) && (
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setActionFilter('');
                setResourceFilter('');
                setPage(1);
              }}
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyMessage="No audit log entries recorded"
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(newPage) => setPage(newPage)}
      />
    </div>
  );
};
