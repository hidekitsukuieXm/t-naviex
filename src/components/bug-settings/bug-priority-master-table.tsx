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
import type { BugPriorityMaster } from '@/types/bug-settings';

export function BugPriorityMasterTable() {
  const { toast } = useToast();
  const [priorities, setPriorities] = useState<BugPriorityMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPriority, setEditingPriority] = useState<BugPriorityMaster | null>(null);
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

    const loadPriorities = async () => {
      try {
        const response = await fetch('/api/bug-settings/priorities');
        if (!isMounted) return;
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        if (!isMounted) return;
        setPriorities(data.priorities || []);
      } catch {
        if (!isMounted) return;
        toast({
          title: 'エラー',
          description: '優先度の取得に失敗しました。',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadPriorities();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleOpenDialog = (priority?: BugPriorityMaster) => {
    if (priority) {
      setEditingPriority(priority);
      setFormData({
        code: priority.code,
        name: priority.name,
        description: priority.description || '',
        color: priority.color,
        level: priority.level,
      });
    } else {
      setEditingPriority(null);
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
      const url = editingPriority
        ? `/api/bug-settings/priorities/${editingPriority.id}`
        : '/api/bug-settings/priorities';
      const method = editingPriority ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
          level: formData.level,
          sortOrder: editingPriority?.sortOrder ?? priorities.length,
          isEnabled: true,
          isDefault: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました。');
      }

      toast({
        title: editingPriority ? '更新完了' : '作成完了',
        description: `優先度を${editingPriority ? '更新' : '作成'}しました。`,
      });

      const listResponse = await fetch('/api/bug-settings/priorities');
      const data = await listResponse.json();
      setPriorities(data.priorities || []);
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

  const handleToggleEnabled = async (priority: BugPriorityMaster) => {
    try {
      const response = await fetch(`/api/bug-settings/priorities/${priority.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !priority.isEnabled }),
      });

      if (!response.ok) throw new Error('更新に失敗しました。');

      setPriorities((prev) =>
        prev.map((p) => (p.id === priority.id ? { ...p, isEnabled: !p.isEnabled } : p))
      );

      toast({
        title: '更新完了',
        description: `${priority.name}を${!priority.isEnabled ? '有効' : '無効'}にしました。`,
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
          {priorities.map((priority) => (
            <TableRow key={priority.id.toString()}>
              <TableCell>
                <GripVertical className="size-4 text-muted-foreground cursor-grab" />
              </TableCell>
              <TableCell className="font-mono">{priority.code}</TableCell>
              <TableCell>{priority.name}</TableCell>
              <TableCell>
                <Badge className={priority.color}>{priority.name}</Badge>
              </TableCell>
              <TableCell className="text-center">{priority.level}</TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={priority.isEnabled}
                  onCheckedChange={() => handleToggleEnabled(priority)}
                  disabled={priority.projectId === null && priority.isDefault}
                />
              </TableCell>
              <TableCell className="text-center">
                {priority.isDefault && <Badge variant="secondary">デフォルト</Badge>}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(priority)}>
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
            <DialogTitle>{editingPriority ? '優先度の編集' : '優先度の追加'}</DialogTitle>
            <DialogDescription>
              バグの優先度を{editingPriority ? '編集' : '追加'}します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">コード</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="例: URGENT"
                disabled={!!editingPriority}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">名前</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: 至急"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">レベル（1-10、高いほど優先）</Label>
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
                placeholder="優先度の説明を入力"
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
              {editingPriority ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
