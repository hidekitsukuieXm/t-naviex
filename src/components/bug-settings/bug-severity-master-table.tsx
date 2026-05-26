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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Pencil, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BugSeverityMaster } from '@/types/bug-settings';

export function BugSeverityMasterTable() {
  const { toast } = useToast();
  const [severities, setSeverities] = useState<BugSeverityMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSeverity, setEditingSeverity] = useState<BugSeverityMaster | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    level: 1,
  });

  useEffect(() => {
    let isMounted = true;

    const loadSeverities = async () => {
      try {
        const response = await fetch('/api/bug-settings/severities');
        if (!isMounted) return;
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        if (!isMounted) return;
        setSeverities(data.severities || []);
      } catch {
        if (!isMounted) return;
        toast({
          title: 'エラー',
          description: '重要度の取得に失敗しました。',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSeverities();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleOpenDialog = (severity?: BugSeverityMaster) => {
    if (severity) {
      setEditingSeverity(severity);
      setFormData({
        code: severity.code,
        name: severity.name,
        description: severity.description || '',
        color: severity.color,
        level: severity.level,
      });
    } else {
      setEditingSeverity(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        level: 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast({
        title: 'エラー',
        description: 'コードと名前は必須です。',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const url = editingSeverity
        ? `/api/bug-settings/severities/${editingSeverity.id}`
        : '/api/bug-settings/severities';
      const method = editingSeverity ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
          level: formData.level,
          sortOrder: editingSeverity?.sortOrder ?? severities.length,
          isEnabled: true,
          isDefault: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました。');
      }

      toast({
        title: editingSeverity ? '更新完了' : '作成完了',
        description: `重要度を${editingSeverity ? '更新' : '作成'}しました。`,
      });

      const listResponse = await fetch('/api/bug-settings/severities');
      const data = await listResponse.json();
      setSeverities(data.severities || []);
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

  const handleToggleEnabled = async (severity: BugSeverityMaster) => {
    try {
      const response = await fetch(`/api/bug-settings/severities/${severity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !severity.isEnabled }),
      });

      if (!response.ok) throw new Error('更新に失敗しました。');

      setSeverities((prev) =>
        prev.map((s) => (s.id === severity.id ? { ...s, isEnabled: !s.isEnabled } : s))
      );

      toast({
        title: '更新完了',
        description: `${severity.name}を${!severity.isEnabled ? '有効' : '無効'}にしました。`,
      });
    } catch {
      toast({
        title: 'エラー',
        description: '更新に失敗しました。',
        variant: 'destructive',
      });
    }
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
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>コード</TableHead>
            <TableHead>名前</TableHead>
            <TableHead>プレビュー</TableHead>
            <TableHead className="text-center">レベル</TableHead>
            <TableHead className="text-center">有効</TableHead>
            <TableHead className="text-center">デフォルト</TableHead>
            <TableHead className="w-[100px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {severities.map((severity) => (
            <TableRow key={severity.id.toString()}>
              <TableCell>
                <GripVertical className="size-4 text-muted-foreground cursor-grab" />
              </TableCell>
              <TableCell className="font-mono">{severity.code}</TableCell>
              <TableCell>{severity.name}</TableCell>
              <TableCell>
                <Badge className={severity.color}>{severity.name}</Badge>
              </TableCell>
              <TableCell className="text-center">{severity.level}</TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={severity.isEnabled}
                  onCheckedChange={() => handleToggleEnabled(severity)}
                  disabled={severity.projectId === null && severity.isDefault}
                />
              </TableCell>
              <TableCell className="text-center">
                {severity.isDefault && <Badge variant="secondary">デフォルト</Badge>}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(severity)}>
                  <Pencil className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSeverity ? '重要度の編集' : '重要度の追加'}</DialogTitle>
            <DialogDescription>
              バグの重要度を{editingSeverity ? '編集' : '追加'}します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">コード</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="例: COSMETIC"
                disabled={!!editingSeverity}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">名前</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: 見た目"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">レベル（1-10、高いほど重大）</Label>
              <Input
                id="level"
                type="number"
                min={1}
                max={10}
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="重要度の説明を入力"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>プレビュー</Label>
              <div className="flex items-center gap-2">
                <Badge className={formData.color}>{formData.name || '名前'}</Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingSeverity ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
