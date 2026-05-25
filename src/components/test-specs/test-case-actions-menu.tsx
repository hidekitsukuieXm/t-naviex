'use client';

import { useState, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Copy, Move, Trash2, Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { CaseDependencyDialog } from './case-dependency-dialog';
import type { TestCase } from '@/types/test-case';
import type { TestSectionWithChildren } from '@/types/test-section';

// ============================================
// Types
// ============================================

interface TestCaseActionsMenuProps {
  testCase: TestCase;
  testSpecId: string;
  sections: TestSectionWithChildren[];
  isLocked?: boolean;
  onSuccess?: () => void;
}

// ============================================
// Helper Functions
// ============================================

function flattenSections(
  sections: TestSectionWithChildren[],
  level = 0
): Array<{ id: string; name: string; level: number }> {
  const result: Array<{ id: string; name: string; level: number }> = [];
  for (const section of sections) {
    result.push({ id: section.id, name: section.name, level });
    if (section.children && section.children.length > 0) {
      result.push(...flattenSections(section.children, level + 1));
    }
  }
  return result;
}

// ============================================
// Component
// ============================================

export function TestCaseActionsMenu({
  testCase,
  testSpecId,
  sections,
  isLocked = false,
  onSuccess,
}: TestCaseActionsMenuProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isDependencyDialogOpen, setIsDependencyDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(testCase.sectionId);

  const flatSections = flattenSections(sections);

  // Delete handler
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/test-specs/${testSpecId}/cases/${testCase.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '削除に失敗しました。');
      }

      toast.success('テストケースを削除しました。', {
        description: '削除済みテストケースから復元できます。',
      });
      setIsDeleteDialogOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '削除に失敗しました。');
    } finally {
      setIsDeleting(false);
    }
  }, [testCase.id, testSpecId, onSuccess]);

  // Copy handler
  const handleCopy = useCallback(async () => {
    setIsCopying(true);
    try {
      const response = await fetch(`/api/test-specs/${testSpecId}/cases/${testCase.id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSectionId: targetSectionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'コピーに失敗しました。');
      }

      toast.success('テストケースをコピーしました。');
      setIsCopyDialogOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'コピーに失敗しました。');
    } finally {
      setIsCopying(false);
    }
  }, [testCase.id, testSpecId, targetSectionId, onSuccess]);

  // Move handler
  const handleMove = useCallback(async () => {
    setIsMoving(true);
    try {
      const response = await fetch(`/api/test-specs/${testSpecId}/cases/${testCase.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSectionId: targetSectionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '移動に失敗しました。');
      }

      toast.success('テストケースを移動しました。');
      setIsMoveDialogOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '移動に失敗しました。');
    } finally {
      setIsMoving(false);
    }
  }, [testCase.id, testSpecId, targetSectionId, onSuccess]);

  if (isLocked) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md hover:bg-muted size-8">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">アクション</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsCopyDialogOpen(true)}>
            <Copy className="mr-2 size-4" />
            コピー
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsMoveDialogOpen(true)}>
            <Move className="mr-2 size-4" />
            移動
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDependencyDialogOpen(true)}>
            <Link2 className="mr-2 size-4" />
            依存関係
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テストケースの削除</DialogTitle>
            <DialogDescription>
              「{testCase.title}」を削除しますか？削除済みテストケースから復元できます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Dialog */}
      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テストケースのコピー</DialogTitle>
            <DialogDescription>
              「{testCase.title}」をコピーします。コピー先のセクションを選択してください。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">コピー先セクション</label>
            <Select
              value={targetSectionId || 'none'}
              onValueChange={(value) => setTargetSectionId(value === 'none' ? null : value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="セクションを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">（セクションなし）</SelectItem>
                {flatSections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {'　'.repeat(section.level)}
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCopyDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCopy} disabled={isCopying}>
              {isCopying && <Loader2 className="mr-2 size-4 animate-spin" />}
              コピー
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テストケースの移動</DialogTitle>
            <DialogDescription>
              「{testCase.title}」を移動します。移動先のセクションを選択してください。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">移動先セクション</label>
            <Select
              value={targetSectionId || 'none'}
              onValueChange={(value) => setTargetSectionId(value === 'none' ? null : value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="セクションを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">（セクションなし）</SelectItem>
                {flatSections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {'　'.repeat(section.level)}
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleMove} disabled={isMoving}>
              {isMoving && <Loader2 className="mr-2 size-4 animate-spin" />}
              移動
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dependency Dialog */}
      <CaseDependencyDialog
        open={isDependencyDialogOpen}
        onOpenChange={setIsDependencyDialogOpen}
        testSpecId={testSpecId}
        testCaseId={testCase.id}
        testCaseTitle={testCase.title}
        onDependenciesChanged={onSuccess}
      />
    </>
  );
}
