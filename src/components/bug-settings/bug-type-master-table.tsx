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
import type { BugTypeMaster } from '@/types/bug-settings';

export function BugTypeMasterTable() {
  const { toast } = useToast();
  const [types, setTypes] = useState<BugTypeMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingType, setEditingType] = useState<BugTypeMaster | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  });

  useEffect(() => {
    let isMounted = true;

    const loadTypes = async () => {
      try {
        const response = await fetch('/api/bug-settings/types');
        if (!isMounted) return;
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        if (!isMounted) return;
        setTypes(data.types || []);
      } catch {
        if (!isMounted) return;
        toast({
          title: 'エラー',
          description: '種別の取得に失敗しました。',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadTypes();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleOpenDialog = (type?: BugTypeMaster) => {
    if (type) {
      setEditingType(type);
      setFormData({
        code: type.code,
        name: type.name,
        description: type.description || '',
        color: type.color,
      });
    } else {
      setEditingType(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
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
      const url = editingType
        ? `/api/bug-settings/types/${editingType.id}`
        : '/api/bug-settings/types';
      const method = editingType ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
          sortOrder: editingType?.sortOrder ?? types.length,
          isEnabled: true,
          isDefault: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました。');
      }

      toast({
        title: editingType ? '更新完了' : '作成完了',
        description: `種別を${editingType ? '更新' : '作成'}しました。`,
      });

      // Refresh the list
      const listResponse = await fetch('/api/bug-settings/types');
      const data = await listResponse.json();
      setTypes(data.types || []);
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

  const handleToggleEnabled = async (type: BugTypeMaster) => {
    try {
      const response = await fetch(`/api/bug-settings/types/${type.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !type.isEnabled }),
      });

      if (!response.ok) throw new Error('更新に失敗しました。');

      setTypes((prev) =>
        prev.map((t) => (t.id === type.id ? { ...t, isEnabled: !t.isEnabled } : t))
      );

      toast({
        title: '更新完了',
        description: `${type.name}を${!type.isEnabled ? '有効' : '無効'}にしました。`,
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
            <TableHead>説明</TableHead>
            <TableHead className="text-center">有効</TableHead>
            <TableHead className="text-center">デフォルト</TableHead>
            <TableHead className="w-[100px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {types.map((type) => (
            <TableRow key={type.id.toString()}>
              <TableCell>
                <GripVertical className="size-4 text-muted-foreground cursor-grab" />
              </TableCell>
              <TableCell className="font-mono">{type.code}</TableCell>
              <TableCell>{type.name}</TableCell>
              <TableCell>
                <Badge className={type.color}>{type.name}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{type.description || '-'}</TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={type.isEnabled}
                  onCheckedChange={() => handleToggleEnabled(type)}
                  disabled={type.projectId === null && type.isDefault}
                />
              </TableCell>
              <TableCell className="text-center">
                {type.isDefault && <Badge variant="secondary">デフォルト</Badge>}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(type)}>
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
            <DialogTitle>{editingType ? '種別の編集' : '種別の追加'}</DialogTitle>
            <DialogDescription>
              バグの種別を{editingType ? '編集' : '追加'}します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">コード</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="例: SECURITY"
                disabled={!!editingType}
              />
              <p className="text-xs text-muted-foreground">
                英大文字・数字・アンダースコアのみ使用可能
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">名前</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: セキュリティ"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="種別の説明を入力"
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
              {editingType ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
