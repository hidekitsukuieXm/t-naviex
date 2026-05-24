import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from '../project-card';
import type { Project } from '@/types/project';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ProjectCard', () => {
  const mockProject: Project = {
    id: '1',
    name: 'Test Project',
    description: 'Test description',
    status: 'ACTIVE',
    projectType: 'web',
    targetVersion: '1.0.0',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    _count: {
      projectMembers: 5,
    },
  };

  it('should render project name', () => {
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} isDeleting={false} />);

    expect(screen.getByText('Test Project')).toBeDefined();
  });

  it('should render project description', () => {
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} isDeleting={false} />);

    expect(screen.getByText('Test description')).toBeDefined();
  });

  it('should render default message when no description', () => {
    const projectWithoutDescription = {
      ...mockProject,
      description: null,
    };

    render(
      <ProjectCard project={projectWithoutDescription} onDelete={vi.fn()} isDeleting={false} />
    );

    expect(screen.getByText('プロジェクトの説明がありません')).toBeDefined();
  });

  it('should render project status badge', () => {
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} isDeleting={false} />);

    expect(screen.getByText('進行中')).toBeDefined();
  });

  it('should render project type', () => {
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} isDeleting={false} />);

    expect(screen.getByText('web')).toBeDefined();
  });

  it('should render member count', () => {
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} isDeleting={false} />);

    expect(screen.getByText('5人')).toBeDefined();
  });

  it('should render edit link with correct href', () => {
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} isDeleting={false} />);

    const editLink = screen.getByRole('link');
    expect(editLink.getAttribute('href')).toBe('/projects/1/edit');
  });

  it('should call onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();

    render(<ProjectCard project={mockProject} onDelete={onDelete} isDeleting={false} />);

    const deleteButton = screen.getByRole('button', { name: /削除/ });
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('should disable delete button when isDeleting is true', () => {
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} isDeleting={true} />);

    const deleteButton = screen.getByRole('button', { name: /削除/ });
    expect(deleteButton.hasAttribute('disabled')).toBe(true);
  });

  it('should render different status colors', () => {
    const statuses = ['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PLANNING'] as const;
    const labels = ['進行中', '休止中', 'アーカイブ', '計画中'];

    statuses.forEach((status, index) => {
      const { unmount } = render(
        <ProjectCard project={{ ...mockProject, status }} onDelete={vi.fn()} isDeleting={false} />
      );

      expect(screen.getByText(labels[index])).toBeDefined();
      unmount();
    });
  });

  it('should format date in Japanese locale', () => {
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} isDeleting={false} />);

    expect(screen.getByText('2024/01/01')).toBeDefined();
  });
});
