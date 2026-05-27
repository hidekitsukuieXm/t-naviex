'use client';

/**
 * Branch Manager Component
 *
 * ブランチ管理のメインコンポーネント
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GitBranch, GitMerge, Plus, History, Loader2 } from 'lucide-react';
import { BranchList } from './branch-list';
import { BranchForm } from './branch-form';
import { BranchSelector } from './branch-selector';
import { SnapshotList } from './snapshot-list';
import { MergeRequestList } from './merge-request-list';
import { MergeRequestForm } from './merge-request-form';
import { ConflictResolver } from './conflict-resolver';
import {
  Branch,
  BranchSnapshot,
  MergeRequest,
  BranchType,
  MergeStatus,
  ResolutionType,
  getBranchTypeLabel,
} from '@/types/branch';

interface BranchManagerProps {
  testSpecId: string;
  branches: Branch[];
  currentBranchId?: string;
  snapshots: BranchSnapshot[];
  mergeRequests: MergeRequest[];
  onCreateBranch: (data: {
    name: string;
    description?: string;
    type: BranchType;
    parentBranchId?: string;
    copyTestCases?: boolean;
  }) => Promise<void>;
  onUpdateBranch: (
    branchId: string,
    data: { name?: string; description?: string }
  ) => Promise<void>;
  onDeleteBranch: (branchId: string) => Promise<void>;
  onFreezeBranch: (branchId: string) => Promise<void>;
  onSelectBranch: (branchId: string) => void;
  onCreateMergeRequest: (data: {
    sourceBranchId: string;
    targetBranchId: string;
    title: string;
    description?: string;
  }) => Promise<void>;
  onCancelMergeRequest: (mergeRequestId: string) => Promise<void>;
  onResolveConflict: (
    mergeRequestId: string,
    conflictId: string,
    resolutionType: ResolutionType,
    resolvedContent?: unknown,
    comment?: string
  ) => Promise<void>;
  onExecuteMerge: (mergeRequestId: string) => Promise<void>;
  isLoading?: boolean;
  isSaving?: boolean;
}

export function BranchManager({
  branches,
  currentBranchId,
  snapshots,
  mergeRequests,
  onCreateBranch,
  onUpdateBranch,
  onDeleteBranch,
  onFreezeBranch,
  onSelectBranch,
  onCreateMergeRequest,
  onCancelMergeRequest,
  onResolveConflict,
  onExecuteMerge,
  isLoading,
  isSaving,
}: BranchManagerProps) {
  const [activeTab, setActiveTab] = useState('branches');
  const [showCreateBranchDialog, setShowCreateBranchDialog] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [showCreateMergeRequestDialog, setShowCreateMergeRequestDialog] = useState(false);
  const [sourceBranchIdForMR, setSourceBranchIdForMR] = useState<string | undefined>();
  const [viewingMergeRequestId, setViewingMergeRequestId] = useState<string | null>(null);

  const currentBranch = branches.find((b) => b.id === currentBranchId);
  const editingBranch = editingBranchId
    ? branches.find((b) => b.id === editingBranchId)
    : undefined;
  const viewingMergeRequest = viewingMergeRequestId
    ? mergeRequests.find((mr) => mr.id === viewingMergeRequestId)
    : undefined;

  const activeBranches = branches.filter((b) => b.status !== 'DELETED');
  const pendingMergeRequests = mergeRequests.filter(
    (mr) => mr.status === MergeStatus.PENDING || mr.status === MergeStatus.CONFLICT
  );

  // ブランチ作成
  const handleCreateBranch = useCallback(
    async (data: {
      name: string;
      description?: string;
      type: BranchType;
      parentBranchId?: string;
      copyTestCases?: boolean;
    }) => {
      await onCreateBranch(data);
      setShowCreateBranchDialog(false);
    },
    [onCreateBranch]
  );

  // ブランチ更新
  const handleUpdateBranch = useCallback(
    async (data: { name: string; description?: string; type: BranchType }) => {
      if (!editingBranchId) return;
      await onUpdateBranch(editingBranchId, {
        name: data.name,
        description: data.description,
      });
      setEditingBranchId(null);
    },
    [editingBranchId, onUpdateBranch]
  );

  // マージリクエスト作成を開く
  const handleOpenCreateMergeRequest = useCallback((sourceBranchId?: string) => {
    setSourceBranchIdForMR(sourceBranchId);
    setShowCreateMergeRequestDialog(true);
  }, []);

  // マージリクエスト作成
  const handleCreateMergeRequest = useCallback(
    async (data: {
      sourceBranchId: string;
      targetBranchId: string;
      title: string;
      description?: string;
    }) => {
      await onCreateMergeRequest(data);
      setShowCreateMergeRequestDialog(false);
      setSourceBranchIdForMR(undefined);
      setActiveTab('merge-requests');
    },
    [onCreateMergeRequest]
  );

  // コンフリクト解決
  const handleResolveConflict = useCallback(
    async (
      conflictId: string,
      resolutionType: ResolutionType,
      resolvedContent?: unknown,
      comment?: string
    ) => {
      if (!viewingMergeRequestId) return;
      await onResolveConflict(
        viewingMergeRequestId,
        conflictId,
        resolutionType,
        resolvedContent,
        comment
      );
    },
    [viewingMergeRequestId, onResolveConflict]
  );

  // マージ実行
  const handleExecuteMerge = useCallback(async () => {
    if (!viewingMergeRequestId) return;
    await onExecuteMerge(viewingMergeRequestId);
    setViewingMergeRequestId(null);
  }, [viewingMergeRequestId, onExecuteMerge]);

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
        <div className="flex items-center gap-4">
          <BranchSelector
            branches={activeBranches}
            selectedBranchId={currentBranchId}
            onSelect={onSelectBranch}
            className="w-[250px]"
          />
          {currentBranch && (
            <Badge variant="outline">{getBranchTypeLabel(currentBranch.type)}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenCreateMergeRequest(currentBranchId)}
            disabled={!currentBranchId || currentBranch?.type === BranchType.MASTER}
          >
            <GitMerge className="h-4 w-4 mr-1" />
            マージリクエスト
          </Button>
          <Button size="sm" onClick={() => setShowCreateBranchDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新規ブランチ
          </Button>
        </div>
      </div>

      {/* タブ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="branches" className="flex items-center gap-1">
            <GitBranch className="h-4 w-4" />
            ブランチ
            <Badge variant="secondary" className="ml-1 text-xs">
              {activeBranches.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <History className="h-4 w-4" />
            履歴
            <Badge variant="secondary" className="ml-1 text-xs">
              {snapshots.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="merge-requests" className="flex items-center gap-1">
            <GitMerge className="h-4 w-4" />
            マージリクエスト
            {pendingMergeRequests.length > 0 && (
              <Badge variant="default" className="ml-1 text-xs">
                {pendingMergeRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ブランチ一覧タブ */}
        <TabsContent value="branches">
          <Card>
            <CardContent className="pt-6">
              <BranchList
                branches={activeBranches}
                currentBranchId={currentBranchId}
                onSelectBranch={onSelectBranch}
                onEditBranch={setEditingBranchId}
                onDeleteBranch={onDeleteBranch}
                onFreezeBranch={onFreezeBranch}
                onCreateMergeRequest={handleOpenCreateMergeRequest}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 履歴タブ */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {currentBranch?.name || 'ブランチを選択'} のスナップショット履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SnapshotList snapshots={snapshots} maxHeight="500px" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* マージリクエストタブ */}
        <TabsContent value="merge-requests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">マージリクエスト</CardTitle>
              <Button size="sm" variant="outline" onClick={() => handleOpenCreateMergeRequest()}>
                <Plus className="h-4 w-4 mr-1" />
                新規作成
              </Button>
            </CardHeader>
            <CardContent>
              <MergeRequestList
                mergeRequests={mergeRequests}
                branches={branches.map((b) => ({ id: b.id, name: b.name }))}
                onViewMergeRequest={setViewingMergeRequestId}
                onCancelMergeRequest={onCancelMergeRequest}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ブランチ作成ダイアログ */}
      <Dialog open={showCreateBranchDialog} onOpenChange={setShowCreateBranchDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新規ブランチの作成</DialogTitle>
          </DialogHeader>
          <BranchForm
            parentBranches={activeBranches}
            onSave={handleCreateBranch}
            onCancel={() => setShowCreateBranchDialog(false)}
            isLoading={isSaving}
          />
        </DialogContent>
      </Dialog>

      {/* ブランチ編集ダイアログ */}
      <Dialog open={!!editingBranchId} onOpenChange={() => setEditingBranchId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ブランチの編集</DialogTitle>
          </DialogHeader>
          <BranchForm
            branch={editingBranch}
            onSave={handleUpdateBranch}
            onCancel={() => setEditingBranchId(null)}
            isLoading={isSaving}
          />
        </DialogContent>
      </Dialog>

      {/* マージリクエスト作成ダイアログ */}
      <Dialog open={showCreateMergeRequestDialog} onOpenChange={setShowCreateMergeRequestDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>マージリクエストの作成</DialogTitle>
          </DialogHeader>
          <MergeRequestForm
            branches={activeBranches}
            sourceBranchId={sourceBranchIdForMR}
            onSubmit={handleCreateMergeRequest}
            onCancel={() => {
              setShowCreateMergeRequestDialog(false);
              setSourceBranchIdForMR(undefined);
            }}
            isLoading={isSaving}
          />
        </DialogContent>
      </Dialog>

      {/* マージリクエスト詳細ダイアログ */}
      <Dialog open={!!viewingMergeRequestId} onOpenChange={() => setViewingMergeRequestId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingMergeRequest?.title || 'マージリクエスト'}</DialogTitle>
          </DialogHeader>
          {viewingMergeRequest && (
            <div className="space-y-4">
              {/* 基本情報 */}
              <div className="flex items-center gap-4">
                <Badge variant="outline">
                  {branches.find((b) => b.id === viewingMergeRequest.sourceBranchId)?.name} →{' '}
                  {branches.find((b) => b.id === viewingMergeRequest.targetBranchId)?.name}
                </Badge>
                <Badge
                  variant={
                    viewingMergeRequest.status === MergeStatus.COMPLETED
                      ? 'default'
                      : viewingMergeRequest.status === MergeStatus.CONFLICT
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {viewingMergeRequest.status}
                </Badge>
              </div>

              {viewingMergeRequest.description && (
                <p className="text-sm text-muted-foreground">{viewingMergeRequest.description}</p>
              )}

              {/* コンフリクト解決 */}
              {viewingMergeRequest.conflicts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">コンフリクト</h3>
                  <ConflictResolver
                    conflicts={viewingMergeRequest.conflicts}
                    onResolve={handleResolveConflict}
                    isLoading={isSaving}
                  />
                </div>
              )}

              {/* マージボタン */}
              {(viewingMergeRequest.status === MergeStatus.PENDING ||
                (viewingMergeRequest.status === MergeStatus.CONFLICT &&
                  viewingMergeRequest.conflicts.every((c) => c.isResolved))) && (
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleExecuteMerge} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    マージを実行
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BranchManager;
