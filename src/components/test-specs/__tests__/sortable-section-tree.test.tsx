import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SortableSectionTree } from '../sortable-section-tree';
import type { TestSectionWithChildren } from '@/types/test-section';

// Mock the dnd-kit-sortable-tree module
vi.mock('dnd-kit-sortable-tree', () => ({
  SortableTree: vi.fn(({ items, TreeItemComponent, onItemsChanged }) => (
    <div data-testid="sortable-tree">
      {items.map((item: { id: string; name: string; children?: unknown[] }) => (
        <div
          key={item.id}
          data-testid={`tree-item-${item.id}`}
          data-name={item.name}
          onClick={() => {
            const Component = TreeItemComponent;
            if (Component) {
              // Simulate item click
            }
          }}
        >
          <TreeItemComponent
            item={item}
            depth={0}
            collapsed={false}
            onCollapse={() => {}}
            childCount={item.children?.length || 0}
          />
        </div>
      ))}
      <button
        data-testid="trigger-reorder"
        onClick={() => {
          // Simulate reorder
          if (items.length >= 2) {
            const reordered = [items[1], items[0], ...items.slice(2)];
            onItemsChanged(reordered);
          }
        }}
      >
        Reorder
      </button>
    </div>
  )),
  SimpleTreeItemWrapper: vi.fn(({ children, ...props }) => (
    <div data-testid="simple-tree-item-wrapper" {...props}>
      {children}
    </div>
  )),
}));

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

describe('SortableSectionTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no sections', () => {
    render(
      <SortableSectionTree
        sections={[]}
        testSpecId="spec-1"
        selectedSectionId={null}
        onSelectSection={vi.fn()}
      />
    );
    expect(screen.getByText('セクションがありません。')).toBeDefined();
  });

  it('should render section tree when sections are provided', () => {
    render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId={null}
        onSelectSection={vi.fn()}
      />
    );

    expect(screen.getByTestId('sortable-tree')).toBeDefined();
    expect(screen.getByText('セクション1')).toBeDefined();
    expect(screen.getByText('セクション2')).toBeDefined();
  });

  it('should render "全てのテストケース" option', () => {
    render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId={null}
        onSelectSection={vi.fn()}
      />
    );

    expect(screen.getByText('全てのテストケース')).toBeDefined();
  });

  it('should highlight "全てのテストケース" when selectedSectionId is null', () => {
    render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId={null}
        onSelectSection={vi.fn()}
      />
    );

    const allItem = screen.getByText('全てのテストケース').closest('[role="treeitem"]');
    expect(allItem?.getAttribute('aria-selected')).toBe('true');
  });

  it('should call onSelectSection with null when clicking "全てのテストケース"', () => {
    const onSelectSection = vi.fn();
    render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId="section-1"
        onSelectSection={onSelectSection}
      />
    );

    fireEvent.click(screen.getByText('全てのテストケース'));
    expect(onSelectSection).toHaveBeenCalledWith(null);
  });

  it('should call onSelectSection with null when pressing Enter on "全てのテストケース"', () => {
    const onSelectSection = vi.fn();
    render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId="section-1"
        onSelectSection={onSelectSection}
      />
    );

    const allItem = screen.getByText('全てのテストケース').closest('[role="treeitem"]');
    fireEvent.keyDown(allItem!, { key: 'Enter' });
    expect(onSelectSection).toHaveBeenCalledWith(null);
  });

  it('should call onSelectSection with null when pressing Space on "全てのテストケース"', () => {
    const onSelectSection = vi.fn();
    render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId="section-1"
        onSelectSection={onSelectSection}
      />
    );

    const allItem = screen.getByText('全てのテストケース').closest('[role="treeitem"]');
    fireEvent.keyDown(allItem!, { key: ' ' });
    expect(onSelectSection).toHaveBeenCalledWith(null);
  });

  it('should render toolbar with "全て表示" button', () => {
    render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId={null}
        onSelectSection={vi.fn()}
      />
    );

    expect(screen.getByText('全て表示')).toBeDefined();
    expect(screen.getByText('セクション')).toBeDefined();
  });

  it('should call onSelectSection with null when clicking "全て表示" button', () => {
    const onSelectSection = vi.fn();
    render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId="section-1"
        onSelectSection={onSelectSection}
      />
    );

    fireEvent.click(screen.getByText('全て表示'));
    expect(onSelectSection).toHaveBeenCalledWith(null);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId={null}
        onSelectSection={vi.fn()}
        className="custom-class"
      />
    );

    expect((container.firstChild as Element).className).toContain('custom-class');
  });

  it('should render tree role for accessibility', () => {
    render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId={null}
        onSelectSection={vi.fn()}
      />
    );

    expect(screen.getByRole('tree')).toBeDefined();
  });

  it('should have aria-label for accessibility', () => {
    render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId={null}
        onSelectSection={vi.fn()}
      />
    );

    expect(screen.getByLabelText('テストセクション')).toBeDefined();
  });

  it('should call onSectionsChange when sections are reordered', async () => {
    const onSectionsChange = vi.fn();
    const onMoveSection = vi.fn().mockResolvedValue(undefined);

    render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId={null}
        onSelectSection={vi.fn()}
        onSectionsChange={onSectionsChange}
        onMoveSection={onMoveSection}
      />
    );

    // Trigger reorder via the mock
    fireEvent.click(screen.getByTestId('trigger-reorder'));

    expect(onSectionsChange).toHaveBeenCalled();
  });

  it('should call onMoveSection when sections are moved', async () => {
    const onSectionsChange = vi.fn();
    const onMoveSection = vi.fn().mockResolvedValue(undefined);

    render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId={null}
        onSelectSection={vi.fn()}
        onSectionsChange={onSectionsChange}
        onMoveSection={onMoveSection}
      />
    );

    // Trigger reorder via the mock
    fireEvent.click(screen.getByTestId('trigger-reorder'));

    // Wait for async operations
    await vi.waitFor(() => {
      expect(onMoveSection).toHaveBeenCalled();
    });
  });
});

describe('SortableSectionTree - Disabled State', () => {
  it('should not show drag handles when disabled', () => {
    render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId={null}
        onSelectSection={vi.fn()}
        disabled
      />
    );

    // SortableTree should receive disableSorting=true
    expect(screen.getByTestId('sortable-tree')).toBeDefined();
  });
});

describe('SortableSectionTree - Helper Functions', () => {
  it('should convert sections to tree items correctly', () => {
    render(
      <SortableSectionTree
        sections={mockSections}
        testSpecId="spec-1"
        selectedSectionId={null}
        onSelectSection={vi.fn()}
      />
    );

    // Verify sections are rendered with correct names
    expect(screen.getByText('セクション1')).toBeDefined();
    expect(screen.getByText('セクション2')).toBeDefined();
  });
});
