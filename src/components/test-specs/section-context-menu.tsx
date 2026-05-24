'use client';

import React, { useCallback, useState } from 'react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';
import {
  Copy,
  Clipboard,
  Trash2,
  Edit3,
  FolderPlus,
  FolderInput,
  ChevronRight,
} from 'lucide-react';
import { type TestSectionWithChildren } from '@/types/test-section';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ============================================
// Types
// ============================================

export interface ClipboardData {
  type: 'section';
  sectionId: string;
  sectionName: string;
  operation: 'copy' | 'cut';
}

export interface SectionContextMenuProps {
  children: React.ReactNode;
  section: TestSectionWithChildren;
  allSections: TestSectionWithChildren[];
  clipboard: ClipboardData | null;
  onCopy: (section: TestSectionWithChildren) => void;
  onCut: (section: TestSectionWithChildren) => void;
  onPaste: (targetSection: TestSectionWithChildren) => void;
  onDelete: (section: TestSectionWithChildren) => void;
  onRename: (section: TestSectionWithChildren, newName: string) => void;
  onCreate: (parentSection: TestSectionWithChildren | null) => void;
  onMove: (section: TestSectionWithChildren, targetParentId: string | null) => void;
  disabled?: boolean;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Flatten sections for move submenu
 */
function flattenSections(
  sections: TestSectionWithChildren[],
  level: number = 0
): Array<{ section: TestSectionWithChildren; level: number }> {
  const result: Array<{ section: TestSectionWithChildren; level: number }> = [];
  for (const section of sections) {
    result.push({ section, level });
    if (section.children.length > 0) {
      result.push(...flattenSections(section.children, level + 1));
    }
  }
  return result;
}

/**
 * Check if moving section to target would create circular reference
 */
function isDescendant(
  sectionId: string,
  potentialDescendantId: string,
  sections: TestSectionWithChildren[]
): boolean {
  const findSection = (
    id: string,
    sectionList: TestSectionWithChildren[]
  ): TestSectionWithChildren | null => {
    for (const section of sectionList) {
      if (section.id === id) return section;
      const found = findSection(id, section.children);
      if (found) return found;
    }
    return null;
  };

  const section = findSection(sectionId, sections);
  if (!section) return false;

  const checkDescendants = (children: TestSectionWithChildren[]): boolean => {
    for (const child of children) {
      if (child.id === potentialDescendantId) return true;
      if (checkDescendants(child.children)) return true;
    }
    return false;
  };

  return checkDescendants(section.children);
}

// ============================================
// Rename Dialog Component
// ============================================

export interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onRename: (newName: string) => void;
}

// Inner form component that resets state when mounted
function RenameDialogContent({
  currentName,
  onRename,
  onClose,
}: {
  currentName: string;
  onRename: (newName: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(currentName);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (name.trim() && name.trim() !== currentName) {
        onRename(name.trim());
      }
      onClose();
    },
    [name, currentName, onRename, onClose]
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="section-name">セクション名</Label>
          <Input
            id="section-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="セクション名を入力"
            autoFocus
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>キャンセル</DialogClose>
        <Button type="submit" disabled={!name.trim() || name.trim() === currentName}>
          変更
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RenameDialog({ open, onOpenChange, currentName, onRename }: RenameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>セクション名の変更</DialogTitle>
        </DialogHeader>
        {open && (
          <RenameDialogContent
            currentName={currentName}
            onRename={onRename}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Delete Confirmation Dialog
// ============================================

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionName: string;
  hasChildren: boolean;
  onConfirm: () => void;
}

function DeleteDialog({
  open,
  onOpenChange,
  sectionName,
  hasChildren,
  onConfirm,
}: DeleteDialogProps) {
  const handleConfirm = useCallback(() => {
    onConfirm();
    onOpenChange(false);
  }, [onConfirm, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>セクションの削除</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            セクション「<span className="font-medium text-foreground">{sectionName}</span>
            」を削除しますか？
          </p>
          {hasChildren && (
            <p className="mt-2 text-sm text-destructive">
              このセクションには子セクションが含まれています。削除するとすべての子セクションも削除されます。
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>キャンセル</DialogClose>
          <Button type="button" variant="destructive" onClick={handleConfirm}>
            削除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Main Component
// ============================================

export function SectionContextMenu({
  children,
  section,
  allSections,
  clipboard,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onRename,
  onCreate,
  onMove,
  disabled = false,
}: SectionContextMenuProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleCopy = useCallback(() => {
    onCopy(section);
  }, [onCopy, section]);

  const handleCut = useCallback(() => {
    onCut(section);
  }, [onCut, section]);

  const handlePaste = useCallback(() => {
    onPaste(section);
  }, [onPaste, section]);

  const handleDelete = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    onDelete(section);
  }, [onDelete, section]);

  const handleRename = useCallback(
    (newName: string) => {
      onRename(section, newName);
    },
    [onRename, section]
  );

  const handleCreateSubsection = useCallback(() => {
    onCreate(section);
  }, [onCreate, section]);

  const handleMove = useCallback(
    (targetParentId: string | null) => {
      onMove(section, targetParentId);
    },
    [onMove, section]
  );

  // Get available move targets
  const flatSections = flattenSections(allSections);
  const availableMoveTargets = flatSections.filter(
    ({ section: s }) =>
      s.id !== section.id &&
      s.id !== section.parentId &&
      !isDescendant(section.id, s.id, allSections)
  );

  const canPaste =
    clipboard !== null &&
    clipboard.sectionId !== section.id &&
    !isDescendant(clipboard.sectionId, section.id, allSections);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleCreateSubsection}>
            <FolderPlus className="size-4" />
            新規サブセクション作成
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem onClick={() => setRenameDialogOpen(true)}>
            <Edit3 className="size-4" />
            名前の変更
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem onClick={handleCopy}>
            <Copy className="size-4" />
            コピー
            <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
          </ContextMenuItem>

          <ContextMenuItem onClick={handleCut}>
            <Copy className="size-4" />
            切り取り
            <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
          </ContextMenuItem>

          <ContextMenuItem onClick={handlePaste} disabled={!canPaste}>
            <Clipboard className="size-4" />
            貼り付け
            <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <FolderInput className="size-4" />
              移動先
              <ChevronRight className="ml-auto size-4" />
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem
                onClick={() => handleMove(null)}
                disabled={section.parentId === null}
              >
                ルートへ移動
              </ContextMenuItem>
              {availableMoveTargets.length > 0 && <ContextMenuSeparator />}
              {availableMoveTargets.map(({ section: target, level }) => (
                <ContextMenuItem key={target.id} onClick={() => handleMove(target.id)}>
                  <span style={{ paddingLeft: `${level * 12}px` }}>{target.name}</span>
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator />

          <ContextMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="size-4" />
            削除
            <ContextMenuShortcut>Delete</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        currentName={section.name}
        onRename={handleRename}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        sectionName={section.name}
        hasChildren={section.children.length > 0}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
