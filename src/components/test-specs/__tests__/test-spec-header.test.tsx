import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestSpecHeader } from '../test-spec-header';
import type { TestSpec } from '@/types/test-spec';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockTestSpec: TestSpec = {
  id: 'spec-1',
  projectId: 'project-1',
  name: 'テスト仕様書1',
  description: 'テスト仕様書の説明',
  status: 'DRAFT',
  version: '1.0.0',
  isLocked: false,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-20T15:30:00.000Z',
};

describe('TestSpecHeader', () => {
  it('should render test spec name', () => {
    render(<TestSpecHeader testSpec={mockTestSpec} projectId="project-1" />);
    expect(screen.getByText('テスト仕様書1')).toBeDefined();
  });

  it('should render test spec description', () => {
    render(<TestSpecHeader testSpec={mockTestSpec} projectId="project-1" />);
    expect(screen.getByText('テスト仕様書の説明')).toBeDefined();
  });

  it('should render version', () => {
    render(<TestSpecHeader testSpec={mockTestSpec} projectId="project-1" />);
    expect(screen.getByText(/v1\.0\.0/)).toBeDefined();
  });

  it('should render status badge', () => {
    render(<TestSpecHeader testSpec={mockTestSpec} projectId="project-1" />);
    expect(screen.getByText('下書き')).toBeDefined();
  });

  it('should render back link to test specs list', () => {
    render(<TestSpecHeader testSpec={mockTestSpec} projectId="project-1" />);
    const backLink = screen.getByText('テスト仕様書一覧に戻る');
    const anchor = backLink.closest('a');
    expect(anchor?.getAttribute('href')).toBe('/projects/project-1/test-specs');
  });

  it('should render edit link', () => {
    render(<TestSpecHeader testSpec={mockTestSpec} projectId="project-1" />);
    const editLink = screen.getByText('編集');
    const anchor = editLink.closest('a');
    expect(anchor?.getAttribute('href')).toBe('/projects/project-1/test-specs/spec-1/edit');
  });

  it('should render lock indicator when isLocked is true', () => {
    const lockedSpec = { ...mockTestSpec, isLocked: true };
    render(<TestSpecHeader testSpec={lockedSpec} projectId="project-1" />);
    expect(screen.getByText('ロック中')).toBeDefined();
  });

  it('should not render lock indicator when isLocked is false', () => {
    render(<TestSpecHeader testSpec={mockTestSpec} projectId="project-1" />);
    expect(screen.queryByText('ロック中')).toBeNull();
  });

  it('should render created date', () => {
    render(<TestSpecHeader testSpec={mockTestSpec} projectId="project-1" />);
    expect(screen.getByText(/作成日:/)).toBeDefined();
  });

  it('should render updated date', () => {
    render(<TestSpecHeader testSpec={mockTestSpec} projectId="project-1" />);
    expect(screen.getByText(/更新日:/)).toBeDefined();
  });

  it('should use custom backHref when provided', () => {
    render(
      <TestSpecHeader testSpec={mockTestSpec} projectId="project-1" backHref="/custom-back" />
    );
    const backLink = screen.getByText('テスト仕様書一覧に戻る');
    const anchor = backLink.closest('a');
    expect(anchor?.getAttribute('href')).toBe('/custom-back');
  });

  it('should handle missing description', () => {
    const specWithoutDescription = { ...mockTestSpec, description: null };
    render(<TestSpecHeader testSpec={specWithoutDescription} projectId="project-1" />);
    expect(screen.getByText('テスト仕様書1')).toBeDefined();
  });

  it('should render all status types correctly', () => {
    const statuses: Array<{ status: TestSpec['status']; label: string }> = [
      { status: 'DRAFT', label: '下書き' },
      { status: 'REVIEW', label: 'レビュー中' },
      { status: 'APPROVED', label: '承認済み' },
      { status: 'ARCHIVED', label: 'アーカイブ' },
    ];

    statuses.forEach(({ status, label }) => {
      const spec = { ...mockTestSpec, status };
      const { unmount } = render(<TestSpecHeader testSpec={spec} projectId="project-1" />);
      expect(screen.getByText(label)).toBeDefined();
      unmount();
    });
  });
});
