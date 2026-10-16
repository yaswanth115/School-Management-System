import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  CreditCard,
  Award,
  CheckSquare,
  Bell,
  FileText,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  allowedRoles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    allowedRoles: ['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'TEACHER', 'PARENT', 'STUDENT'],
  },
  {
    label: 'User Management',
    path: '/users',
    icon: <Users className="w-5 h-5" />,
    allowedRoles: ['ADMIN', 'PRINCIPAL'],
  },
  {
    label: 'Students',
    path: '/students',
    icon: <GraduationCap className="w-5 h-5" />,
    allowedRoles: ['ADMIN', 'PRINCIPAL', 'ACCOUNTANT'],
  },
  {
    label: 'Academics',
    path: '/academics',
    icon: <BookOpen className="w-5 h-5" />,
    allowedRoles: ['ADMIN', 'PRINCIPAL', 'TEACHER'],
  },
  {
    label: 'Staff Directory',
    path: '/staff',
    icon: <UserCheck className="w-5 h-5" />,
    allowedRoles: ['ADMIN', 'PRINCIPAL'],
  },
  {
    label: 'Fee Management',
    path: '/fees',
    icon: <CreditCard className="w-5 h-5" />,
    allowedRoles: ['ADMIN', 'ACCOUNTANT', 'PRINCIPAL', 'PARENT', 'STUDENT'],
  },
  {
    label: 'Examinations',
    path: '/examinations',
    icon: <Award className="w-5 h-5" />,
    allowedRoles: ['ADMIN', 'PRINCIPAL', 'TEACHER'],
  },
  {
    label: 'Attendance',
    path: '/attendance',
    icon: <CheckSquare className="w-5 h-5" />,
    allowedRoles: ['ADMIN', 'PRINCIPAL', 'TEACHER'],
  },
  {
    label: 'My Children',
    path: '/parent/children',
    icon: <Users className="w-5 h-5" />,
    allowedRoles: ['PARENT'],
  },
  {
    label: 'My Academics',
    path: '/student/profile',
    icon: <GraduationCap className="w-5 h-5" />,
    allowedRoles: ['STUDENT'],
  },
  {
    label: 'Notices',
    path: '/notices',
    icon: <Bell className="w-5 h-5" />,
    allowedRoles: ['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'TEACHER', 'PARENT', 'STUDENT'],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: <FileText className="w-5 h-5" />,
    allowedRoles: ['ADMIN', 'PRINCIPAL', 'ACCOUNTANT'],
  },
  {
    label: 'Audit Trail',
    path: '/audit',
    icon: <ShieldAlert className="w-5 h-5" />,
    allowedRoles: ['ADMIN'],
  },
];

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user } = useAuth();

  const filteredNavItems = NAV_ITEMS.filter(
    (item) => user && item.allowedRoles.includes(user.role)
  );

  return (
    <aside className="w-64 h-full bg-slate-900 text-slate-300 flex flex-col shrink-0 select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/40">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-tight">BrightEdu</h1>
          <p className="text-[11px] font-medium text-slate-400">School Management</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          Navigation
        </div>
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-400 font-medium">Session Secure</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">v1.0.0 (Phase 1 Ready)</p>
      </div>
    </aside>
  );
};
