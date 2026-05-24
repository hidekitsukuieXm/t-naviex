import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestSpecStatusBadge } from '../test-spec-status-badge';
import type { TestSpecStatus } from '@/types/test-spec';

describe('TestSpecStatusBadge', () => {
  it('should render DRAFT status badge', () => {
    render(<TestSpecStatusBadge status="DRAFT" />);
    expect(screen.getByText('下書き')).toBeDefined();
  });

  it('should render REVIEW status badge', () => {
    render(<TestSpecStatusBadge status="REVIEW" />);
    expect(screen.getByText('レビュー中')).toBeDefined();
  });

  it('should render APPROVED status badge', () => {
    render(<TestSpecStatusBadge status="APPROVED" />);
    expect(screen.getByText('承認済み')).toBeDefined();
  });

  it('should render ARCHIVED status badge', () => {
    render(<TestSpecStatusBadge status="ARCHIVED" />);
    expect(screen.getByText('アーカイブ')).toBeDefined();
  });

  it('should apply custom className', () => {
    render(<TestSpecStatusBadge status="DRAFT" className="custom-class" />);
    const badge = screen.getByText('下書き');
    expect(badge.className).toContain('custom-class');
  });

  it('should have correct styling for each status', () => {
    const statuses: TestSpecStatus[] = ['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED'];
    const labels = ['下書き', 'レビュー中', '承認済み', 'アーカイブ'];

    statuses.forEach((status, index) => {
      const { unmount } = render(<TestSpecStatusBadge status={status} />);
      expect(screen.getByText(labels[index])).toBeDefined();
      unmount();
    });
  });

  it('should render with inline-flex class for proper alignment', () => {
    render(<TestSpecStatusBadge status="DRAFT" />);
    const badge = screen.getByText('下書き');
    expect(badge.className).toContain('inline-flex');
  });

  it('should render with rounded-full class for pill shape', () => {
    render(<TestSpecStatusBadge status="DRAFT" />);
    const badge = screen.getByText('下書き');
    expect(badge.className).toContain('rounded-full');
  });
});
