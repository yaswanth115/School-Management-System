import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { User, Role } from '../../types';

interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin (System Administrator)' },
  { value: 'PRINCIPAL', label: 'Principal (Academic Head)' },
  { value: 'ACCOUNTANT', label: 'Accountant (Financial Manager)' },
  { value: 'TEACHER', label: 'Teacher (Faculty Member)' },
  { value: 'PARENT', label: 'Parent / Guardian' },
  { value: 'STUDENT', label: 'Student' },
];

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('TEACHER');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setFullName(user.full_name);
      setPhone(user.phone || '');
      setRole(user.role);
      setIsActive(user.is_active);
      setPassword('');
      setError(null);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const payload: any = {
      email,
      full_name: fullName,
      phone: phone || null,
      role,
      is_active: isActive,
    };
    if (password.trim()) {
      if (password.length < 8) {
        setError('New password must be at least 8 characters long');
        return;
      }
      payload.password = password;
    }

    try {
      setIsLoading(true);
      await apiClient.put(`/users/${user.id}`, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit User Account"
      description={`Update account details for ${user?.full_name}`}
      maxWidth="lg"
    >
      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9876543210"
          />

          <Select
            label="Role & Access Scope"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            options={ROLE_OPTIONS}
          />
        </div>

        <Input
          label="Reset Password (Optional)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave blank to keep current password"
          helperText="Only fill if you want to override this user's password."
        />

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="edit_is_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
          />
          <label htmlFor="edit_is_active" className="text-sm font-medium text-slate-700 cursor-pointer">
            Account Active
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
