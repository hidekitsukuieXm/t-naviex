'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { MasterItem, CreateMasterItemInput, UpdateMasterItemInput } from '@/types/master';
import {
  validateMasterCode,
  validateMasterName,
  validateMasterDescription,
  validateMasterSortOrder,
} from '@/types/master';

// ============================================
// Types
// ============================================

interface MasterItemFormProps {
  item?: MasterItem;
  onSubmit: (data: CreateMasterItemInput | UpdateMasterItemInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// ============================================
// Component
// ============================================

export function MasterItemForm({
  item,
  onSubmit,
  onCancel,
  isLoading = false,
}: MasterItemFormProps) {
  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [sortOrder, setSortOrder] = useState(item?.sortOrder?.toString() ?? '0');
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [isDefault, setIsDefault] = useState(item?.isDefault ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const prevItemIdRef = useRef<string | undefined>(item?.id);

  const isEditing = !!item;

  // Reset form when item changes (using ref comparison to avoid effect rule)
  if (item?.id !== prevItemIdRef.current) {
    prevItemIdRef.current = item?.id;
    if (item) {
      setCode(item.code);
      setName(item.name);
      setDescription(item.description ?? '');
      setSortOrder(item.sortOrder.toString());
      setIsActive(item.isActive);
      setIsDefault(item.isDefault);
    }
  }

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // コード
    const codeValidation = validateMasterCode(code);
    if (!codeValidation.valid && codeValidation.error) {
      newErrors.code = codeValidation.error;
    }

    // 名前
    const nameValidation = validateMasterName(name);
    if (!nameValidation.valid && nameValidation.error) {
      newErrors.name = nameValidation.error;
    }

    // 説明
    const descriptionValidation = validateMasterDescription(description || null);
    if (!descriptionValidation.valid && descriptionValidation.error) {
      newErrors.description = descriptionValidation.error;
    }

    // 並び順
    const sortOrderNum = parseInt(sortOrder, 10);
    if (isNaN(sortOrderNum)) {
      newErrors.sortOrder = '並び順は数値で入力してください。';
    } else {
      const sortOrderValidation = validateMasterSortOrder(sortOrderNum);
      if (!sortOrderValidation.valid && sortOrderValidation.error) {
        newErrors.sortOrder = sortOrderValidation.error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [code, name, description, sortOrder]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        return;
      }

      const data: CreateMasterItemInput | UpdateMasterItemInput = {
        code: code.toUpperCase(),
        name,
        description: description || null,
        sortOrder: parseInt(sortOrder, 10),
        isActive,
        isDefault,
      };

      await onSubmit(data);
    },
    [code, name, description, sortOrder, isActive, isDefault, validate, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* コード */}
      <div className="space-y-2">
        <Label htmlFor="code">
          コード <span className="text-destructive">*</span>
        </Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="FUNCTIONAL"
          disabled={isLoading}
          className={errors.code ? 'border-destructive' : ''}
        />
        {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
        <p className="text-xs text-muted-foreground">大文字英数字とアンダースコアのみ使用可能</p>
      </div>

      {/* 名前 */}
      <div className="space-y-2">
        <Label htmlFor="name">
          名前 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="機能テスト"
          disabled={isLoading}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      {/* 説明 */}
      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="機能要件を確認するテスト"
          rows={3}
          disabled={isLoading}
          className={errors.description ? 'border-destructive' : ''}
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
        <p className="text-xs text-muted-foreground">{description.length}/500文字</p>
      </div>

      {/* 並び順 */}
      <div className="space-y-2">
        <Label htmlFor="sortOrder">並び順</Label>
        <Input
          id="sortOrder"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          min={0}
          max={9999}
          disabled={isLoading}
          className={errors.sortOrder ? 'border-destructive' : ''}
        />
        {errors.sortOrder && <p className="text-sm text-destructive">{errors.sortOrder}</p>}
      </div>

      {/* アクティブ状態 */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="isActive">有効</Label>
          <p className="text-xs text-muted-foreground">無効にすると選択肢に表示されなくなります</p>
        </div>
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={setIsActive}
          disabled={isLoading}
        />
      </div>

      {/* デフォルト状態 */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="isDefault">デフォルト</Label>
          <p className="text-xs text-muted-foreground">
            新規作成時のデフォルト値として使用されます
          </p>
        </div>
        <Switch
          id="isDefault"
          checked={isDefault}
          onCheckedChange={setIsDefault}
          disabled={isLoading}
        />
      </div>

      {/* ボタン */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '保存中...' : isEditing ? '更新' : '作成'}
        </Button>
      </div>
    </form>
  );
}
