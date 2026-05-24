'use client';

import { useState } from 'react';
import { type TestSectionWithChildren } from '@/types/test-section';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionTreeItemProps {
  section: TestSectionWithChildren;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string | null) => void;
  onToggle: (id: string) => void;
  depth: number;
}

function SectionTreeItem({
  section,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
  depth,
}: SectionTreeItemProps) {
  const hasChildren = section.children.length > 0;
  const isExpanded = expandedIds.has(section.id);
  const isSelected = selectedId === section.id;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(section.id);
  };

  return (
    <div>
      <div
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
        tabIndex={0}
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50',
          isSelected && 'bg-primary/10 text-primary hover:bg-primary/15',
          depth > 0 && 'ml-4'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(section.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(section.id);
          }
          if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
            e.preventDefault();
            onToggle(section.id);
          }
          if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
            e.preventDefault();
            onToggle(section.id);
          }
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-muted"
            onClick={handleToggle}
            aria-label={isExpanded ? 'セクションを閉じる' : 'セクションを開く'}
          >
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="size-5 shrink-0" />
        )}

        {hasChildren ? (
          isExpanded ? (
            <FolderOpen className="size-4 shrink-0 text-amber-500" />
          ) : (
            <Folder className="size-4 shrink-0 text-amber-500" />
          )
        ) : (
          <FileText className="size-4 shrink-0 text-muted-foreground" />
        )}

        <span className="truncate">{section.name}</span>
      </div>

      {hasChildren && isExpanded && (
        <div role="group">
          {section.children.map((child) => (
            <SectionTreeItem
              key={child.id}
              section={child}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Initially expand root sections
    return new Set(sections.map((s) => s.id));
  });

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const collectAllIds = (sections: TestSectionWithChildren[]): string[] => {
      const ids: string[] = [];
      sections.forEach((section) => {
        ids.push(section.id);
        if (section.children.length > 0) {
          ids.push(...collectAllIds(section.children));
        }
      });
      return ids;
    };
    setExpandedIds(new Set(collectAllIds(sections)));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  if (sections.length === 0) {
    return (
      <div className={cn('text-center text-sm text-muted-foreground py-8', className)}>
        セクションがありません。
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="mb-2 flex items-center justify-between border-b pb-2">
        <span className="text-sm font-medium">セクション</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleExpandAll}
            className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            全て展開
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            全て閉じる
          </button>
        </div>
      </div>

      <div role="tree" aria-label="テストセクション" className="flex-1 overflow-auto">
        <div
          role="treeitem"
          aria-selected={selectedSectionId === null}
          tabIndex={0}
          className={cn(
            'flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 mb-1',
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
          <span className="size-5 shrink-0" />
          <Folder className="size-4 shrink-0 text-blue-500" />
          <span className="truncate font-medium">全てのテストケース</span>
        </div>

        {sections.map((section) => (
          <SectionTreeItem
            key={section.id}
            section={section}
            selectedId={selectedSectionId}
            expandedIds={expandedIds}
            onSelect={onSelectSection}
            onToggle={handleToggle}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}
