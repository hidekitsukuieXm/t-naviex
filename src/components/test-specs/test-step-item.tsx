'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GripVertical, Pencil, Trash2, Loader2 } from 'lucide-react';
import { type TestStep } from '@/types/test-step';
import { TestStepForm, type TestStepFormData } from './test-step-form';

// ============================================
// Types
// ============================================

interface TestStepItemProps {
  step: TestStep;
  onUpdate: (stepId: string, data: TestStepFormData) => Promise<void>;
  onDelete: (stepId: string) => Promise<void>;
  disabled?: boolean;
}

// ============================================
// Component
// ============================================

export function TestStepItem({ step, onUpdate, onDelete, disabled = false }: TestStepItemProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleUpdate = async (data: TestStepFormData) => {
    setIsLoading(true);
    try {
      await onUpdate(step.id, data);
      setIsEditOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete(step.id);
      setIsDeleteConfirmOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={`p-4 ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
      >
        <div className="flex items-start gap-3">
          {/* ドラッグハンドル */}
          <button
            type="button"
            className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-5" />
          </button>

          {/* 手順番号 */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {step.stepNo}
          </div>

          {/* 内容 */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* 操作手順 */}
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">操作手順</p>
              <div
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(step.actionMd) }}
              />
            </div>

            {/* 期待結果 */}
            {step.expectedMd && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">期待結果</p>
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(step.expectedMd) }}
                />
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsEditOpen(true)}
              disabled={disabled}
              title="編集"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={disabled}
              title="削除"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 編集ダイアログ */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>手順 {step.stepNo} を編集</DialogTitle>
            <DialogDescription>テスト手順の内容を編集してください。</DialogDescription>
          </DialogHeader>
          <TestStepForm
            step={step}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditOpen(false)}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>手順の削除</DialogTitle>
            <DialogDescription>
              手順 {step.stepNo} を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  削除中...
                </>
              ) : (
                '削除'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================
// Helper Functions
// ============================================

/**
 * 簡易的なMarkdownフォーマット（実際にはMDXパーサーを使用する方が良い）
 */
function formatMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />');
}
