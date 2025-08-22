import React from 'react';
import { render, screen } from '../../utils';
import '@testing-library/jest-dom';
import Header from '@/components/Header';

describe('Header Component', () => {
  it('renders with default props', () => {
    render(<Header />);

    expect(screen.getByText('SnapContext')).toBeInTheDocument();
    expect(screen.getByText('Ready to capture')).toBeInTheDocument();

    const statusDot = screen.getByRole('presentation');
    expect(statusDot).toHaveClass('status-dot', 'online', 'active');
  });

  it('renders with custom status and text', () => {
    render(<Header status='error' statusText='Connection error' />);

    expect(screen.getByText('Connection error')).toBeInTheDocument();

    const statusDot = screen.getByRole('presentation');
    expect(statusDot).toHaveClass('status-dot', 'error');
    expect(statusDot).not.toHaveClass('active');
  });

  it('renders with offline status', () => {
    render(<Header status='offline' statusText='Offline' />);

    expect(screen.getByText('Offline')).toBeInTheDocument();

    const statusDot = screen.getByRole('presentation');
    expect(statusDot).toHaveClass('status-dot', 'offline');
    expect(statusDot).not.toHaveClass('active');
  });
});
