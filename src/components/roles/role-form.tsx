'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2 } from 'lucide-react';
import { type Role, type Permissions, validateRoleName } from '@/types/role';
import { PermissionMatrix } from './permission-matrix';

export interface RoleFormData {
  name: string;
  displayName: string;
  description: string;
  permissions: Permissions;
}

interface RoleFormProps {
  role?: Role;
  onSubmit: (data: RoleFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RoleForm({ role, onSubmit, onCancel, isLoading = false }: RoleFormProps) {
  const [formData, setFormData] = useState<RoleFormData>({
    name: role?.name ?? '',
    displayName: role?.displayName ?? '',
    description: role?.description ?? '',
    permissions: role?.permissions ?? {},
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!role) {
      // 新規作成時のみロール名をバリデーション
      const nameValidation = validateRoleName(formData.name);
      if (!nameValidation.valid) {
        setError(nameValidation.error!);
        return;
      }
    }

    if (!formData.displayName.trim()) {
      setError('表示名は必須です。');
      return;
    }

    if (formData.displayName.length > 100) {
      setError('表示名は100文字以内で入力してください。');
      return;
    }

    if (formData.description && formData.description.length > 500) {
      setError('説明は500文字以内で入力してください。');
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
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!role && (
        <div className="space-y-2">
          <Label htmlFor="name">
            ロール名 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="CUSTOM_ROLE"
            disabled={isLoading}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            英数字、アンダースコア、ハイフンのみ使用できます
          </p>
        </div>
      )}

      {role && (
        <div className="space-y-2">
          <Label>ロール名</Label>
          <p className="text-sm text-muted-foreground">{role.name}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="displayName">
          表示名 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="displayName"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          placeholder="カスタムロール"
          disabled={isLoading}
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="ロールの説明を入力"
          disabled={isLoading}
          maxLength={500}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>権限設定</Label>
        <PermissionMatrix
          permissions={formData.permissions}
          onChange={(permissions) => setFormData({ ...formData, permissions })}
          disabled={isLoading}
        />
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
          ) : role ? (
            '更新'
          ) : (
            '作成'
          )}
        </Button>
      </div>
    </form>
  );
}
