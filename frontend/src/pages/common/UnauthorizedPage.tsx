import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">403</h1>
      <h2 className="text-xl font-bold text-slate-800 mt-2">Access Denied</h2>
      <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6">
        You do not possess the required permissions to view this section of the school portal.
      </p>
      <Link to="/dashboard">
        <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
};
