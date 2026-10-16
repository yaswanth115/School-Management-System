import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GraduationCap, Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Role } from '../../types';

const DEMO_ACCOUNTS: Array<{ role: Role; email: string; label: string; pass: string }> = [
  { role: 'ADMIN', label: 'Admin', email: 'admin@school.com', pass: 'Admin@12345' },
  { role: 'PRINCIPAL', label: 'Principal', email: 'principal@school.com', pass: 'Principal@12345' },
  { role: 'ACCOUNTANT', label: 'Accountant', email: 'accountant@school.com', pass: 'Accountant@12345' },
  { role: 'TEACHER', label: 'Teacher', email: 'teacher@school.com', pass: 'Teacher@12345' },
  { role: 'PARENT', label: 'Parent', email: 'parent@school.com', pass: 'Parent@12345' },
  { role: 'STUDENT', label: 'Student', email: 'student@school.com', pass: 'Student@12345' },
];

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid email or password. Please verify credentials.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 pt-8 pb-7 text-white text-center">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">BrightEdu Academy</h2>
          <p className="text-xs text-indigo-100 mt-1 font-medium">
            Unified School Management & Learning Portal
          </p>
        </div>

        {/* Body Content */}
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Sign in to your account</h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials to access your portal dashboard.
            </p>
          </div>

          {errorMessage && (
            <Alert
              type="error"
              message={errorMessage}
              onClose={() => setErrorMessage(null)}
              className="mb-5"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@school.com"
              required
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                leftIcon={<Lock className="w-4 h-4" />}
              />
              <div className="flex justify-end mt-1.5">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* Quick Demo Role Selector */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Quick Test Credentials (Phase 1)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => fillDemoAccount(acc.email, acc.pass)}
                  className="text-xs font-medium px-2 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-700 transition-colors text-center"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
