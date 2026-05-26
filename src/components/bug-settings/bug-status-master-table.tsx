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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Pencil, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BugStatusMaster, StatusCategory } from '@/types/bug-settings';
import { StatusCategoryLabels } from '@/types/bug-settings';

export function BugStatusMasterTable() {
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<BugStatusMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState<BugStatusMaster | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    category: 'OPEN' as StatusCategory,
    isFinal: false,
  });

  useEffect(() => {
    let isMounted = true;

    const loadStatuses = async () => {
      try {
        const response = await fetch('/api/bug-settings/statuses');
        if (!isMounted) return;
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        if (!isMounted) return;
        setStatuses(data.statuses || []);
      } catch {
        if (!isMounted) return;
        toast({
          title: 'エラー',
          description: 'ステータスの取得に失敗しました。',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadStatuses();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleOpenDialog = (status?: BugStatusMaster) => {
    if (status) {
      setEditingStatus(status);
      setFormData({
        code: status.code,
        name: status.name,
        description: status.description || '',
        color: status.color,
        category: status.category,
        isFinal: status.isFinal,
      });
    } else {
      setEditingStatus(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        category: 'OPEN',
        isFinal: false,
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
      const url = editingStatus
        ? `/api/bug-settings/statuses/${editingStatus.id}`
        : '/api/bug-settings/statuses';
      const method = editingStatus ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
          category: formData.category,
          isFinal: formData.isFinal,
          sortOrder: editingStatus?.sortOrder ?? statuses.length,
          isEnabled: true,
          isDefault: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました。');
      }

      toast({
        title: editingStatus ? '更新完了' : '作成完了',
        description: `ステータスを${editingStatus ? '更新' : '作成'}しました。`,
      });

      const listResponse = await fetch('/api/bug-settings/statuses');
      const data = await listResponse.json();
      setStatuses(data.statuses || []);
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

  const handleToggleEnabled = async (status: BugStatusMaster) => {
    try {
      const response = await fetch(`/api/bug-settings/statuses/${status.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !status.isEnabled }),
      });

      if (!response.ok) throw new Error('更新に失敗しました。');

      setStatuses((prev) =>
        prev.map((s) => (s.id === status.id ? { ...s, isEnabled: !s.isEnabled } : s))
      );

      toast({
        title: '更新完了',
        description: `${status.name}を${!status.isEnabled ? '有効' : '無効'}にしました。`,
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
            <TableHead>カテゴリ</TableHead>
            <TableHead className="text-center">最終状態</TableHead>
            <TableHead className="text-center">有効</TableHead>
            <TableHead className="w-[100px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statuses.map((status) => (
            <TableRow key={status.id.toString()}>
              <TableCell>
                <GripVertical className="size-4 text-muted-foreground cursor-grab" />
              </TableCell>
              <TableCell className="font-mono">{status.code}</TableCell>
              <TableCell>{status.name}</TableCell>
              <TableCell>
                <Badge className={status.color}>{status.name}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{StatusCategoryLabels[status.category]}</Badge>
              </TableCell>
              <TableCell className="text-center">
                {status.isFinal && <Badge variant="secondary">最終</Badge>}
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={status.isEnabled}
                  onCheckedChange={() => handleToggleEnabled(status)}
                  disabled={status.projectId === null && status.isDefault}
                />
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(status)}>
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
            <DialogTitle>{editingStatus ? 'ステータスの編集' : 'ステータスの追加'}</DialogTitle>
            <DialogDescription>
              バグのステータスを{editingStatus ? '編集' : '追加'}します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">コード</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="例: REVIEW"
                disabled={!!editingStatus}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">名前</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: レビュー中"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">カテゴリ</Label>
              <Select
                value={formData.category}
                onValueChange={(value: StatusCategory) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(StatusCategoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="ステータスの説明を入力"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFinal"
                checked={formData.isFinal}
                onCheckedChange={(checked) => setFormData({ ...formData, isFinal: !!checked })}
              />
              <Label htmlFor="isFinal">最終状態（完了または却下など）</Label>
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
              {editingStatus ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
