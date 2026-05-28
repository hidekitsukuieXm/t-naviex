'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import {
  type TestParameter,
  type CreateTestParameterData,
  calculateCombinationCount,
  expandParameters,
} from '@/types/test-parameter';

interface ParameterEditorProps {
  testCaseId: string;
  parameters: TestParameter[];
  onRefresh: () => void;
}

export function ParameterEditor({ testCaseId, parameters, onRefresh }: ParameterEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<TestParameter | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [formData, setFormData] = useState<CreateTestParameterData>({
    name: '',
    description: '',
    values: [],
    isRequired: false,
    sortOrder: 0,
  });
  const [valueInput, setValueInput] = useState('');

  const combinationCount = calculateCombinationCount(parameters);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      values: [],
      isRequired: false,
      sortOrder: 0,
    });
    setValueInput('');
    setEditingParam(null);
    setError(null);
  }, []);

  const handleOpenCreate = useCallback(() => {
    resetForm();
    setIsDialogOpen(true);
  }, [resetForm]);

  const handleOpenEdit = useCallback((param: TestParameter) => {
    setEditingParam(param);
    setFormData({
      name: param.name,
      description: param.description ?? '',
      values: param.values,
      isRequired: param.isRequired,
      sortOrder: param.sortOrder,
    });
    setValueInput('');
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    resetForm();
  }, [resetForm]);

  const handleAddValue = useCallback(() => {
    if (!valueInput.trim()) return;
    const newValues = [...(formData.values ?? []), valueInput.trim()];
    setFormData({ ...formData, values: newValues });
    setValueInput('');
  }, [formData, valueInput]);

  const handleRemoveValue = useCallback(
    (index: number) => {
      const newValues = (formData.values ?? []).filter((_, i) => i !== index);
      setFormData({ ...formData, values: newValues });
    },
    [formData]
  );

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const url = editingParam
        ? `/api/test-cases/${testCaseId}/parameters/${editingParam.id}`
        : `/api/test-cases/${testCaseId}/parameters`;

      const method = editingParam ? 'PUT' : 'POST';

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
  }, [editingParam, formData, handleCloseDialog, onRefresh, testCaseId]);

  const handleDelete = useCallback(
    async (param: TestParameter) => {
      if (!confirm(`「${param.name}」を削除してもよろしいですか？`)) {
        return;
      }

      try {
        const response = await fetch(`/api/test-cases/${testCaseId}/parameters/${param.id}`, {
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
    [onRefresh, testCaseId]
  );

  // プレビュー用の組み合わせを生成
  const previewCombinations = expandParameters(parameters).slice(0, 20);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>テストパラメーター</CardTitle>
            <CardDescription>
              パラメーターを設定してテストケースを自動展開します。
              {combinationCount > 0 && (
                <span className="ml-2">
                  （組み合わせ数: <strong>{combinationCount}</strong>）
                </span>
              )}
            </CardDescription>
          </div>
          <div className="space-x-2">
            {parameters.length > 0 && (
              <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
                プレビュー
              </Button>
            )}
            <Button onClick={handleOpenCreate}>パラメーター追加</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {parameters.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            テストパラメーターが登録されていません。
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>パラメーター名</TableHead>
                <TableHead>値</TableHead>
                <TableHead>必須</TableHead>
                <TableHead>順序</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parameters.map((param) => (
                <TableRow key={param.id}>
                  <TableCell className="font-medium">{param.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {param.values.slice(0, 5).map((value, index) => (
                        <Badge key={index} variant="secondary">
                          {value}
                        </Badge>
                      ))}
                      {param.values.length > 5 && (
                        <Badge variant="outline">+{param.values.length - 5}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {param.isRequired && <Badge variant="destructive">必須</Badge>}
                  </TableCell>
                  <TableCell>{param.sortOrder}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(param)}>
                      編集
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(param)}>
                      削除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* パラメーター編集ダイアログ */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingParam ? 'パラメーター編集' : 'パラメーター作成'}</DialogTitle>
              <DialogDescription>テストパラメーターの名前と値を設定します。</DialogDescription>
            </DialogHeader>

            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md">{error}</div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">パラメーター名 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例: browser"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">表示順序</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Input
                  id="description"
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="このパラメーターの説明"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isRequired"
                  checked={formData.isRequired}
                  onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
                />
                <Label htmlFor="isRequired">必須パラメーター</Label>
              </div>

              <div className="space-y-2">
                <Label>パラメーター値</Label>
                <div className="flex gap-2">
                  <Input
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    placeholder="例: Chrome"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddValue();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddValue}>
                    追加
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(formData.values ?? []).map((value, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveValue(index)}
                    >
                      {value} x
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">クリックで値を削除できます。</p>
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

        {/* プレビューダイアログ */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>パラメーター組み合わせプレビュー</DialogTitle>
              <DialogDescription>
                全{combinationCount}件中、最初の20件を表示しています。
              </DialogDescription>
            </DialogHeader>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  {parameters.map((param) => (
                    <TableHead key={param.id}>{param.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewCombinations.map((combo) => (
                  <TableRow key={combo.index}>
                    <TableCell>{combo.index + 1}</TableCell>
                    {parameters.map((param) => (
                      <TableCell key={param.id}>{combo.values[param.name]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <DialogFooter>
              <Button onClick={() => setIsPreviewOpen(false)}>閉じる</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
