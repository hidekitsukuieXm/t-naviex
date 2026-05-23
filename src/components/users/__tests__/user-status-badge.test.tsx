import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserStatusBadge } from '../user-status-badge';

describe('UserStatusBadge', () => {
  it('should render ACTIVE status with correct label', () => {
    render(<UserStatusBadge status="ACTIVE" />);
    expect(screen.getByText('有効')).toBeTruthy();
  });

  it('should render INACTIVE status with correct label', () => {
    render(<UserStatusBadge status="INACTIVE" />);
    expect(screen.getByText('無効')).toBeTruthy();
  });

  it('should render SUSPENDED status with correct label', () => {
    render(<UserStatusBadge status="SUSPENDED" />);
    expect(screen.getByText('停止中')).toBeTruthy();
  });

  it('should render PENDING status with correct label', () => {
    render(<UserStatusBadge status="PENDING" />);
    expect(screen.getByText('保留中')).toBeTruthy();
  });

  it('should apply correct styling for ACTIVE status', () => {
    render(<UserStatusBadge status="ACTIVE" />);
    const badge = screen.getByText('有効');
    expect(badge.className).toContain('bg-green');
  });

  it('should apply correct styling for INACTIVE status', () => {
    render(<UserStatusBadge status="INACTIVE" />);
    const badge = screen.getByText('無効');
    expect(badge.className).toContain('bg-gray');
  });

  it('should apply correct styling for SUSPENDED status', () => {
    render(<UserStatusBadge status="SUSPENDED" />);
    const badge = screen.getByText('停止中');
    expect(badge.className).toContain('bg-red');
  });

  it('should apply correct styling for PENDING status', () => {
    render(<UserStatusBadge status="PENDING" />);
    const badge = screen.getByText('保留中');
    expect(badge.className).toContain('bg-yellow');
  });
});
