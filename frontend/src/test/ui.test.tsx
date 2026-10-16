import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

describe('UI Component Library', () => {
  it('renders primary button correctly', () => {
    render(<Button variant="primary">Submit Test</Button>);
    const button = screen.getByRole('button', { name: /submit test/i });
    expect(button).toBeInTheDocument();
  });

  it('renders button loading state', () => {
    render(<Button isLoading>Submit Test</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('renders role badge with proper role label', () => {
    render(<Badge role="ADMIN" />);
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('renders active status badge', () => {
    render(<Badge isActive={true} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders alert message', () => {
    render(<Alert type="error" message="Invalid credentials entered" />);
    expect(screen.getByText('Invalid credentials entered')).toBeInTheDocument();
  });
});
