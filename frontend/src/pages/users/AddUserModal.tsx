import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Role } from '../../types';

interface AddUserModalProps {
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

export const AddUserModal: React.FC<AddUserModalProps> = ({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setIsLoading(true);
      await apiClient.post('/users', {
        email,
        full_name: fullName,
        phone: phone || null,
        role,
        password,
        is_active: isActive,
      });

      // Reset form
      setEmail('');
      setFullName('');
      setPhone('');
      setPassword('');
      setIsActive(true);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user. Please check the form.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New User Account"
      description="Add a staff, administrator, parent, or student account to the system."
      maxWidth="lg"
    >
      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Jane Doe"
          required
        />

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. jane.doe@school.com"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Phone Number (Optional)"
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
          label="Initial Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          required
          helperText="User can change their password after first login."
        />

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="is_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-slate-700 cursor-pointer">
            Account Active (User can log in immediately)
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Create User
          </Button>
        </div>
      </form>
    </Modal>
  );
};
