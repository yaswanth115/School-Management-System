import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Bell, User, LogOut, ChevronDown, KeyRound, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';

interface TopbarProps {
  onToggleMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Compute readable page title from current path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/users')) return 'User & Role Management';
    if (path.startsWith('/audit')) return 'Audit Trail & Activity Log';
    if (path.startsWith('/profile')) return 'My Account Profile';
    if (path.startsWith('/dashboard')) return `${user?.role || 'User'} Dashboard`;
    return 'School Management System';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
            {getPageTitle()}
          </h2>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Academic Year 2026–2027</span>
            <span>•</span>
            <span className="text-indigo-600 font-medium">BrightEdu Academy</span>
          </div>
        </div>
      </div>

      {/* Right: Notification & Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Academic Session Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
          <Shield className="w-3.5 h-3.5 text-indigo-600" />
          <span>Role: {user?.role}</span>
        </div>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-none">
                {user?.full_name}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                {user?.email}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{user?.full_name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1.5">
                  <Badge role={user?.role} />
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Account Profile
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
