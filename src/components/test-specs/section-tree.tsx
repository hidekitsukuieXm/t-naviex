'use client';

import { useState, useMemo, useCallback } from 'react';
import { type TestSectionWithChildren } from '@/types/test-section';
import { Folder, FolderOpen, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TreeView,
  TreeItem,
  TreeViewToolbar,
  TreeViewLabel,
  TreeViewActions,
  TreeViewAction,
  collectAllIds,
  type TreeNode,
} from '@/components/ui/tree-view';

interface SectionTreeItemProps {
  section: TestSectionWithChildren;
  depth?: number;
}

function SectionTreeItem({ section, depth = 0 }: SectionTreeItemProps) {
  const hasChildren = section.children.length > 0;

  return (
    <TreeItem
      id={section.id}
      label={section.name}
      icon={hasChildren ? undefined : <FileText className="size-4 text-muted-foreground" />}
      expandedIcon={<FolderOpen className="size-4 text-amber-500" />}
      collapsedIcon={<Folder className="size-4 text-amber-500" />}
      depth={depth}
    >
      {section.children.map((child) => (
        <SectionTreeItem key={child.id} section={child} />
      ))}
    </TreeItem>
  );
}

interface SectionTreeProps {
  sections: TestSectionWithChildren[];
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string | null) => void;
  className?: string;
}

export function SectionTree({
  sections,
  selectedSectionId,
  onSelectSection,
  className,
}: SectionTreeProps) {
  // Convert sections to tree nodes for utility functions
  const treeNodes = useMemo((): TreeNode[] => {
    const convertToTreeNode = (section: TestSectionWithChildren): TreeNode => ({
      id: section.id,
      label: section.name,
      children: section.children.map(convertToTreeNode),
    });
    return sections.map(convertToTreeNode);
  }, [sections]);

  // Calculate all IDs for expand all functionality
  const allIds = useMemo(() => collectAllIds(treeNodes), [treeNodes]);

  // Initially expand root sections
  const defaultExpandedIds = useMemo(() => sections.map((s) => s.id), [sections]);

  // Handle selection change
  const handleSelectedIdsChange = useCallback(
    (ids: string[]) => {
      // If the special "all" item is selected or no selection, pass null
      if (ids.includes('__all__') || ids.length === 0) {
        onSelectSection(null);
      } else {
        onSelectSection(ids[0] ?? null);
      }
    },
    [onSelectSection]
  );

  // Track expanded IDs internally for expand/collapse all
  const [expandedIds, setExpandedIds] = useState<string[]>(defaultExpandedIds);

  const handleExpandAll = useCallback(() => {
    setExpandedIds(allIds);
  }, [allIds]);

  const handleCollapseAll = useCallback(() => {
    setExpandedIds([]);
  }, []);

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
          <TreeViewAction onClick={handleExpandAll}>全て展開</TreeViewAction>
          <TreeViewAction onClick={handleCollapseAll}>全て閉じる</TreeViewAction>
        </TreeViewActions>
      </TreeViewToolbar>

      <TreeView
        selectedIds={selectedSectionId === null ? ['__all__'] : [selectedSectionId]}
        expandedIds={expandedIds}
        onSelectedIdsChange={handleSelectedIdsChange}
        onExpandedIdsChange={setExpandedIds}
        aria-label="テストセクション"
        className="flex-1 overflow-auto"
      >
        <TreeItem
          id="__all__"
          label="全てのテストケース"
          icon={<Folder className="size-4 text-blue-500" />}
        />

        {sections.map((section) => (
          <SectionTreeItem key={section.id} section={section} />
        ))}
      </TreeView>
    </div>
  );
}
