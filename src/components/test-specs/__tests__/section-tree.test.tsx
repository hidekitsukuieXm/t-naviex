import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionTree } from '../section-tree';
import type { TestSectionWithChildren } from '@/types/test-section';

const mockSections: TestSectionWithChildren[] = [
  {
    id: 'section-1',
    testSpecId: 'spec-1',
    parentId: null,
    name: 'セクション1',
    sortOrder: 0,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    children: [
      {
        id: 'section-1-1',
        testSpecId: 'spec-1',
        parentId: 'section-1',
        name: 'サブセクション1-1',
        sortOrder: 0,
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z',
        children: [],
      },
      {
        id: 'section-1-2',
        testSpecId: 'spec-1',
        parentId: 'section-1',
        name: 'サブセクション1-2',
        sortOrder: 1,
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z',
        children: [],
      },
    ],
  },
  {
    id: 'section-2',
    testSpecId: 'spec-1',
    parentId: null,
    name: 'セクション2',
    sortOrder: 1,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    children: [],
  },
];

describe('SectionTree', () => {
  it('should render empty state when no sections', () => {
    render(<SectionTree sections={[]} selectedSectionId={null} onSelectSection={vi.fn()} />);
    expect(screen.getByText('セクションがありません。')).toBeDefined();
  });

  it('should render all root sections', () => {
    render(
      <SectionTree sections={mockSections} selectedSectionId={null} onSelectSection={vi.fn()} />
    );
    expect(screen.getByText('セクション1')).toBeDefined();
    expect(screen.getByText('セクション2')).toBeDefined();
  });

  it('should render "全てのテストケース" option', () => {
    render(
      <SectionTree sections={mockSections} selectedSectionId={null} onSelectSection={vi.fn()} />
    );
    expect(screen.getByText('全てのテストケース')).toBeDefined();
  });

  it('should call onSelectSection when clicking a section', () => {
    const onSelectSection = vi.fn();
    render(
      <SectionTree
        sections={mockSections}
        selectedSectionId={null}
        onSelectSection={onSelectSection}
      />
    );

    fireEvent.click(screen.getByText('セクション1'));
    expect(onSelectSection).toHaveBeenCalledWith('section-1');
  });

  it('should call onSelectSection with null when clicking "全てのテストケース"', () => {
    const onSelectSection = vi.fn();
    render(
      <SectionTree
        sections={mockSections}
        selectedSectionId="section-1"
        onSelectSection={onSelectSection}
      />
    );

    fireEvent.click(screen.getByText('全てのテストケース'));
    expect(onSelectSection).toHaveBeenCalledWith(null);
  });

  it('should show child sections when parent is expanded', () => {
    render(
      <SectionTree sections={mockSections} selectedSectionId={null} onSelectSection={vi.fn()} />
    );

    // Root sections are expanded by default
    expect(screen.getByText('サブセクション1-1')).toBeDefined();
    expect(screen.getByText('サブセクション1-2')).toBeDefined();
  });

  it('should toggle section expansion when clicking toggle button', () => {
    render(
      <SectionTree sections={mockSections} selectedSectionId={null} onSelectSection={vi.fn()} />
    );

    // Find toggle button (first one which belongs to section-1)
    // TreeView uses '折りたたむ' for expanded items
    const toggleButton = screen.getByRole('button', { name: '折りたたむ' });
    fireEvent.click(toggleButton);

    // Child sections should be hidden
    expect(screen.queryByText('サブセクション1-1')).toBeNull();
  });

  it('should highlight selected section', () => {
    render(
      <SectionTree
        sections={mockSections}
        selectedSectionId="section-1"
        onSelectSection={vi.fn()}
      />
    );

    const section = screen.getByText('セクション1').closest('[role="treeitem"]');
    expect(section?.getAttribute('aria-selected')).toBe('true');
  });

  it('should render expand all button', () => {
    render(
      <SectionTree sections={mockSections} selectedSectionId={null} onSelectSection={vi.fn()} />
    );

    expect(screen.getByText('全て展開')).toBeDefined();
  });

  it('should render collapse all button', () => {
    render(
      <SectionTree sections={mockSections} selectedSectionId={null} onSelectSection={vi.fn()} />
    );

    expect(screen.getByText('全て閉じる')).toBeDefined();
  });

  it('should collapse all sections when clicking "全て閉じる"', () => {
    render(
      <SectionTree sections={mockSections} selectedSectionId={null} onSelectSection={vi.fn()} />
    );

    fireEvent.click(screen.getByText('全て閉じる'));

    // Child sections should be hidden
    expect(screen.queryByText('サブセクション1-1')).toBeNull();
  });

  it('should expand all sections when clicking "全て展開"', () => {
    render(
      <SectionTree sections={mockSections} selectedSectionId={null} onSelectSection={vi.fn()} />
    );

    // First collapse all
    fireEvent.click(screen.getByText('全て閉じる'));
    expect(screen.queryByText('サブセクション1-1')).toBeNull();

    // Then expand all
    fireEvent.click(screen.getByText('全て展開'));
    expect(screen.getByText('サブセクション1-1')).toBeDefined();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <SectionTree
        sections={mockSections}
        selectedSectionId={null}
        onSelectSection={vi.fn()}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveProperty('className');
    expect((container.firstChild as Element).className).toContain('custom-class');
  });

  it('should handle keyboard navigation with Enter key', () => {
    const onSelectSection = vi.fn();
    render(
      <SectionTree
        sections={mockSections}
        selectedSectionId={null}
        onSelectSection={onSelectSection}
      />
    );

    const section = screen.getByText('セクション1').closest('[role="treeitem"]');
    fireEvent.keyDown(section!, { key: 'Enter' });
    expect(onSelectSection).toHaveBeenCalledWith('section-1');
  });

  it('should handle keyboard navigation with Space key', () => {
    const onSelectSection = vi.fn();
    render(
      <SectionTree
        sections={mockSections}
        selectedSectionId={null}
        onSelectSection={onSelectSection}
      />
    );

    const section = screen.getByText('セクション1').closest('[role="treeitem"]');
    fireEvent.keyDown(section!, { key: ' ' });
    expect(onSelectSection).toHaveBeenCalledWith('section-1');
  });

  it('should set aria-expanded on sections with children', () => {
    render(
      <SectionTree sections={mockSections} selectedSectionId={null} onSelectSection={vi.fn()} />
    );

    const sectionWithChildren = screen.getByText('セクション1').closest('[role="treeitem"]');
    expect(sectionWithChildren?.getAttribute('aria-expanded')).toBe('true');

    const sectionWithoutChildren = screen.getByText('セクション2').closest('[role="treeitem"]');
    expect(sectionWithoutChildren?.getAttribute('aria-expanded')).toBeNull();
  });

  it('should render tree role for accessibility', () => {
    render(
      <SectionTree sections={mockSections} selectedSectionId={null} onSelectSection={vi.fn()} />
    );

    expect(screen.getByRole('tree')).toBeDefined();
  });
});
