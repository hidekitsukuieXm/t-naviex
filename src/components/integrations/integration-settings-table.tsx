'use client';

import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  PlayCircle,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  IntegrationType,
  IntegrationTypeLabels,
  type ExternalIntegrationSafe,
} from '@/types/external-integration';

const integrationTypes = Object.entries(IntegrationTypeLabels) as [IntegrationType, string][];

interface IntegrationFormData {
  name: string;
  integrationType: IntegrationType;
  baseUrl: string;
  apiKey: string;
  username: string;
  password: string;
  projectKey: string;
  isEnabled: boolean;
}

const initialFormData: IntegrationFormData = {
  name: '',
  integrationType: 'REDMINE',
  baseUrl: '',
  apiKey: '',
  username: '',
  password: '',
  projectKey: '',
  isEnabled: true,
};

export function IntegrationSettingsTable() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<ExternalIntegrationSafe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingIntegration, setEditingIntegration] = useState<ExternalIntegrationSafe | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingIntegration, setDeletingIntegration] = useState<ExternalIntegrationSafe | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<IntegrationFormData>(initialFormData);

  const refreshIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch {
      toast({
        title: 'エラー',
        description: '外部連携設定の取得に失敗しました。',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadIntegrations = async () => {
      try {
        const response = await fetch('/api/integrations');
        if (!isMounted) return;
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        if (!isMounted) return;
        setIntegrations(data.integrations || []);
      } catch {
        if (!isMounted) return;
        toast({
          title: 'エラー',
          description: '外部連携設定の取得に失敗しました。',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadIntegrations();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleOpenDialog = (integration?: ExternalIntegrationSafe) => {
    if (integration) {
      setEditingIntegration(integration);
      setFormData({
        name: integration.name,
        integrationType: integration.integrationType,
        baseUrl: integration.baseUrl,
        apiKey: '',
        username: integration.username || '',
        password: '',
        projectKey: integration.projectKey || '',
        isEnabled: integration.isEnabled,
      });
    } else {
      setEditingIntegration(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (integration: ExternalIntegrationSafe) => {
    setDeletingIntegration(integration);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.baseUrl) {
      toast({
        title: 'エラー',
        description: '名前とURLは必須です。',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const url = editingIntegration
        ? `/api/integrations/${editingIntegration.id}`
        : '/api/integrations';
      const method = editingIntegration ? 'PUT' : 'POST';

      const bodyData: Record<string, unknown> = {
        name: formData.name,
        integrationType: formData.integrationType,
        baseUrl: formData.baseUrl,
        projectKey: formData.projectKey || null,
        isEnabled: formData.isEnabled,
      };

      // Only include credentials if they are provided
      if (formData.apiKey) {
        bodyData.apiKey = formData.apiKey;
      }
      if (formData.username) {
        bodyData.username = formData.username;
      }
      if (formData.password) {
        bodyData.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました。');
      }

      toast({
        title: editingIntegration ? '更新完了' : '作成完了',
        description: `外部連携設定を${editingIntegration ? '更新' : '作成'}しました。`,
      });

      await refreshIntegrations();
      setIsDialogOpen(false);
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

  const handleDelete = async () => {
    if (!deletingIntegration) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/integrations/${deletingIntegration.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました。');
      }

      toast({
        title: '削除完了',
        description: '外部連携設定を削除しました。',
      });

      await refreshIntegrations();
      setIsDeleteDialogOpen(false);
    } catch {
      toast({
        title: 'エラー',
        description: '削除に失敗しました。',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeletingIntegration(null);
    }
  };

  const handleToggleEnabled = async (integration: ExternalIntegrationSafe) => {
    try {
      const response = await fetch(`/api/integrations/${integration.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !integration.isEnabled }),
      });

      if (!response.ok) throw new Error('更新に失敗しました。');

      setIntegrations((prev) =>
        prev.map((i) => (i.id === integration.id ? { ...i, isEnabled: !i.isEnabled } : i))
      );

      toast({
        title: '更新完了',
        description: `${integration.name}を${!integration.isEnabled ? '有効' : '無効'}にしました。`,
      });
    } catch {
      toast({
        title: 'エラー',
        description: '更新に失敗しました。',
        variant: 'destructive',
      });
    }
  };

  const handleTestConnection = async (integration: ExternalIntegrationSafe) => {
    setTestingId(integration.id);
    try {
      const response = await fetch(`/api/integrations/${integration.id}/test`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '接続成功',
          description: result.message,
        });
      } else {
        toast({
          title: '接続失敗',
          description: result.message || result.error,
          variant: 'destructive',
        });
      }

      await refreshIntegrations();
    } catch {
      toast({
        title: 'エラー',
        description: '接続テストに失敗しました。',
        variant: 'destructive',
      });
    } finally {
      setTestingId(null);
    }
  };

  const getTestStatusBadge = (integration: ExternalIntegrationSafe) => {
    if (integration.lastTestedAt === null) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="size-3" />
          未テスト
        </Badge>
      );
    }

    if (integration.lastTestResult) {
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle className="size-3" />
          成功
        </Badge>
      );
    }

    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="size-3" />
        失敗
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 size-4" />
          新規追加
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>タイプ</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>プロジェクトキー</TableHead>
            <TableHead className="text-center">接続状態</TableHead>
            <TableHead className="text-center">有効</TableHead>
            <TableHead className="w-[150px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {integrations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                外部連携設定がありません。
              </TableCell>
            </TableRow>
          ) : (
            integrations.map((integration) => (
              <TableRow key={integration.id}>
                <TableCell className="font-medium">{integration.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {IntegrationTypeLabels[integration.integrationType]}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{integration.baseUrl}</TableCell>
                <TableCell>{integration.projectKey || '-'}</TableCell>
                <TableCell className="text-center">{getTestStatusBadge(integration)}</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={integration.isEnabled}
                    onCheckedChange={() => handleToggleEnabled(integration)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTestConnection(integration)}
                      disabled={testingId === integration.id}
                      title="接続テスト"
                    >
                      {testingId === integration.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <PlayCircle className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(integration)}
                      title="編集"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDeleteDialog(integration)}
                      className="text-destructive hover:text-destructive"
                      title="削除"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingIntegration ? '外部連携設定の編集' : '外部連携設定の追加'}
            </DialogTitle>
            <DialogDescription>
              外部サービスとの連携設定を{editingIntegration ? '編集' : '追加'}します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">名前 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: 本番Redmine"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="integrationType">連携タイプ *</Label>
              <Select
                value={formData.integrationType}
                onValueChange={(value) =>
                  setFormData({ ...formData, integrationType: value as IntegrationType })
                }
                disabled={!!editingIntegration}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {integrationTypes.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUrl">URL *</Label>
              <Input
                id="baseUrl"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="例: https://redmine.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">
                APIキー / アクセストークン
                {editingIntegration?.hasApiKey && (
                  <span className="ml-2 text-xs text-muted-foreground">(設定済み)</span>
                )}
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder={editingIntegration?.hasApiKey ? '変更する場合のみ入力' : 'APIキー'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">ユーザー名</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="ユーザー名"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  パスワード
                  {editingIntegration?.hasPassword && (
                    <span className="ml-2 text-xs text-muted-foreground">(設定済み)</span>
                  )}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={
                    editingIntegration?.hasPassword ? '変更する場合のみ入力' : 'パスワード'
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectKey">プロジェクトキー / ID</Label>
              <Input
                id="projectKey"
                value={formData.projectKey}
                onChange={(e) => setFormData({ ...formData, projectKey: e.target.value })}
                placeholder="例: PROJECT-1"
              />
              <p className="text-xs text-muted-foreground">連携先のプロジェクト識別子</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingIntegration ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>外部連携設定の削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{deletingIntegration?.name}」を削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
