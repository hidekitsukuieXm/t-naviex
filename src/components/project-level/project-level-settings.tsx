'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  type ProjectLevel,
  type CreateProjectLevelData,
  type ProjectLevelFeature,
  type ProjectLevelLimits,
  PROJECT_LEVEL_FEATURES,
  PROJECT_LEVEL_FEATURE_LABELS,
} from '@/types/project-level';

interface ProjectLevelSettingsProps {
  levels: ProjectLevel[];
  onRefresh: () => void;
}

const DEFAULT_LIMITS: ProjectLevelLimits = {
  maxUsers: 0,
  maxTestCases: 0,
  maxTestRuns: 0,
  maxProjects: 0,
  maxStorageMb: 0,
  maxApiCallsPerDay: 0,
};

export function ProjectLevelSettings({ levels, onRefresh }: ProjectLevelSettingsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<ProjectLevel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [formData, setFormData] = useState<CreateProjectLevelData>({
    name: '',
    displayName: '',
    description: '',
    features: [],
    limits: { ...DEFAULT_LIMITS },
    isDefault: false,
    sortOrder: 0,
  });

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      features: [],
      limits: { ...DEFAULT_LIMITS },
      isDefault: false,
      sortOrder: 0,
    });
    setEditingLevel(null);
    setError(null);
  }, []);

  const handleOpenCreate = useCallback(() => {
    resetForm();
    setIsDialogOpen(true);
  }, [resetForm]);

  const handleOpenEdit = useCallback((level: ProjectLevel) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      displayName: level.displayName,
      description: level.description ?? '',
      features: level.features,
      limits: { ...DEFAULT_LIMITS, ...level.limits },
      isDefault: level.isDefault,
      sortOrder: level.sortOrder,
    });
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    resetForm();
  }, [resetForm]);

  const handleFeatureChange = useCallback(
    (feature: ProjectLevelFeature, checked: boolean) => {
      const newFeatures = checked
        ? [...(formData.features ?? []), feature]
        : (formData.features ?? []).filter((f) => f !== feature);
      setFormData({ ...formData, features: newFeatures });
    },
    [formData]
  );

  const handleLimitChange = useCallback(
    (key: keyof ProjectLevelLimits, value: string) => {
      const numValue = parseInt(value) || 0;
      setFormData({
        ...formData,
        limits: {
          ...formData.limits,
          [key]: numValue,
        },
      });
    },
    [formData]
  );

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const url = editingLevel
        ? `/api/settings/project-levels/${editingLevel.id}`
        : '/api/settings/project-levels';

      const method = editingLevel ? 'PUT' : 'POST';

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
  }, [editingLevel, formData, handleCloseDialog, onRefresh]);

  const handleDelete = useCallback(
    async (level: ProjectLevel) => {
      if (!confirm(`「${level.displayName}」を削除してもよろしいですか？`)) {
        return;
      }

      try {
        const response = await fetch(`/api/settings/project-levels/${level.id}`, {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>プロジェクトレベル設定</CardTitle>
            <CardDescription>プロジェクトレベルごとの機能と制限を管理します。</CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>新規作成</Button>
        </div>
      </CardHeader>
      <CardContent>
        {levels.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            プロジェクトレベルが登録されていません。
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>表示名</TableHead>
                <TableHead>レベル名</TableHead>
                <TableHead>機能数</TableHead>
                <TableHead>デフォルト</TableHead>
                <TableHead>優先度</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levels.map((level) => (
                <TableRow key={level.id}>
                  <TableCell className="font-medium">{level.displayName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{level.name}</Badge>
                  </TableCell>
                  <TableCell>{level.features.length}個</TableCell>
                  <TableCell>
                    {level.isDefault && <Badge variant="secondary">デフォルト</Badge>}
                  </TableCell>
                  <TableCell>{level.sortOrder}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(level)}>
                      編集
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(level)}
                      disabled={level.isDefault}
                    >
                      削除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLevel ? 'プロジェクトレベル編集' : 'プロジェクトレベル作成'}
              </DialogTitle>
              <DialogDescription>機能フラグと制限を設定します。</DialogDescription>
            </DialogHeader>

            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md">{error}</div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">レベル名 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例: STANDARD"
                    disabled={!!editingLevel}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">表示名 *</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="例: スタンダード"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="このレベルの説明"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">優先度</Label>
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
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  />
                  <Label htmlFor="isDefault">デフォルトに設定</Label>
                </div>
              </div>

              <Accordion className="w-full">
                <AccordionItem value="features">
                  <AccordionTrigger>機能フラグ</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-3">
                      {PROJECT_LEVEL_FEATURES.map((feature) => (
                        <div key={feature} className="flex items-center space-x-2">
                          <Checkbox
                            id={feature}
                            checked={formData.features?.includes(feature)}
                            onCheckedChange={(checked) =>
                              handleFeatureChange(feature, checked === true)
                            }
                          />
                          <Label htmlFor={feature} className="text-sm">
                            {PROJECT_LEVEL_FEATURE_LABELS[feature]}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="limits">
                  <AccordionTrigger>制限設定</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      0を設定すると無制限になります。
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxUsers">最大ユーザー数</Label>
                        <Input
                          id="maxUsers"
                          type="number"
                          value={formData.limits?.maxUsers ?? 0}
                          onChange={(e) => handleLimitChange('maxUsers', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxProjects">最大プロジェクト数</Label>
                        <Input
                          id="maxProjects"
                          type="number"
                          value={formData.limits?.maxProjects ?? 0}
                          onChange={(e) => handleLimitChange('maxProjects', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxTestCases">最大テストケース数</Label>
                        <Input
                          id="maxTestCases"
                          type="number"
                          value={formData.limits?.maxTestCases ?? 0}
                          onChange={(e) => handleLimitChange('maxTestCases', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxTestRuns">最大テストラン数</Label>
                        <Input
                          id="maxTestRuns"
                          type="number"
                          value={formData.limits?.maxTestRuns ?? 0}
                          onChange={(e) => handleLimitChange('maxTestRuns', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxStorageMb">最大ストレージ (MB)</Label>
                        <Input
                          id="maxStorageMb"
                          type="number"
                          value={formData.limits?.maxStorageMb ?? 0}
                          onChange={(e) => handleLimitChange('maxStorageMb', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxApiCallsPerDay">最大API呼出回数/日</Label>
                        <Input
                          id="maxApiCallsPerDay"
                          type="number"
                          value={formData.limits?.maxApiCallsPerDay ?? 0}
                          onChange={(e) => handleLimitChange('maxApiCallsPerDay', e.target.value)}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
