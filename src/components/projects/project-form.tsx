'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  type Project,
  type ProjectFormData,
  type ProjectStatus,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_OPTIONS,
} from '@/types/project';

interface ProjectFormProps {
  project?: Project;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProjectForm({ project, onSubmit, onCancel, isLoading = false }: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: project?.name ?? '',
    description: project?.description ?? '',
    projectType: project?.projectType ?? '',
    targetVersion: project?.targetVersion ?? '',
    status: project?.status ?? 'ACTIVE',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('プロジェクト名は必須です。');
      return;
    }

    if (formData.name.length > 255) {
      setError('プロジェクト名は255文字以内で入力してください。');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">
          プロジェクト名 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="プロジェクト名を入力"
          disabled={isLoading}
          maxLength={255}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="プロジェクトの説明を入力"
          disabled={isLoading}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="projectType">プロジェクトタイプ</Label>
          <Select
            value={formData.projectType}
            onValueChange={(value) => setFormData({ ...formData, projectType: value ?? '' })}
            disabled={isLoading}
          >
            <SelectTrigger id="projectType">
              <SelectValue placeholder="タイプを選択" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetVersion">対象バージョン</Label>
          <Input
            id="targetVersion"
            value={formData.targetVersion}
            onChange={(e) => setFormData({ ...formData, targetVersion: e.target.value })}
            placeholder="例: v1.0.0"
            disabled={isLoading}
            maxLength={100}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">ステータス</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value as ProjectStatus })}
          disabled={isLoading}
        >
          <SelectTrigger id="status">
            <SelectValue placeholder="ステータスを選択" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(PROJECT_STATUS_LABELS) as [ProjectStatus, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              保存中...
            </>
          ) : project ? (
            '更新'
          ) : (
            '作成'
          )}
        </Button>
      </div>
    </form>
  );
}
