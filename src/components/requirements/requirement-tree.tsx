'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, FolderOpen, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RequirementTypeBadge } from './requirement-type-badge';
import { RequirementStatusBadge } from './requirement-status-badge';
import { RequirementPriorityBadge } from './requirement-priority-badge';
import type {
  RequirementSafe,
  RequirementType,
  RequirementStatus,
  RequirementPriority,
} from '@/types/requirement';

interface RequirementTreeProps {
  requirements: RequirementSafe[];
  selectedId?: string | null;
  onSelect?: (requirement: RequirementSafe) => void;
  expandedIds?: Set<string>;
  onToggle?: (id: string) => void;
}

interface RequirementNodeProps {
  requirement: RequirementSafe;
  level: number;
  selectedId?: string | null;
  onSelect?: (requirement: RequirementSafe) => void;
  isExpanded: boolean;
  onToggle?: (id: string) => void;
}

function RequirementNode({
  requirement,
  level,
  selectedId,
  onSelect,
  isExpanded,
  onToggle,
}: RequirementNodeProps) {
  const hasChildren = requirement.children && requirement.children.length > 0;
  const isSelected = selectedId === requirement.id;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.(requirement.id);
  };

  const handleSelect = () => {
    onSelect?.(requirement);
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors',
          isSelected && 'bg-muted'
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={handleSelect}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <div className="size-5" />
        )}

        {hasChildren ? (
          isExpanded ? (
            <FolderOpen className="size-4 text-amber-500" />
          ) : (
            <Folder className="size-4 text-amber-500" />
          )
        ) : (
          <FileText className="size-4 text-blue-500" />
        )}

        <span className="font-mono text-xs text-muted-foreground">[{requirement.code}]</span>
        <span className="flex-1 truncate text-sm font-medium">{requirement.title}</span>

        <div className="flex items-center gap-1 shrink-0">
          <RequirementTypeBadge type={requirement.type as RequirementType} className="text-xs" />
          <RequirementStatusBadge
            status={requirement.status as RequirementStatus}
            className="text-xs"
          />
          <RequirementPriorityBadge
            priority={requirement.priority as RequirementPriority}
            className="text-xs"
          />
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {requirement.children?.map((child) => (
            <RequirementNode
              key={child.id}
              requirement={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              isExpanded={true}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RequirementTree({
  requirements,
  selectedId,
  onSelect,
  expandedIds: controlledExpandedIds,
  onToggle: controlledOnToggle,
}: RequirementTreeProps) {
  const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string>>(new Set());

  const expandedIds = controlledExpandedIds ?? internalExpandedIds;
  const onToggle =
    controlledOnToggle ??
    ((id: string) => {
      setInternalExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    });

  if (requirements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="mb-4 size-12" />
        <p>要求仕様がありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {requirements.map((requirement) => (
        <RequirementNode
          key={requirement.id}
          requirement={requirement}
          level={0}
          selectedId={selectedId}
          onSelect={onSelect}
          isExpanded={expandedIds.has(requirement.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
