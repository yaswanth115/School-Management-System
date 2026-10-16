import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LoginPage } from '../pages/auth/LoginPage';

describe('LoginPage', () => {
  it('renders login form and demo role buttons', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('BrightEdu Academy')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

    // Verify demo buttons exist
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Principal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Teacher' })).toBeInTheDocument();
  });
});
