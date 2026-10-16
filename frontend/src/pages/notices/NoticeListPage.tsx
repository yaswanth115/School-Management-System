import React, { useState, useEffect } from 'react';
import {
  Bell,
  Pin,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Trash2,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { NoticeItem, NoticeAudience, NoticeListResponse } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { CreateNoticeModal } from './CreateNoticeModal';

export const NoticeListPage: React.FC = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAudience, setSelectedAudience] = useState<string>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingNotice, setViewingNotice] = useState<NoticeItem | null>(null);

  const canCreateNotice = user && ['ADMIN', 'PRINCIPAL', 'TEACHER'].includes(user.role);

  useEffect(() => {
    fetchNotices();
  }, [selectedAudience]);

  const fetchNotices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = '/notices?limit=100';
      if (selectedAudience !== 'ALL') {
        url += `&target_audience=${selectedAudience}`;
      }
      const res = await apiClient.get<NoticeListResponse>(url);
      setNotices(res.data.items);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load notices.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePin = async (notice: NoticeItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.patch(`/notices/${notice.id}/pin`, { is_pinned: !notice.is_pinned });
      fetchNotices();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to toggle pin state.');
    }
  };

  const handleDeleteNotice = async (noticeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    try {
      await apiClient.delete(`/notices/${noticeId}`);
      fetchNotices();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete notice.');
    }
  };

  const getAudienceBadgeVariant = (audience: NoticeAudience) => {
    switch (audience) {
      case 'ALL':
        return 'emerald';
      case 'TEACHERS':
        return 'indigo';
      case 'PARENTS':
        return 'purple';
      case 'STUDENTS':
        return 'amber';
      case 'CLASS_SPECIFIC':
        return 'slate';
      default:
        return 'slate';
    }
  };

  const filteredNotices = notices.filter((n) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      n.title.toLowerCase().includes(term) ||
      n.content.toLowerCase().includes(term) ||
      (n.author_name && n.author_name.toLowerCase().includes(term))
    );
  });

  const pinnedNotices = filteredNotices.filter((n) => n.is_pinned);
  const regularNotices = filteredNotices.filter((n) => !n.is_pinned);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-indigo-600" />
            Notice Board & Announcements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Institutional bulletins, academic announcements, and targeted updates.
          </p>
        </div>

        {canCreateNotice && (
          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Publish Notice
          </Button>
        )}
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Filter Toolbar */}
      <Card className="!p-4 bg-white border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search announcements by keywords or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: 'ALL', label: 'All Notices' },
              { id: 'TEACHERS', label: 'Faculty' },
              { id: 'PARENTS', label: 'Parents' },
              { id: 'STUDENTS', label: 'Students' },
              { id: 'CLASS_SPECIFIC', label: 'Class Specific' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedAudience(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedAudience === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Spinner size="lg" label="Loading announcements..." />
        </div>
      ) : filteredNotices.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No notices found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            There are currently no published announcements matching the selected audience criteria.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pinned Announcements */}
          {pinnedNotices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                <Pin className="w-4 h-4 fill-amber-500 text-amber-500" />
                Important / Pinned Announcements ({pinnedNotices.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pinnedNotices.map((notice) => (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    userRole={user?.role}
                    userId={user?.id}
                    onOpen={() => setViewingNotice(notice)}
                    onTogglePin={(e) => handleTogglePin(notice, e)}
                    onDelete={(e) => handleDeleteNotice(notice.id, e)}
                    getAudienceBadgeVariant={getAudienceBadgeVariant}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Regular Announcements */}
          <div className="space-y-3">
            {pinnedNotices.length > 0 && (
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                General Announcements ({regularNotices.length})
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regularNotices.map((notice) => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  userRole={user?.role}
                  userId={user?.id}
                  onOpen={() => setViewingNotice(notice)}
                  onTogglePin={(e) => handleTogglePin(notice, e)}
                  onDelete={(e) => handleDeleteNotice(notice.id, e)}
                  getAudienceBadgeVariant={getAudienceBadgeVariant}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reader Modal */}
      {viewingNotice && (
        <Modal
          isOpen={!!viewingNotice}
          onClose={() => setViewingNotice(null)}
          title={viewingNotice.title}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
              <Badge variant={getAudienceBadgeVariant(viewingNotice.target_audience)}>
                {viewingNotice.target_audience.replace('_', ' ')}
              </Badge>
              {viewingNotice.class_name && (
                <Badge variant="slate">
                  Class: {viewingNotice.class_name}
                  {viewingNotice.section_name ? ` (${viewingNotice.section_name})` : ''}
                </Badge>
              )}
              {viewingNotice.is_pinned && (
                <Badge variant="amber" className="flex items-center gap-1">
                  <Pin className="w-3 h-3 fill-current" /> Pinned
                </Badge>
              )}
              <span className="text-xs text-slate-500 ml-auto flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(viewingNotice.publish_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-wrap leading-relaxed py-2">
              {viewingNotice.content}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Posted by <strong className="text-slate-700">{viewingNotice.author_name || 'Administration'}</strong>
              </span>
              <Button variant="outline" size="sm" onClick={() => setViewingNotice(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Modal */}
      <CreateNoticeModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          fetchNotices();
        }}
      />
    </div>
  );
};

interface NoticeCardProps {
  notice: NoticeItem;
  userRole?: string;
  userId?: string;
  onOpen: () => void;
  onTogglePin: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  getAudienceBadgeVariant: (audience: NoticeAudience) => any;
}

const NoticeCard: React.FC<NoticeCardProps> = ({
  notice,
  userRole,
  userId,
  onOpen,
  onTogglePin,
  onDelete,
  getAudienceBadgeVariant,
}) => {
  const canManageNotice =
    userRole &&
    (['ADMIN', 'PRINCIPAL'].includes(userRole) ||
      (userRole === 'TEACHER' && notice.author_id === userId));

  return (
    <Card
      onClick={onOpen}
      className={`cursor-pointer transition-all hover:shadow-md hover:border-indigo-300 relative ${
        notice.is_pinned ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex flex-col h-full justify-between space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <Badge variant={getAudienceBadgeVariant(notice.target_audience)}>
                {notice.target_audience.replace('_', ' ')}
              </Badge>
              {notice.class_name && (
                <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {notice.class_name}
                  {notice.section_name ? ` - ${notice.section_name}` : ''}
                </span>
              )}
            </div>

            {canManageNotice && (
              <div className="flex items-center gap-1 -mt-1 -mr-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  title={notice.is_pinned ? 'Unpin Notice' : 'Pin Notice'}
                  onClick={onTogglePin}
                  className={`p-1.5 rounded-lg transition-colors ${
                    notice.is_pinned
                      ? 'text-amber-600 bg-amber-100 hover:bg-amber-200'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Pin className={`w-3.5 h-3.5 ${notice.is_pinned ? 'fill-current' : ''}`} />
                </button>

                <button
                  type="button"
                  title="Delete Notice"
                  onClick={onDelete}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <h3 className="text-base font-bold text-slate-900 line-clamp-1 hover:text-indigo-600 transition-colors">
            {notice.title}
          </h3>

          <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
            {notice.content}
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500">
          <span className="flex items-center gap-1 font-medium">
            <User className="w-3 h-3 text-slate-400" />
            {notice.author_name || 'Admin'}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {new Date(notice.publish_date).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Card>
  );
};
