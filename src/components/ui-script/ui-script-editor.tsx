'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  type UiScript,
  type CreateUiScriptData,
  type UiScriptTrigger,
  UI_SCRIPT_TRIGGER_LABELS,
} from '@/types/ui-script';

interface UiScriptEditorProps {
  scripts: UiScript[];
  onRefresh: () => void;
}

export function UiScriptEditor({ scripts, onRefresh }: UiScriptEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<UiScript | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [formData, setFormData] = useState<CreateUiScriptData>({
    name: '',
    description: '',
    trigger: 'PAGE_LOAD',
    targetPage: '',
    script: '',
    css: '',
    isActive: true,
    priority: 0,
  });

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      trigger: 'PAGE_LOAD',
      targetPage: '',
      script: '',
      css: '',
      isActive: true,
      priority: 0,
    });
    setEditingScript(null);
    setError(null);
  }, []);

  const handleOpenCreate = useCallback(() => {
    resetForm();
    setIsDialogOpen(true);
  }, [resetForm]);

  const handleOpenEdit = useCallback((script: UiScript) => {
    setEditingScript(script);
    setFormData({
      name: script.name,
      description: script.description ?? '',
      trigger: script.trigger,
      targetPage: script.targetPage ?? '',
      script: script.script ?? '',
      css: script.css ?? '',
      isActive: script.isActive,
      priority: script.priority,
    });
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    resetForm();
  }, [resetForm]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const url = editingScript
        ? `/api/settings/ui-scripts/${editingScript.id}`
        : '/api/settings/ui-scripts';

      const method = editingScript ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存に失敗しました。');
      }

      handleCloseDialog();
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingScript, formData, handleCloseDialog, onRefresh]);

  const handleDelete = useCallback(
    async (script: UiScript) => {
      if (!confirm(`「${script.name}」を削除してもよろしいですか？`)) {
        return;
      }

      try {
        const response = await fetch(`/api/settings/ui-scripts/${script.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || '削除に失敗しました。');
        }

        onRefresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : '削除に失敗しました。');
      }
    },
    [onRefresh]
  );

  const handleToggleActive = useCallback(
    async (script: UiScript) => {
      try {
        const response = await fetch(`/api/settings/ui-scripts/${script.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !script.isActive }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || '更新に失敗しました。');
        }

        onRefresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : '更新に失敗しました。');
      }
    },
    [onRefresh]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>UIスクリプト設定</CardTitle>
            <CardDescription>カスタムJavaScriptとCSSをページに挿入できます。</CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>新規作成</Button>
        </div>
      </CardHeader>
      <CardContent>
        {scripts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            UIスクリプトが登録されていません。
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>トリガー</TableHead>
                <TableHead>対象ページ</TableHead>
                <TableHead>優先度</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scripts.map((script) => (
                <TableRow key={script.id}>
                  <TableCell className="font-medium">{script.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{UI_SCRIPT_TRIGGER_LABELS[script.trigger]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {script.targetPage || '全ページ'}
                  </TableCell>
                  <TableCell>{script.priority}</TableCell>
                  <TableCell>
                    <Switch
                      checked={script.isActive}
                      onCheckedChange={() => handleToggleActive(script)}
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(script)}>
                      編集
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(script)}>
                      削除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingScript ? 'UIスクリプト編集' : 'UIスクリプト作成'}</DialogTitle>
              <DialogDescription>カスタムJavaScriptまたはCSSを設定します。</DialogDescription>
            </DialogHeader>

            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md">{error}</div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">スクリプト名 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例: カスタムボタンスタイル"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trigger">トリガー</Label>
                  <Select
                    value={formData.trigger}
                    onValueChange={(value) =>
                      setFormData({ ...formData, trigger: value as UiScriptTrigger })
                    }
                  >
                    <SelectTrigger id="trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UI_SCRIPT_TRIGGER_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Input
                  id="description"
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="このスクリプトの説明"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetPage">対象ページ</Label>
                  <Input
                    id="targetPage"
                    value={formData.targetPage ?? ''}
                    onChange={(e) => setFormData({ ...formData, targetPage: e.target.value })}
                    placeholder="例: /dashboard（空白で全ページ）"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">優先度</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <Tabs defaultValue="script" className="w-full">
                <TabsList>
                  <TabsTrigger value="script">JavaScript</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                </TabsList>
                <TabsContent value="script" className="space-y-2">
                  <Label htmlFor="script">JavaScriptコード</Label>
                  <Textarea
                    id="script"
                    value={formData.script ?? ''}
                    onChange={(e) => setFormData({ ...formData, script: e.target.value })}
                    placeholder="// カスタムJavaScriptを入力..."
                    className="font-mono h-64"
                  />
                </TabsContent>
                <TabsContent value="css" className="space-y-2">
                  <Label htmlFor="css">CSSコード</Label>
                  <Textarea
                    id="css"
                    value={formData.css ?? ''}
                    onChange={(e) => setFormData({ ...formData, css: e.target.value })}
                    placeholder="/* カスタムCSSを入力... */"
                    className="font-mono h-64"
                  />
                </TabsContent>
              </Tabs>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">有効にする</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                キャンセル
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
