import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        {submitted ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Check your inbox</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              If an account exists with <span className="font-semibold text-slate-700">{email}</span>, we have dispatched a password reset link to it.
            </p>
            <Link to="/login">
              <Button variant="outline" size="md" className="mt-6 w-full">
                Return to Login
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-slate-900">Reset your password</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Enter your registered school email address to receive password reset instructions.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. staff@school.com"
                required
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                Send Reset Link
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
