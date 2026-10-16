import React from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Dark overlay backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-64 max-w-[80vw] h-full bg-slate-900 z-10 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
        <Sidebar onCloseMobile={onClose} />
      </div>
    </div>
  );
};
