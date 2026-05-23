import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserStatusSelect } from '../user-status-select';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock alert
const mockAlert = vi.fn();
global.alert = mockAlert;

describe('UserStatusSelect', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with current status', () => {
    render(<UserStatusSelect userId="1" currentStatus="ACTIVE" onSuccess={mockOnSuccess} />);

    expect(screen.getByRole('combobox')).toBeTruthy();
  });

  it('should render select component', () => {
    render(<UserStatusSelect userId="1" currentStatus="INACTIVE" onSuccess={mockOnSuccess} />);

    // Verify the select is rendered
    const select = screen.getByRole('combobox');
    expect(select).toBeTruthy();
  });

  it('should render with different initial statuses', () => {
    const { rerender } = render(
      <UserStatusSelect userId="1" currentStatus="ACTIVE" onSuccess={mockOnSuccess} />
    );
    expect(screen.getByRole('combobox')).toBeTruthy();

    rerender(<UserStatusSelect userId="1" currentStatus="SUSPENDED" onSuccess={mockOnSuccess} />);
    expect(screen.getByRole('combobox')).toBeTruthy();

    rerender(<UserStatusSelect userId="1" currentStatus="PENDING" onSuccess={mockOnSuccess} />);
    expect(screen.getByRole('combobox')).toBeTruthy();
  });
});
