import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestSpecCard } from '../test-spec-card';
import type { TestSpec } from '@/types/test-spec';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('TestSpecCard', () => {
  const mockTestSpec: TestSpec = {
    id: '1',
    projectId: '10',
    name: 'Test Specification',
    description: 'Test description',
    status: 'DRAFT',
    version: '1.0.0',
    isLocked: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    _count: {
      versions: 3,
    },
  };

  it('should render test spec name', () => {
    render(
      <TestSpecCard testSpec={mockTestSpec} projectId="10" onDelete={vi.fn()} isDeleting={false} />
    );

    expect(screen.getByText('Test Specification')).toBeDefined();
  });

  it('should render test spec description', () => {
    render(
      <TestSpecCard testSpec={mockTestSpec} projectId="10" onDelete={vi.fn()} isDeleting={false} />
    );

    expect(screen.getByText('Test description')).toBeDefined();
  });

  it('should render default message when no description', () => {
    const testSpecWithoutDescription = {
      ...mockTestSpec,
      description: null,
    };

    render(
      <TestSpecCard
        testSpec={testSpecWithoutDescription}
        projectId="10"
        onDelete={vi.fn()}
        isDeleting={false}
      />
    );

    expect(screen.getByText('テスト仕様書の説明がありません')).toBeDefined();
  });

  it('should render status badge', () => {
    render(
      <TestSpecCard testSpec={mockTestSpec} projectId="10" onDelete={vi.fn()} isDeleting={false} />
    );

    expect(screen.getByText('下書き')).toBeDefined();
  });

  it('should render version', () => {
    render(
      <TestSpecCard testSpec={mockTestSpec} projectId="10" onDelete={vi.fn()} isDeleting={false} />
    );

    expect(screen.getByText('v1.0.0')).toBeDefined();
  });

  it('should render version count when available', () => {
    render(
      <TestSpecCard testSpec={mockTestSpec} projectId="10" onDelete={vi.fn()} isDeleting={false} />
    );

    expect(screen.getByText('3件のバージョン')).toBeDefined();
  });

  it('should render lock indicator when locked', () => {
    const lockedTestSpec = {
      ...mockTestSpec,
      isLocked: true,
    };

    render(
      <TestSpecCard
        testSpec={lockedTestSpec}
        projectId="10"
        onDelete={vi.fn()}
        isDeleting={false}
      />
    );

    expect(screen.getByText('ロック中')).toBeDefined();
  });

  it('should not render lock indicator when not locked', () => {
    render(
      <TestSpecCard testSpec={mockTestSpec} projectId="10" onDelete={vi.fn()} isDeleting={false} />
    );

    expect(screen.queryByText('ロック中')).toBeNull();
  });

  it('should render link to test spec detail page', () => {
    render(
      <TestSpecCard testSpec={mockTestSpec} projectId="10" onDelete={vi.fn()} isDeleting={false} />
    );

    const links = screen.getAllByRole('link');
    const detailLink = links.find((link) =>
      link.getAttribute('href')?.includes('/projects/10/test-specs/1')
    );
    expect(detailLink).toBeDefined();
  });

  it('should render edit link with correct href', () => {
    render(
      <TestSpecCard testSpec={mockTestSpec} projectId="10" onDelete={vi.fn()} isDeleting={false} />
    );

    const links = screen.getAllByRole('link');
    const editLink = links.find(
      (link) => link.getAttribute('href') === '/projects/10/test-specs/1/edit'
    );
    expect(editLink).toBeDefined();
  });

  it('should call onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();

    render(
      <TestSpecCard testSpec={mockTestSpec} projectId="10" onDelete={onDelete} isDeleting={false} />
    );

    const deleteButton = screen.getByRole('button', { name: /削除/ });
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('should disable delete button when isDeleting is true', () => {
    render(
      <TestSpecCard testSpec={mockTestSpec} projectId="10" onDelete={vi.fn()} isDeleting={true} />
    );

    const deleteButton = screen.getByRole('button', { name: /削除/ });
    expect(deleteButton.hasAttribute('disabled')).toBe(true);
  });

  it('should disable delete button when test spec is locked', () => {
    const lockedTestSpec = {
      ...mockTestSpec,
      isLocked: true,
    };

    render(
      <TestSpecCard
        testSpec={lockedTestSpec}
        projectId="10"
        onDelete={vi.fn()}
        isDeleting={false}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /削除/ });
    expect(deleteButton.hasAttribute('disabled')).toBe(true);
  });

  it('should render different status badges for different statuses', () => {
    const statuses = ['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED'] as const;
    const labels = ['下書き', 'レビュー中', '承認済み', 'アーカイブ'];

    statuses.forEach((status, index) => {
      const { unmount } = render(
        <TestSpecCard
          testSpec={{ ...mockTestSpec, status }}
          projectId="10"
          onDelete={vi.fn()}
          isDeleting={false}
        />
      );

      expect(screen.getByText(labels[index])).toBeDefined();
      unmount();
    });
  });

  it('should format date in Japanese locale', () => {
    render(
      <TestSpecCard testSpec={mockTestSpec} projectId="10" onDelete={vi.fn()} isDeleting={false} />
    );

    expect(screen.getByText('2024/01/01')).toBeDefined();
  });
});
