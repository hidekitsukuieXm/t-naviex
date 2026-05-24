'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { TestCaseForm, type TestCaseFormData } from './test-case-form';
import { type TestCase } from '@/types/test-case';
import { type TestSectionWithChildren } from '@/types/test-section';

// ============================================
// Types
// ============================================

interface TestCaseEditDialogProps {
  testSpecId: string;
  testCaseId: string;
  sections?: TestSectionWithChildren[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ============================================
// Helper Functions
// ============================================

/**
 * テストケースの初期フォームデータを作成
 */
function createInitialFormData(testCase: TestCase): TestCaseFormData {
  return {
    title: testCase.title,
    description: testCase.description ?? '',
    preconditions: testCase.preconditions ?? '',
    expectedResult: testCase.expectedResult ?? '',
    checkpoint: testCase.checkpoint ?? '',
    scenario: testCase.scenario ?? '',
    testEnvironment: testCase.testEnvironment ?? '',
    notes: testCase.notes ?? '',
    tags: testCase.tags ?? [],
    classification: testCase.classification ?? '',
    referenceId: testCase.referenceId ?? '',
    estimatedTime: testCase.estimatedTime ?? null,
    priority: testCase.priority,
    testType: testCase.testType,
    testTechnique: testCase.testTechnique,
    sectionId: testCase.sectionId,
    isMatrix: testCase.isMatrix,
  };
}

/**
 * フォームデータの変更を検知
 */
function hasFormChanged(initial: TestCaseFormData, current: TestCaseFormData): boolean {
  // 基本フィールドの比較
  if (initial.title !== current.title) return true;
  if (initial.description !== current.description) return true;
  if (initial.preconditions !== current.preconditions) return true;
  if (initial.expectedResult !== current.expectedResult) return true;
  if (initial.checkpoint !== current.checkpoint) return true;
  if (initial.scenario !== current.scenario) return true;
  if (initial.testEnvironment !== current.testEnvironment) return true;
  if (initial.notes !== current.notes) return true;
  if (initial.classification !== current.classification) return true;
  if (initial.referenceId !== current.referenceId) return true;
  if (initial.estimatedTime !== current.estimatedTime) return true;
  if (initial.priority !== current.priority) return true;
  if (initial.testType !== current.testType) return true;
  if (initial.testTechnique !== current.testTechnique) return true;
  if (initial.sectionId !== current.sectionId) return true;
  if (initial.isMatrix !== current.isMatrix) return true;

  // タグの比較（配列）
  if (initial.tags.length !== current.tags.length) return true;
  if (!initial.tags.every((tag, index) => tag === current.tags[index])) return true;

  return false;
}

// ============================================
// Component
// ============================================

export function TestCaseEditDialog({
  testSpecId,
  testCaseId,
  sections = [],
  open,
  onOpenChange,
  onSuccess,
}: TestCaseEditDialogProps) {
  const router = useRouter();
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // 初期フォームデータを保持
  const initialFormDataRef = useRef<TestCaseFormData | null>(null);

  // ダイアログが開いた時にテストケースを取得
  useEffect(() => {
    if (!open || !testCaseId || !testSpecId) return;

    let cancelled = false;

    async function fetchData() {
      setIsFetching(true);
      setError(null);

      try {
        const response = await fetch(`/api/test-specs/${testSpecId}/cases/${testCaseId}`);

        if (cancelled) return;

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'テストケースの取得に失敗しました。');
        }

        const data = await response.json();

        if (cancelled) return;

        setTestCase(data);
        initialFormDataRef.current = createInitialFormData(data);
        setIsDirty(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [open, testCaseId, testSpecId]);

  // ダイアログを閉じる処理
  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowConfirmDialog(true);
    } else {
      setTestCase(null);
      initialFormDataRef.current = null;
      setError(null);
      onOpenChange(false);
    }
  }, [isDirty, onOpenChange]);

  // 確認ダイアログで「閉じる」を選択
  const handleConfirmClose = useCallback(() => {
    setShowConfirmDialog(false);
    setIsDirty(false);
    setTestCase(null);
    initialFormDataRef.current = null;
    setError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  // 確認ダイアログで「キャンセル」を選択
  const handleCancelClose = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  // フォームの変更を監視
  const handleFormChange = useCallback((data: TestCaseFormData) => {
    if (initialFormDataRef.current) {
      setIsDirty(hasFormChanged(initialFormDataRef.current, data));
    }
  }, []);

  // フォーム送信処理
  const handleSubmit = async (data: TestCaseFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/test-specs/${testSpecId}/cases/${testCaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          preconditions: data.preconditions || null,
          expectedResult: data.expectedResult || null,
          checkpoint: data.checkpoint || null,
          scenario: data.scenario || null,
          testEnvironment: data.testEnvironment || null,
          notes: data.notes || null,
          tags: data.tags,
          classification: data.classification || null,
          referenceId: data.referenceId || null,
          estimatedTime: data.estimatedTime,
          priority: data.priority,
          testType: data.testType,
          testTechnique: data.testTechnique,
          sectionId: data.sectionId,
          isMatrix: data.isMatrix,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'テストケースの更新に失敗しました。');
      }

      setIsDirty(false);
      setTestCase(null);
      initialFormDataRef.current = null;
      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 編集ダイアログ */}
      <Dialog open={open && !showConfirmDialog} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>テストケースの編集</DialogTitle>
            <DialogDescription>テストケースの情報を編集してください。</DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4" />
              <span>{error}</span>
            </div>
          )}

          {isFetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : testCase ? (
            <TestCaseForm
              testCase={testCase}
              sections={sections}
              onSubmit={handleSubmit}
              onCancel={handleClose}
              onChange={handleFormChange}
              isLoading={isLoading}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 保存確認ダイアログ */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>変更を破棄しますか？</DialogTitle>
            <DialogDescription>
              保存されていない変更があります。閉じると変更内容は失われます。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancelClose}>
              編集を続ける
            </Button>
            <Button variant="destructive" onClick={handleConfirmClose}>
              変更を破棄
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
