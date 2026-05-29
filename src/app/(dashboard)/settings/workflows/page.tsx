'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, GitBranch, Plus, Pencil, Eye, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BugWorkflowWithTransitions, BugWorkflowTransition } from '@/types/bug-workflow';
import { BugStatusLabels } from '@/types/bug';

export default function WorkflowSettingsPage() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<BugWorkflowWithTransitions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<BugWorkflowWithTransitions | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
  });

  useEffect(() => {
    let isMounted = true;

    const loadWorkflows = async () => {
      try {
        const response = await fetch('/api/bug-workflows');
        if (!isMounted) return;
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        if (!isMounted) return;

        // Fetch full workflow details for each
        const workflowsWithTransitions = await Promise.all(
          (data.workflows || []).map(async (w: { id: string }) => {
            const detailResponse = await fetch(`/api/bug-workflows/${w.id}`);
            if (!detailResponse.ok) return null;
            return detailResponse.json();
          })
        );

        if (!isMounted) return;
        setWorkflows(workflowsWithTransitions.filter(Boolean));
      } catch {
        if (!isMounted) return;
        toast({
          title: 'エラー',
          description: 'ワークフローの取得に失敗しました。',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadWorkflows();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleOpenDetail = (workflow: BugWorkflowWithTransitions) => {
    setSelectedWorkflow(workflow);
    setIsDetailDialogOpen(true);
  };

  const handleOpenEdit = (workflow: BugWorkflowWithTransitions) => {
    setSelectedWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description || '',
      isDefault: workflow.isDefault,
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      description: '',
      isDefault: false,
    });
    setIsCreateDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: 'エラー',
        description: 'ワークフロー名は必須です。',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const url = selectedWorkflow
        ? `/api/bug-workflows/${selectedWorkflow.id}`
        : '/api/bug-workflows';
      const method = selectedWorkflow ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          isDefault: formData.isDefault,
          isEnabled: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました。');
      }

      toast({
        title: selectedWorkflow ? '更新完了' : '作成完了',
        description: `ワークフローを${selectedWorkflow ? '更新' : '作成'}しました。`,
      });

      // Refresh the list
      const listResponse = await fetch('/api/bug-workflows');
      const data = await listResponse.json();
      const workflowsWithTransitions = await Promise.all(
        (data.workflows || []).map(async (w: { id: string }) => {
          const detailResponse = await fetch(`/api/bug-workflows/${w.id}`);
          if (!detailResponse.ok) return null;
          return detailResponse.json();
        })
      );
      setWorkflows(workflowsWithTransitions.filter(Boolean));
      setIsEditDialogOpen(false);
      setIsCreateDialogOpen(false);
    } catch (err) {
      toast({
        title: 'エラー',
        description: err instanceof Error ? err.message : 'エラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (workflow: BugWorkflowWithTransitions) => {
    try {
      const response = await fetch(`/api/bug-workflows/${workflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !workflow.isEnabled }),
      });

      if (!response.ok) throw new Error('更新に失敗しました。');

      setWorkflows((prev) =>
        prev.map((w) => (w.id === workflow.id ? { ...w, isEnabled: !w.isEnabled } : w))
      );

      toast({
        title: '更新完了',
        description: `${workflow.name}を${!workflow.isEnabled ? '有効' : '無効'}にしました。`,
      });
    } catch {
      toast({
        title: 'エラー',
        description: '更新に失敗しました。',
        variant: 'destructive',
      });
    }
  };

  const getStatusLabel = (code: string): string => {
    return BugStatusLabels[code as keyof typeof BugStatusLabels] || code;
  };

  const groupTransitionsByFromStatus = (
    transitions: BugWorkflowTransition[]
  ): Record<string, BugWorkflowTransition[]> => {
    return transitions.reduce(
      (acc, t) => {
        const current = acc[t.fromStatus];
        if (!current) {
          acc[t.fromStatus] = [t];
        } else {
          current.push(t);
        }
        return acc;
      },
      {} as Record<string, BugWorkflowTransition[]>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="size-6" />
          <h1 className="text-2xl font-bold tracking-tight">ワークフロー設定</h1>
        </div>
        <p className="text-muted-foreground">バグのステータス遷移ワークフローを管理します。</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>ワークフロー一覧</CardTitle>
            <CardDescription>
              ステータス遷移のルールを定義するワークフローを管理します。
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 size-4" />
            新規作成
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>説明</TableHead>
                <TableHead className="text-center">遷移数</TableHead>
                <TableHead className="text-center">スコープ</TableHead>
                <TableHead className="text-center">デフォルト</TableHead>
                <TableHead className="text-center">有効</TableHead>
                <TableHead className="w-[150px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((workflow) => (
                <TableRow key={workflow.id.toString()}>
                  <TableCell className="font-medium">{workflow.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {workflow.description || '-'}
                  </TableCell>
                  <TableCell className="text-center">{workflow.transitions?.length || 0}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={workflow.projectId ? 'outline' : 'secondary'}>
                      {workflow.projectId ? 'プロジェクト' : 'システム'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {workflow.isDefault && <Badge>デフォルト</Badge>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={workflow.isEnabled}
                      onCheckedChange={() => handleToggleEnabled(workflow)}
                      disabled={workflow.projectId === null && workflow.isDefault}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDetail(workflow)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(workflow)}>
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedWorkflow?.name}</DialogTitle>
            <DialogDescription>
              {selectedWorkflow?.description || 'このワークフローのステータス遷移ルール'}
            </DialogDescription>
          </DialogHeader>

          {selectedWorkflow && (
            <div className="space-y-4">
              {Object.entries(groupTransitionsByFromStatus(selectedWorkflow.transitions || [])).map(
                ([fromStatus, transitions]) => (
                  <div key={fromStatus} className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Badge variant="outline">{getStatusLabel(fromStatus)}</Badge>
                      からの遷移
                    </h4>
                    <div className="grid gap-2 pl-4">
                      {transitions.map((t) => (
                        <div key={t.id.toString()} className="flex items-center gap-2 text-sm">
                          <ArrowRight className="size-4 text-muted-foreground" />
                          <Badge>{getStatusLabel(t.toStatus)}</Badge>
                          {t.buttonLabel && (
                            <span className="text-muted-foreground">({t.buttonLabel})</span>
                          )}
                          {!t.isEnabled && (
                            <Badge variant="secondary" className="text-xs">
                              無効
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ワークフローの編集</DialogTitle>
            <DialogDescription>ワークフローの基本情報を編集します。</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">名前</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">説明</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ワークフローの作成</DialogTitle>
            <DialogDescription>新しいワークフローを作成します。</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">名前</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: カスタムワークフロー"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-description">説明</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="ワークフローの説明を入力"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isSaving}
            >
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
