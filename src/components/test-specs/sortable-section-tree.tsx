'use client';

import React, { useCallback, useMemo } from 'react';
import {
  SortableTree,
  SimpleTreeItemWrapper,
  type TreeItemComponentProps,
  type TreeItems,
} from 'dnd-kit-sortable-tree';
import { type TestSectionWithChildren } from '@/types/test-section';
import { Folder, FolderOpen, FileText, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TreeViewToolbar,
  TreeViewLabel,
  TreeViewActions,
  TreeViewAction,
} from '@/components/ui/tree-view';

// ============================================
// Types
// ============================================

interface SectionTreeItemData {
  name: string;
  testSpecId: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type SectionTreeItem = TreeItems<SectionTreeItemData>[number];

interface SortableSectionTreeProps {
  sections: TestSectionWithChildren[];
  testSpecId: string;
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string | null) => void;
  onSectionsChange?: (sections: TestSectionWithChildren[]) => void;
  onMoveSection?: (
    sectionId: string,
    newParentId: string | null,
    newSortOrder: number
  ) => Promise<void>;
  className?: string;
  disabled?: boolean;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Convert TestSectionWithChildren to TreeItems format for dnd-kit-sortable-tree
 */
function convertToTreeItems(sections: TestSectionWithChildren[]): TreeItems<SectionTreeItemData> {
  return sections.map(
    (section): SectionTreeItem => ({
      id: section.id,
      children: convertToTreeItems(section.children),
      name: section.name,
      testSpecId: section.testSpecId,
      parentId: section.parentId,
      sortOrder: section.sortOrder,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
    })
  );
}

/**
 * Convert TreeItems back to TestSectionWithChildren format
 */
function convertToSections(
  items: TreeItems<SectionTreeItemData>,
  parentId: string | null = null
): TestSectionWithChildren[] {
  return items.map((item, index) => ({
    id: item.id,
    testSpecId: item.testSpecId,
    parentId: parentId,
    name: item.name,
    sortOrder: index,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    children: convertToSections(item.children ?? [], item.id),
  }));
}

/**
 * Find changes between old and new tree structures
 */
function findChanges(
  oldSections: TestSectionWithChildren[],
  newSections: TestSectionWithChildren[]
): {
  movedSections: Array<{
    id: string;
    newParentId: string | null;
    newSortOrder: number;
  }>;
} {
  const oldMap = new Map<string, { parentId: string | null; sortOrder: number }>();

  // Build map of old positions
  const traverseOld = (sections: TestSectionWithChildren[], parentId: string | null = null) => {
    sections.forEach((section, index) => {
      oldMap.set(section.id, { parentId, sortOrder: index });
      if (section.children.length > 0) {
        traverseOld(section.children, section.id);
      }
    });
  };
  traverseOld(oldSections);

  // Find changed sections
  const movedSections: Array<{
    id: string;
    newParentId: string | null;
    newSortOrder: number;
  }> = [];

  const traverseNew = (sections: TestSectionWithChildren[], parentId: string | null = null) => {
    sections.forEach((section, index) => {
      const old = oldMap.get(section.id);
      if (old) {
        if (old.parentId !== parentId || old.sortOrder !== index) {
          movedSections.push({
            id: section.id,
            newParentId: parentId,
            newSortOrder: index,
          });
        }
      }
      if (section.children.length > 0) {
        traverseNew(section.children, section.id);
      }
    });
  };
  traverseNew(newSections);

  return { movedSections };
}

// ============================================
// TreeItemComponent
// ============================================

const SectionTreeItemComponent = React.forwardRef<
  HTMLDivElement,
  TreeItemComponentProps<SectionTreeItemData> & {
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    disabled?: boolean;
  }
>((props, ref) => {
  const { item, selectedId, onSelect, disabled, ...rest } = props;
  const hasChildren = (item.children?.length ?? 0) > 0;
  const isSelected = selectedId === item.id;
  const isCollapsed = rest.collapsed;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't select when clicking the drag handle
      if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
        return;
      }
      onSelect(item.id);
    },
    [item.id, onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(item.id);
      }
    },
    [item.id, onSelect]
  );

  return (
    <SimpleTreeItemWrapper {...props} ref={ref}>
      <div
        role="treeitem"
        aria-selected={isSelected}
        tabIndex={0}
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors w-full',
          'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isSelected && 'bg-primary/10 text-primary hover:bg-primary/15',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {!disabled && (
          <span
            data-drag-handle
            className="cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="size-4" />
          </span>
        )}

        {hasChildren ? (
          isCollapsed ? (
            <Folder className="size-4 shrink-0 text-amber-500" />
          ) : (
            <FolderOpen className="size-4 shrink-0 text-amber-500" />
          )
        ) : (
          <FileText className="size-4 shrink-0 text-muted-foreground" />
        )}

        <span className="truncate">{item.name}</span>
      </div>
    </SimpleTreeItemWrapper>
  );
});
SectionTreeItemComponent.displayName = 'SectionTreeItemComponent';

// ============================================
// Main Component
// ============================================

export function SortableSectionTree({
  sections,
  selectedSectionId,
  onSelectSection,
  onSectionsChange,
  onMoveSection,
  className,
  disabled = false,
}: SortableSectionTreeProps) {
  // Convert sections to tree items - use useMemo for derived state
  const treeItems = useMemo(() => convertToTreeItems(sections), [sections]);

  // Handle items change from drag and drop
  const handleItemsChange = useCallback(
    async (newItems: TreeItems<SectionTreeItemData>) => {
      const newSections = convertToSections(newItems);
      const changes = findChanges(sections, newSections);

      // Notify parent of changes (parent will update sections prop)
      onSectionsChange?.(newSections);

      // Call API for each moved section
      if (onMoveSection && changes.movedSections.length > 0) {
        try {
          for (const moved of changes.movedSections) {
            await onMoveSection(moved.id, moved.newParentId, moved.newSortOrder);
          }
        } catch (error) {
          // Parent will refetch on error through onMoveSection throwing
          console.error('Failed to move section:', error);
          throw error;
        }
      }
    },
    [sections, onSectionsChange, onMoveSection]
  );

  // Handle selection
  const handleSelect = useCallback(
    (id: string | null) => {
      if (id === '__all__') {
        onSelectSection(null);
      } else {
        onSelectSection(id);
      }
    },
    [onSelectSection]
  );

  // Memoize TreeItemComponent with selection props
  const TreeItemComponent = useMemo(() => {
    const Component = React.forwardRef<HTMLDivElement, TreeItemComponentProps<SectionTreeItemData>>(
      (props, ref) => (
        <SectionTreeItemComponent
          {...props}
          ref={ref}
          selectedId={selectedSectionId}
          onSelect={handleSelect}
          disabled={disabled}
        />
      )
    );
    Component.displayName = 'SortableTreeItemComponent';
    return Component;
  }, [selectedSectionId, handleSelect, disabled]);

  if (sections.length === 0) {
    return (
      <div className={cn('text-center text-sm text-muted-foreground py-8', className)}>
        セクションがありません。
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <TreeViewToolbar>
        <TreeViewLabel>セクション</TreeViewLabel>
        <TreeViewActions>
          <TreeViewAction
            onClick={() => onSelectSection(null)}
            className={cn(selectedSectionId === null && 'bg-primary/10 text-primary')}
          >
            全て表示
          </TreeViewAction>
        </TreeViewActions>
      </TreeViewToolbar>

      <div role="tree" aria-label="テストセクション" className="flex-1 overflow-auto">
        {/* "All test cases" option */}
        <div
          role="treeitem"
          aria-selected={selectedSectionId === null}
          tabIndex={0}
          className={cn(
            'flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors mb-1',
            'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            selectedSectionId === null && 'bg-primary/10 text-primary hover:bg-primary/15'
          )}
          onClick={() => onSelectSection(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectSection(null);
            }
          }}
        >
          {disabled ? <span className="size-4 shrink-0" /> : <span className="size-4 shrink-0" />}
          <Folder className="size-4 shrink-0 text-blue-500" />
          <span className="truncate font-medium">全てのテストケース</span>
        </div>

        {/* Sortable tree */}
        <SortableTree
          items={treeItems}
          onItemsChanged={handleItemsChange}
          TreeItemComponent={TreeItemComponent}
          disableSorting={disabled}
        />
      </div>
    </div>
  );
}
