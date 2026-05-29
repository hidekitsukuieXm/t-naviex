'use client';
'use no memo';

/**
 * Smart Selection Editor Component
 *
 * スマートテスト選択のメインエディタ
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileEdit, Search, BarChart3, List, Loader2, RefreshCw } from 'lucide-react';
import { ChangeSetForm } from './change-set-form';
import { ChangeItemEditor } from './change-item-editor';
import { ImpactAnalysisDisplay } from './impact-analysis-display';
import { TestSelectionTable } from './test-selection-table';
import {
  ChangeSet,
  ChangeItem,
  ImpactAnalysis,
  ImpactScope,
  TestCaseSelection,
  SelectionSummary,
  getImpactScopeLabel,
} from '@/types/smart-test-selection';

interface SmartSelectionEditorProps {
  projectId: string;
  changeSet?: ChangeSet;
  analysis?: ImpactAnalysis;
  selections?: TestCaseSelection[];
  summary?: SelectionSummary;
  onSaveChangeSet: (data: {
    name: string;
    description?: string;
    changes: Omit<ChangeItem, 'id'>[];
    scope: ImpactScope;
  }) => Promise<void>;
  onDeleteChangeSet?: () => Promise<void>;
  onAnalyze: () => Promise<void>;
  onSelectTests: (options?: {
    maxTestCases?: number;
    minPriorityScore?: number;
    includeOptional?: boolean;
    timeLimit?: number;
    prioritizeByRisk?: boolean;
  }) => Promise<void>;
  onGenerateTestSet: (selectedIds: string[], name?: string) => Promise<void>;
  isLoading?: boolean;
  isSaving?: boolean;
  isAnalyzing?: boolean;
  isSelecting?: boolean;
}

export function SmartSelectionEditor({
  changeSet,
  analysis,
  selections,
  summary,
  onSaveChangeSet,
  onDeleteChangeSet,
  onAnalyze,
  onSelectTests,
  onGenerateTestSet,
  isLoading,
  isSaving,
  isAnalyzing,
  isSelecting,
}: SmartSelectionEditorProps) {
  const [activeTab, setActiveTab] = useState(changeSet ? 'details' : 'edit');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTestSetDialog, setShowTestSetDialog] = useState(false);
  const [testSetName, setTestSetName] = useState('');
  const [pendingSelectedIds, setPendingSelectedIds] = useState<string[]>([]);

  // 変更セット保存
  const handleSaveChangeSet = useCallback(
    async (data: {
      name: string;
      description?: string;
      changes: Omit<ChangeItem, 'id'>[];
      scope: ImpactScope;
    }) => {
      await onSaveChangeSet(data);
      setActiveTab('details');
    },
    [onSaveChangeSet]
  );

  // 削除
  const handleDelete = useCallback(async () => {
    if (onDeleteChangeSet) {
      await onDeleteChangeSet();
    }
    setShowDeleteDialog(false);
  }, [onDeleteChangeSet]);

  // 影響分析
  const handleAnalyze = useCallback(async () => {
    await onAnalyze();
    setActiveTab('analysis');
  }, [onAnalyze]);

  // テスト選択
  const handleSelectTests = useCallback(async () => {
    await onSelectTests({ includeOptional: true });
    setActiveTab('selection');
  }, [onSelectTests]);

  // テストセット生成開始
  const handleStartGenerateTestSet = useCallback((selectedIds: string[]) => {
    setPendingSelectedIds(selectedIds);
    setTestSetName(`テストセット - ${new Date().toLocaleDateString('ja-JP')}`);
    setShowTestSetDialog(true);
  }, []);

  // テストセット生成実行
  const handleConfirmGenerateTestSet = useCallback(async () => {
    await onGenerateTestSet(pendingSelectedIds, testSetName);
    setShowTestSetDialog(false);
    setPendingSelectedIds([]);
    setTestSetName('');
  }, [onGenerateTestSet, pendingSelectedIds, testSetName]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{changeSet ? changeSet.name : '新規変更セット'}</h2>
          {changeSet && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{getImpactScopeLabel(changeSet.scope)}</Badge>
              <Badge variant="secondary">{changeSet.changes.length} 変更</Badge>
              {analysis && <Badge variant="default">リスク: {analysis.riskScore}/100</Badge>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {changeSet && (
            <>
              <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-1" />
                )}
                影響分析
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectTests}
                disabled={isSelecting || !analysis}
              >
                {isSelecting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <List className="h-4 w-4 mr-1" />
                )}
                テスト選択
              </Button>
            </>
          )}
        </div>
      </div>

      {/* タブ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="edit" className="flex items-center gap-1">
            <FileEdit className="h-4 w-4" />
            編集
          </TabsTrigger>
          {changeSet && (
            <>
              <TabsTrigger value="details" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                詳細
              </TabsTrigger>
              <TabsTrigger
                value="analysis"
                className="flex items-center gap-1"
                disabled={!analysis}
              >
                <Search className="h-4 w-4" />
                影響分析
                {analysis && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {analysis.riskScore}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="selection"
                className="flex items-center gap-1"
                disabled={!selections}
              >
                <List className="h-4 w-4" />
                選択結果
                {selections && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {selections.length}
                  </Badge>
                )}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* 編集タブ */}
        <TabsContent value="edit">
          <ChangeSetForm
            changeSet={changeSet}
            onSave={handleSaveChangeSet}
            onDelete={onDeleteChangeSet ? async () => setShowDeleteDialog(true) : undefined}
            isLoading={isSaving}
          />
        </TabsContent>

        {/* 詳細タブ */}
        {changeSet && (
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">変更項目</CardTitle>
              </CardHeader>
              <CardContent>
                <ChangeItemEditor items={changeSet.changes} onChange={() => {}} readOnly />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* 影響分析タブ */}
        {analysis && (
          <TabsContent value="analysis">
            <div className="space-y-4">
              <div className="flex items-center justify-end">
                <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing}>
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  再分析
                </Button>
              </div>
              <ImpactAnalysisDisplay analysis={analysis} />
            </div>
          </TabsContent>
        )}

        {/* 選択結果タブ */}
        {selections && summary && (
          <TabsContent value="selection">
            <div className="space-y-4">
              <div className="flex items-center justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectTests}
                  disabled={isSelecting}
                >
                  {isSelecting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  再選択
                </Button>
              </div>
              <TestSelectionTable
                selections={selections}
                summary={summary}
                onGenerateTestSet={handleStartGenerateTestSet}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>変更セットを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。変更セット「{changeSet?.name}」とそれに関連する分析結果、
              推奨テストセットも削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* テストセット生成ダイアログ */}
      <Dialog open={showTestSetDialog} onOpenChange={setShowTestSetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テストセットを生成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">テストセット名</label>
              <input
                type="text"
                value={testSetName}
                onChange={(e) => setTestSetName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="テストセット名を入力"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {pendingSelectedIds.length} 件のテストケースが選択されています。
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowTestSetDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleConfirmGenerateTestSet} disabled={!testSetName.trim()}>
              生成
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SmartSelectionEditor;
