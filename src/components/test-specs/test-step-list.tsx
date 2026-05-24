'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertCircle, Plus, Loader2, ListOrdered } from 'lucide-react';
import { type TestStep } from '@/types/test-step';
import { TestStepItem } from './test-step-item';
import { TestStepForm, type TestStepFormData } from './test-step-form';

// ============================================
// Types
// ============================================

interface TestStepListProps {
  testSpecId: string;
  testCaseId: string;
  initialSteps?: TestStep[];
  disabled?: boolean;
}

// ============================================
// Component
// ============================================

export function TestStepList({
  testSpecId,
  testCaseId,
  initialSteps = [],
  disabled = false,
}: TestStepListProps) {
  const router = useRouter();
  const [steps, setSteps] = useState<TestStep[]>(initialSteps);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // DnDセンサーの設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ステップの取得
  const fetchSteps = useCallback(async () => {
    try {
      const response = await fetch(`/api/test-specs/${testSpecId}/cases/${testCaseId}/steps`);
      if (!response.ok) {
        throw new Error('テスト手順の取得に失敗しました。');
      }
      const data = await response.json();
      setSteps(data.steps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    }
  }, [testSpecId, testCaseId]);

  // 新規手順の追加
  const handleAddStep = async (data: TestStepFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/test-specs/${testSpecId}/cases/${testCaseId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionMd: data.actionMd,
          expectedMd: data.expectedMd || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'テスト手順の追加に失敗しました。');
      }

      setIsAddDialogOpen(false);
      await fetchSteps();
      router.refresh();
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 手順の更新
  const handleUpdateStep = async (stepId: string, data: TestStepFormData) => {
    setError(null);

    try {
      const response = await fetch(
        `/api/test-specs/${testSpecId}/cases/${testCaseId}/steps/${stepId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionMd: data.actionMd,
            expectedMd: data.expectedMd || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'テスト手順の更新に失敗しました。');
      }

      await fetchSteps();
      router.refresh();
    } catch (err) {
      throw err;
    }
  };

  // 手順の削除
  const handleDeleteStep = async (stepId: string) => {
    setError(null);

    try {
      const response = await fetch(
        `/api/test-specs/${testSpecId}/cases/${testCaseId}/steps/${stepId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'テスト手順の削除に失敗しました。');
      }

      await fetchSteps();
      router.refresh();
    } catch (err) {
      throw err;
    }
  };

  // ドラッグ&ドロップによる並び替え
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // 楽観的更新
    const newSteps = arrayMove(steps, oldIndex, newIndex);
    setSteps(newSteps);

    // APIに並び替えをリクエスト
    setIsReordering(true);
    setError(null);

    try {
      const reorderItems = newSteps.map((step, index) => ({
        id: step.id,
        stepNo: index + 1,
      }));

      const response = await fetch(
        `/api/test-specs/${testSpecId}/cases/${testCaseId}/steps/reorder`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: reorderItems }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'テスト手順の並び替えに失敗しました。');
      }

      await fetchSteps();
      router.refresh();
    } catch (err) {
      // エラー時は元の順序に戻す
      setSteps(steps);
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-medium">テスト手順</h3>
          <span className="text-sm text-muted-foreground">({steps.length}件)</span>
          {isReordering && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger
            render={
              <Button size="sm" disabled={disabled}>
                <Plus className="mr-2 size-4" />
                手順を追加
              </Button>
            }
          />
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>新規テスト手順</DialogTitle>
              <DialogDescription>新しいテスト手順を追加してください。</DialogDescription>
            </DialogHeader>
            <TestStepForm
              onSubmit={handleAddStep}
              onCancel={() => setIsAddDialogOpen(false)}
              isLoading={isLoading}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4" />
          <span>{error}</span>
        </div>
      )}

      {/* 手順一覧 */}
      {steps.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <ListOrdered className="mx-auto size-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">テスト手順がまだありません。</p>
          <p className="text-sm text-muted-foreground">
            「手順を追加」ボタンから新しい手順を追加してください。
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {steps.map((step) => (
                <TestStepItem
                  key={step.id}
                  step={step}
                  onUpdate={handleUpdateStep}
                  onDelete={handleDeleteStep}
                  disabled={disabled || isReordering}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* 手順追加ヒント */}
      {steps.length > 0 && !disabled && (
        <p className="text-center text-xs text-muted-foreground">
          手順をドラッグして並び替えできます
        </p>
      )}
    </div>
  );
}
