import React, { useState } from 'react';
import { User, Lock, Phone, Mail, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';

export const UserProfilePage: React.FC = () => {
  const { user, updateUserContext } = useAuth();

  // Profile Edit State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    try {
      setIsProfileUpdating(true);
      const response = await apiClient.put('/auth/profile', {
        full_name: fullName,
        phone: phone || null,
      });

      if (user) {
        updateUserContext({
          ...user,
          full_name: response.data.full_name,
          phone: response.data.phone,
        });
      }
      setProfileSuccess('Profile details updated successfully');
    } catch (err: any) {
      setProfileError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsProfileUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    try {
      setIsPasswordUpdating(true);
      await apiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your personal information, contact details, and security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Summary Card */}
        <Card className="md:col-span-1 text-center p-6">
          <div className="w-20 h-20 rounded-2xl bg-indigo-100 text-indigo-700 font-extrabold text-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <h3 className="font-bold text-slate-900 text-lg">{user?.full_name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
          <div className="mt-3">
            <Badge role={user?.role} />
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 text-left space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" />
              <span>Status: <strong className="text-emerald-600">Active Account</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="truncate">{user?.email}</span>
            </div>
            {user?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{user.phone}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Profile Details & Password Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Info Card */}
          <Card title="Personal Information" subtitle="Update your contact phone and display name">
            {profileSuccess && (
              <Alert type="success" message={profileSuccess} onClose={() => setProfileSuccess(null)} className="mb-4" />
            )}
            {profileError && (
              <Alert type="error" message={profileError} onClose={() => setProfileError(null)} className="mb-4" />
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                leftIcon={<User className="w-4 h-4" />}
              />

              <Input
                label="Registered Email"
                value={user?.email || ''}
                disabled
                helperText="Email is managed by institution administrators."
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                leftIcon={<Phone className="w-4 h-4" />}
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" isLoading={isProfileUpdating}>
                  Save Profile
                </Button>
              </div>
            </form>
          </Card>

          {/* Change Password Card */}
          <Card title="Change Password" subtitle="Ensure your account uses a secure password (minimum 8 characters)">
            {passwordSuccess && (
              <Alert type="success" message={passwordSuccess} onClose={() => setPasswordSuccess(null)} className="mb-4" />
            )}
            {passwordError && (
              <Alert type="error" message={passwordError} onClose={() => setPasswordError(null)} className="mb-4" />
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  leftIcon={<Lock className="w-4 h-4" />}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  leftIcon={<Lock className="w-4 h-4" />}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" isLoading={isPasswordUpdating}>
                  Update Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
