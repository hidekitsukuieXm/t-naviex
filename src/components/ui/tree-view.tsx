'use client';

import * as React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
export interface TreeNode<T = unknown> {
  id: string;
  label: string;
  children?: TreeNode<T>[];
  data?: T;
  disabled?: boolean;
}

export interface TreeViewContextValue {
  selectedIds: Set<string>;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  multiSelect: boolean;
}

const TreeViewContext = React.createContext<TreeViewContextValue | null>(null);

function useTreeView() {
  const context = React.useContext(TreeViewContext);
  if (!context) {
    throw new Error('useTreeView must be used within a TreeView');
  }
  return context;
}

// TreeView Root
export interface TreeViewProps {
  children: React.ReactNode;
  selectedIds?: string[];
  expandedIds?: string[];
  defaultSelectedIds?: string[];
  defaultExpandedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  onExpandedIdsChange?: (ids: string[]) => void;
  multiSelect?: boolean;
  className?: string;
  'aria-label'?: string;
}

const TreeView = React.forwardRef<HTMLDivElement, TreeViewProps>(
  (
    {
      children,
      selectedIds: controlledSelectedIds,
      expandedIds: controlledExpandedIds,
      defaultSelectedIds = [],
      defaultExpandedIds = [],
      onSelectedIdsChange,
      onExpandedIdsChange,
      multiSelect = false,
      className,
      'aria-label': ariaLabel = 'Tree',
      ...props
    },
    ref
  ) => {
    const [internalSelectedIds, setInternalSelectedIds] = React.useState<Set<string>>(
      new Set(defaultSelectedIds)
    );
    const [internalExpandedIds, setInternalExpandedIds] = React.useState<Set<string>>(
      new Set(defaultExpandedIds)
    );

    const selectedIds = React.useMemo(
      () => (controlledSelectedIds ? new Set(controlledSelectedIds) : internalSelectedIds),
      [controlledSelectedIds, internalSelectedIds]
    );
    const expandedIds = React.useMemo(
      () => (controlledExpandedIds ? new Set(controlledExpandedIds) : internalExpandedIds),
      [controlledExpandedIds, internalExpandedIds]
    );

    const handleSelect = React.useCallback(
      (id: string) => {
        const newSelectedIds = new Set(selectedIds);
        if (multiSelect) {
          if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id);
          } else {
            newSelectedIds.add(id);
          }
        } else {
          newSelectedIds.clear();
          newSelectedIds.add(id);
        }

        if (!controlledSelectedIds) {
          setInternalSelectedIds(newSelectedIds);
        }
        onSelectedIdsChange?.(Array.from(newSelectedIds));
      },
      [selectedIds, multiSelect, controlledSelectedIds, onSelectedIdsChange]
    );

    const handleToggle = React.useCallback(
      (id: string) => {
        const newExpandedIds = new Set(expandedIds);
        if (newExpandedIds.has(id)) {
          newExpandedIds.delete(id);
        } else {
          newExpandedIds.add(id);
        }

        if (!controlledExpandedIds) {
          setInternalExpandedIds(newExpandedIds);
        }
        onExpandedIdsChange?.(Array.from(newExpandedIds));
      },
      [expandedIds, controlledExpandedIds, onExpandedIdsChange]
    );

    const contextValue = React.useMemo(
      () => ({
        selectedIds,
        expandedIds,
        onSelect: handleSelect,
        onToggle: handleToggle,
        multiSelect,
      }),
      [selectedIds, expandedIds, handleSelect, handleToggle, multiSelect]
    );

    return (
      <TreeViewContext.Provider value={contextValue}>
        <div
          ref={ref}
          role="tree"
          aria-label={ariaLabel}
          aria-multiselectable={multiSelect}
          className={cn('flex flex-col', className)}
          {...props}
        >
          {children}
        </div>
      </TreeViewContext.Provider>
    );
  }
);
TreeView.displayName = 'TreeView';

// TreeItem
export interface TreeItemProps {
  id: string;
  children?: React.ReactNode;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  expandedIcon?: React.ReactNode;
  collapsedIcon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  depth?: number;
}

const TreeItem = React.forwardRef<HTMLDivElement, TreeItemProps>(
  (
    {
      id,
      children,
      label,
      icon,
      expandedIcon,
      collapsedIcon,
      disabled = false,
      className,
      depth = 0,
    },
    ref
  ) => {
    const { selectedIds, expandedIds, onSelect, onToggle } = useTreeView();

    const hasChildren = React.Children.count(children) > 0;
    const isExpanded = expandedIds.has(id);
    const isSelected = selectedIds.has(id);

    const handleClick = React.useCallback(() => {
      if (!disabled) {
        onSelect(id);
      }
    }, [disabled, onSelect, id]);

    const handleToggleClick = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!disabled && hasChildren) {
          onToggle(id);
        }
      },
      [disabled, hasChildren, onToggle, id]
    );

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent) => {
        if (disabled) return;

        switch (e.key) {
          case 'Enter':
          case ' ':
            e.preventDefault();
            onSelect(id);
            break;
          case 'ArrowRight':
            if (hasChildren && !isExpanded) {
              e.preventDefault();
              onToggle(id);
            }
            break;
          case 'ArrowLeft':
            if (hasChildren && isExpanded) {
              e.preventDefault();
              onToggle(id);
            }
            break;
        }
      },
      [disabled, id, hasChildren, isExpanded, onSelect, onToggle]
    );

    const renderIcon = () => {
      if (hasChildren) {
        if (isExpanded) {
          return expandedIcon ?? icon ?? null;
        }
        return collapsedIcon ?? icon ?? null;
      }
      return icon ?? null;
    };

    return (
      <div ref={ref} className="flex flex-col">
        <div
          role="treeitem"
          aria-selected={isSelected}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          data-state={isExpanded ? 'open' : 'closed'}
          data-selected={isSelected}
          data-disabled={disabled || undefined}
          className={cn(
            'flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors',
            'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isSelected && 'bg-primary/10 text-primary hover:bg-primary/15',
            disabled && 'cursor-not-allowed opacity-50',
            className
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          {hasChildren ? (
            <button
              type="button"
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded hover:bg-muted',
                disabled && 'pointer-events-none'
              )}
              onClick={handleToggleClick}
              tabIndex={-1}
              aria-label={isExpanded ? '折りたたむ' : '展開する'}
            >
              {isExpanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
          ) : (
            <span className="size-5 shrink-0" />
          )}

          {renderIcon() && <span className="shrink-0">{renderIcon()}</span>}

          <span className="truncate">{label}</span>
        </div>

        {hasChildren && isExpanded && (
          <div role="group" className="flex flex-col">
            {React.Children.map(children, (child) => {
              if (React.isValidElement<TreeItemProps>(child)) {
                return React.cloneElement(child, {
                  depth: depth + 1,
                });
              }
              return child;
            })}
          </div>
        )}
      </div>
    );
  }
);
TreeItem.displayName = 'TreeItem';

// TreeView Toolbar (for expand all / collapse all buttons)
export interface TreeViewToolbarProps {
  children: React.ReactNode;
  className?: string;
}

const TreeViewToolbar = React.forwardRef<HTMLDivElement, TreeViewToolbarProps>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('mb-2 flex items-center justify-between border-b pb-2', className)}
      >
        {children}
      </div>
    );
  }
);
TreeViewToolbar.displayName = 'TreeViewToolbar';

// TreeView Label
export interface TreeViewLabelProps {
  children: React.ReactNode;
  className?: string;
}

const TreeViewLabel = React.forwardRef<HTMLSpanElement, TreeViewLabelProps>(
  ({ children, className }, ref) => {
    return (
      <span ref={ref} className={cn('text-sm font-medium', className)}>
        {children}
      </span>
    );
  }
);
TreeViewLabel.displayName = 'TreeViewLabel';

// TreeView Actions
export interface TreeViewActionsProps {
  children: React.ReactNode;
  className?: string;
}

const TreeViewActions = React.forwardRef<HTMLDivElement, TreeViewActionsProps>(
  ({ children, className }, ref) => {
    return (
      <div ref={ref} className={cn('flex gap-1', className)}>
        {children}
      </div>
    );
  }
);
TreeViewActions.displayName = 'TreeViewActions';

// TreeView Action Button
export interface TreeViewActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const TreeViewAction = React.forwardRef<HTMLButtonElement, TreeViewActionProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TreeViewAction.displayName = 'TreeViewAction';

// Utility function to collect all node IDs from a tree
export function collectAllIds<T>(nodes: TreeNode<T>[]): string[] {
  const ids: string[] = [];
  const traverse = (node: TreeNode<T>) => {
    ids.push(node.id);
    if (node.children) {
      node.children.forEach(traverse);
    }
  };
  nodes.forEach(traverse);
  return ids;
}

// Utility function to find a node by ID
export function findNodeById<T>(nodes: TreeNode<T>[], id: string): TreeNode<T> | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

// Utility function to get all ancestor IDs of a node
export function getAncestorIds<T>(nodes: TreeNode<T>[], id: string): string[] {
  const ancestors: string[] = [];

  const findPath = (currentNodes: TreeNode<T>[], targetId: string, path: string[]): boolean => {
    for (const node of currentNodes) {
      if (node.id === targetId) {
        ancestors.push(...path);
        return true;
      }
      if (node.children) {
        if (findPath(node.children, targetId, [...path, node.id])) {
          return true;
        }
      }
    }
    return false;
  };

  findPath(nodes, id, []);
  return ancestors;
}

export { TreeView, TreeItem, TreeViewToolbar, TreeViewLabel, TreeViewActions, TreeViewAction };
