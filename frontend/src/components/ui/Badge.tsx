import React from 'react';
import { Role } from '../../types';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'slate' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' | 'blue';
  role?: Role;
  isActive?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  role,
  isActive,
  className = '',
}) => {
  let badgeClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';

  if (role) {
    const roleColors: Record<Role, string> = {
      ADMIN: 'bg-purple-100 text-purple-800 border border-purple-200',
      PRINCIPAL: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
      ACCOUNTANT: 'bg-amber-100 text-amber-800 border border-amber-200',
      TEACHER: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      PARENT: 'bg-blue-100 text-blue-800 border border-blue-200',
      STUDENT: 'bg-teal-100 text-teal-800 border border-teal-200',
    };
    return (
      <span className={`${badgeClasses} ${roleColors[role]} ${className}`}>
        {role}
      </span>
    );
  }

  if (isActive !== undefined) {
    return isActive ? (
      <span className={`${badgeClasses} bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
        Active
      </span>
    ) : (
      <span className={`${badgeClasses} bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
        Inactive
      </span>
    );
  }

  const variantStyles = {
    slate: 'bg-slate-100 text-slate-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
  };

  const style = variant ? variantStyles[variant] : variantStyles.slate;

  return (
    <span className={`${badgeClasses} ${style} ${className}`}>
      {children}
    </span>
  );
};
