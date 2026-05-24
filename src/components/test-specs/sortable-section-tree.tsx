'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  SortableTree,
  SimpleTreeItemWrapper,
  type TreeItemComponentProps,
  type TreeItems,
} from 'dnd-kit-sortable-tree';
import { type TestSectionWithChildren } from '@/types/test-section';
import { Folder, FolderOpen, FileText, GripVertical, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TreeViewToolbar,
  TreeViewLabel,
  TreeViewActions,
  TreeViewAction,
} from '@/components/ui/tree-view';
import {
  SectionContextMenu,
  RenameDialog,
  type ClipboardData,
} from '@/components/test-specs/section-context-menu';
import { useSectionKeyboardShortcuts } from '@/hooks/use-section-keyboard-shortcuts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

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

export interface SectionOperationHandlers {
  onCopySection?: (section: TestSectionWithChildren) => Promise<TestSectionWithChildren>;
  onDeleteSection?: (sectionId: string) => Promise<void>;
  onRenameSection?: (sectionId: string, newName: string) => Promise<void>;
  onCreateSection?: (parentId: string | null, name: string) => Promise<TestSectionWithChildren>;
}

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
  sectionOperations?: SectionOperationHandlers;
  className?: string;
  disabled?: boolean;
  enableContextMenu?: boolean;
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
    id: String(item.id),
    testSpecId: item.testSpecId,
    parentId: parentId,
    name: item.name,
    sortOrder: index,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    children: convertToSections(item.children ?? [], String(item.id)),
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

/**
 * Find a section by ID in the tree
 */
function findSectionById(
  sections: TestSectionWithChildren[],
  id: string
): TestSectionWithChildren | null {
  for (const section of sections) {
    if (section.id === id) return section;
    const found = findSectionById(section.children, id);
    if (found) return found;
  }
  return null;
}

/**
 * Convert TreeItem back to TestSectionWithChildren
 */
function treeItemToSection(item: SectionTreeItem): TestSectionWithChildren {
  return {
    id: String(item.id),
    name: item.name,
    testSpecId: item.testSpecId,
    parentId: item.parentId,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    children: (item.children ?? []).map(treeItemToSection),
  };
}

const SectionTreeItemComponent = React.forwardRef<
  HTMLDivElement,
  TreeItemComponentProps<SectionTreeItemData> & {
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    disabled?: boolean;
    enableContextMenu?: boolean;
    allSections: TestSectionWithChildren[];
    clipboard: ClipboardData | null;
    onCopy: (section: TestSectionWithChildren) => void;
    onCut: (section: TestSectionWithChildren) => void;
    onPaste: (targetSection: TestSectionWithChildren) => void;
    onDelete: (section: TestSectionWithChildren) => void;
    onRename: (section: TestSectionWithChildren, newName: string) => void;
    onCreate: (parentSection: TestSectionWithChildren | null) => void;
    onMove: (section: TestSectionWithChildren, targetParentId: string | null) => void;
  }
>((props, ref) => {
  const {
    item,
    selectedId,
    onSelect,
    disabled,
    enableContextMenu,
    allSections,
    clipboard,
    onCopy,
    onCut,
    onPaste,
    onDelete,
    onRename,
    onCreate,
    onMove,
    ...rest
  } = props;
  const hasChildren = (item.children?.length ?? 0) > 0;
  const itemId = String(item.id);
  const isSelected = selectedId === itemId;
  const isCollapsed = rest.collapsed;

  const section = treeItemToSection(item);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't select when clicking the drag handle
      if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
        return;
      }
      onSelect(itemId);
    },
    [itemId, onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(itemId);
      }
    },
    [itemId, onSelect]
  );

  const treeItemContent = (
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
  );

  return (
    <SimpleTreeItemWrapper {...rest} item={item} ref={ref}>
      {enableContextMenu && !disabled ? (
        <SectionContextMenu
          section={section}
          allSections={allSections}
          clipboard={clipboard}
          onCopy={onCopy}
          onCut={onCut}
          onPaste={onPaste}
          onDelete={onDelete}
          onRename={onRename}
          onCreate={onCreate}
          onMove={onMove}
        >
          {treeItemContent}
        </SectionContextMenu>
      ) : (
        treeItemContent
      )}
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
  sectionOperations,
  className,
  disabled = false,
  enableContextMenu = true,
}: SortableSectionTreeProps) {
  // Clipboard state for copy/paste operations
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);

  // Convert sections to tree items - use useMemo for derived state
  const treeItems = useMemo(() => convertToTreeItems(sections), [sections]);

  // Get the currently selected section
  const selectedSection = useMemo(
    () => (selectedSectionId ? findSectionById(sections, selectedSectionId) : null),
    [sections, selectedSectionId]
  );

  // Section operation handlers
  const handleCopySection = useCallback((section: TestSectionWithChildren) => {
    setClipboard({
      type: 'section',
      sectionId: section.id,
      sectionName: section.name,
      operation: 'copy',
    });
    toast.success(`「${section.name}」をコピーしました`);
  }, []);

  const handleCutSection = useCallback((section: TestSectionWithChildren) => {
    setClipboard({
      type: 'section',
      sectionId: section.id,
      sectionName: section.name,
      operation: 'cut',
    });
    toast.success(`「${section.name}」を切り取りました`);
  }, []);

  const handlePasteSection = useCallback(
    async (targetSection: TestSectionWithChildren | null) => {
      if (!clipboard || !sectionOperations?.onCopySection) return;

      const sourceSection = findSectionById(sections, clipboard.sectionId);
      if (!sourceSection) {
        toast.error('コピー元のセクションが見つかりません');
        setClipboard(null);
        return;
      }

      try {
        if (clipboard.operation === 'copy') {
          // Copy section and its children to the target parent
          await sectionOperations.onCopySection(sourceSection);
          toast.success(`「${sourceSection.name}」を貼り付けました`);
        } else if (clipboard.operation === 'cut') {
          // Move section to new parent
          const targetParentId = targetSection?.id ?? null;
          if (onMoveSection) {
            await onMoveSection(sourceSection.id, targetParentId, 0);
            toast.success(`「${sourceSection.name}」を移動しました`);
          }
          setClipboard(null);
        }
      } catch {
        toast.error('操作に失敗しました');
      }
    },
    [clipboard, sections, sectionOperations, onMoveSection]
  );

  const handleDeleteSection = useCallback(
    async (section: TestSectionWithChildren) => {
      if (!sectionOperations?.onDeleteSection) return;

      try {
        await sectionOperations.onDeleteSection(section.id);
        toast.success(`「${section.name}」を削除しました`);

        // Clear selection if deleted section was selected
        if (selectedSectionId === section.id) {
          onSelectSection(null);
        }

        // Clear clipboard if deleted section was in clipboard
        if (clipboard?.sectionId === section.id) {
          setClipboard(null);
        }
      } catch {
        toast.error('削除に失敗しました');
      }
    },
    [sectionOperations, selectedSectionId, onSelectSection, clipboard]
  );

  const handleRenameSection = useCallback(
    async (section: TestSectionWithChildren, newName: string) => {
      if (!sectionOperations?.onRenameSection) return;

      try {
        await sectionOperations.onRenameSection(section.id, newName);
        toast.success(`セクション名を「${newName}」に変更しました`);
      } catch {
        toast.error('名前の変更に失敗しました');
      }
    },
    [sectionOperations]
  );

  const handleCreateSection = useCallback(
    async (parentSection: TestSectionWithChildren | null) => {
      if (!sectionOperations?.onCreateSection) return;

      try {
        const parentId = parentSection?.id ?? null;
        const newSection = await sectionOperations.onCreateSection(parentId, '新しいセクション');
        toast.success('新しいセクションを作成しました');
        onSelectSection(newSection.id);
      } catch {
        toast.error('セクションの作成に失敗しました');
      }
    },
    [sectionOperations, onSelectSection]
  );

  const handleMoveToParent = useCallback(
    async (section: TestSectionWithChildren, targetParentId: string | null) => {
      if (!onMoveSection) return;

      try {
        await onMoveSection(section.id, targetParentId, 0);
        toast.success(`「${section.name}」を移動しました`);
      } catch {
        toast.error('移動に失敗しました');
      }
    },
    [onMoveSection]
  );

  // Keyboard shortcuts
  useSectionKeyboardShortcuts({
    selectedSection,
    clipboard,
    onCopy: handleCopySection,
    onCut: handleCutSection,
    onPaste: handlePasteSection,
    onDelete: handleDeleteSection,
    onRename: () => setRenameDialogOpen(true),
    onCreate: handleCreateSection,
    enabled: enableContextMenu && !disabled,
  });

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
          enableContextMenu={enableContextMenu}
          allSections={sections}
          clipboard={clipboard}
          onCopy={handleCopySection}
          onCut={handleCutSection}
          onPaste={handlePasteSection}
          onDelete={handleDeleteSection}
          onRename={handleRenameSection}
          onCreate={handleCreateSection}
          onMove={handleMoveToParent}
        />
      )
    );
    Component.displayName = 'SortableTreeItemComponent';
    return Component;
  }, [
    selectedSectionId,
    handleSelect,
    disabled,
    enableContextMenu,
    sections,
    clipboard,
    handleCopySection,
    handleCutSection,
    handlePasteSection,
    handleDeleteSection,
    handleRenameSection,
    handleCreateSection,
    handleMoveToParent,
  ]);

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
          {enableContextMenu && sectionOperations?.onCreateSection && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleCreateSection(null)}
              title="新規セクション作成 (Ctrl+N)"
              disabled={disabled}
            >
              <Plus className="size-4" />
            </Button>
          )}
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

      {/* Rename dialog for keyboard shortcut (F2) */}
      {selectedSection && (
        <RenameDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          currentName={selectedSection.name}
          onRename={(newName) => {
            handleRenameSection(selectedSection, newName);
          }}
        />
      )}
    </div>
  );
}
