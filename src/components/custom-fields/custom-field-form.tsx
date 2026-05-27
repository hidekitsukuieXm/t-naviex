'use client';

/**
 * Custom Field Form Component
 *
 * カスタムフィールド定義の作成・編集フォーム
 */

import { useState, useCallback } from 'react';
import {
  Type,
  Hash,
  Calendar,
  List,
  ListChecks,
  CheckSquare,
  Link,
  Mail,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CustomFieldType,
  CustomFieldTargetEntity,
  CUSTOM_FIELD_TYPE_INFO,
  TARGET_ENTITY_INFO,
  CustomFieldOption,
  CustomFieldValidationRules,
  CreateCustomFieldDefinitionRequest,
  UpdateCustomFieldDefinitionRequest,
  CustomFieldDefinitionWithDetails,
} from '@/types/custom-field';

// ========================================
// Types
// ========================================

export interface CustomFieldFormProps {
  definition?: CustomFieldDefinitionWithDetails;
  projectId: number;
  onSubmit: (
    data: CreateCustomFieldDefinitionRequest | UpdateCustomFieldDefinitionRequest
  ) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// ========================================
// Icon Map
// ========================================

const FIELD_TYPE_ICONS: Record<CustomFieldType, typeof Type> = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  SELECT_SINGLE: List,
  SELECT_MULTI: ListChecks,
  CHECKBOX: CheckSquare,
  URL: Link,
  EMAIL: Mail,
};

// ========================================
// Component
// ========================================

export function CustomFieldForm({
  definition,
  onSubmit,
  onCancel,
  isLoading = false,
}: CustomFieldFormProps) {
  const isEditing = !!definition;

  // フォーム状態
  const [name, setName] = useState(definition?.name || '');
  const [displayName, setDisplayName] = useState(definition?.displayName || '');
  const [description, setDescription] = useState(definition?.description || '');
  const [fieldType, setFieldType] = useState<CustomFieldType>(
    (definition?.fieldType as CustomFieldType) || 'TEXT'
  );
  const [targetEntity, setTargetEntity] = useState<CustomFieldTargetEntity>(
    (definition?.targetEntity as CustomFieldTargetEntity) || 'TEST_CASE'
  );
  const [isRequired, setIsRequired] = useState(definition?.isRequired || false);
  const [isSearchable, setIsSearchable] = useState(definition?.isSearchable ?? true);
  const [isFilterable, setIsFilterable] = useState(definition?.isFilterable ?? true);
  const [isVisibleInList, setIsVisibleInList] = useState(definition?.isVisibleInList ?? true);
  const [defaultValue, setDefaultValue] = useState(definition?.defaultValue || '');
  const [options, setOptions] = useState<CustomFieldOption[]>(
    (definition?.options as CustomFieldOption[]) || []
  );
  const [validationRules, setValidationRules] = useState<CustomFieldValidationRules>(
    (definition?.validationRules as CustomFieldValidationRules) || {}
  );

  // 選択肢関連
  const supportsOptions = fieldType === 'SELECT_SINGLE' || fieldType === 'SELECT_MULTI';

  const handleAddOption = useCallback(() => {
    const newOption: CustomFieldOption = {
      id: `opt_${Date.now()}`,
      value: '',
      label: '',
      sortOrder: options.length,
    };
    setOptions([...options, newOption]);
  }, [options]);

  const handleUpdateOption = useCallback(
    (index: number, updates: Partial<CustomFieldOption>) => {
      const newOptions = [...options];
      newOptions[index] = { ...newOptions[index], ...updates };
      setOptions(newOptions);
    },
    [options]
  );

  const handleRemoveOption = useCallback(
    (index: number) => {
      setOptions(options.filter((_, i) => i !== index));
    },
    [options]
  );

  // バリデーションルール更新
  const handleValidationChange = useCallback(
    (key: keyof CustomFieldValidationRules, value: unknown) => {
      setValidationRules({ ...validationRules, [key]: value });
    },
    [validationRules]
  );

  // フォーム送信
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (isEditing) {
        const data: UpdateCustomFieldDefinitionRequest = {
          displayName,
          description: description || undefined,
          isRequired,
          isSearchable,
          isFilterable,
          isVisibleInList,
          defaultValue: defaultValue || undefined,
          options: supportsOptions ? options : undefined,
          validationRules: Object.keys(validationRules).length > 0 ? validationRules : undefined,
        };
        await onSubmit(data);
      } else {
        const data: CreateCustomFieldDefinitionRequest = {
          name,
          displayName,
          description: description || undefined,
          fieldType,
          targetEntity,
          isRequired,
          isSearchable,
          isFilterable,
          isVisibleInList,
          defaultValue: defaultValue || undefined,
          options: supportsOptions ? options : undefined,
          validationRules: Object.keys(validationRules).length > 0 ? validationRules : undefined,
        };
        await onSubmit(data);
      }
    },
    [
      isEditing,
      name,
      displayName,
      description,
      fieldType,
      targetEntity,
      isRequired,
      isSearchable,
      isFilterable,
      isVisibleInList,
      defaultValue,
      options,
      validationRules,
      supportsOptions,
      onSubmit,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">フィールド名（内部名）</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="field_name"
                disabled={isEditing || isLoading}
                required
              />
              <p className="text-xs text-muted-foreground">英数字とアンダースコアのみ使用可能</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">表示名</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="表示名"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="フィールドの説明..."
              disabled={isLoading}
              rows={2}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fieldType">フィールドタイプ</Label>
              <Select
                value={fieldType}
                onValueChange={(v) => setFieldType(v as CustomFieldType)}
                disabled={isEditing || isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="タイプを選択" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CUSTOM_FIELD_TYPE_INFO).map(([type, info]) => {
                    const Icon = FIELD_TYPE_ICONS[type as CustomFieldType];
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{info.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetEntity">対象エンティティ</Label>
              <Select
                value={targetEntity}
                onValueChange={(v) => setTargetEntity(v as CustomFieldTargetEntity)}
                disabled={isEditing || isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="エンティティを選択" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TARGET_ENTITY_INFO).map(([entity, info]) => (
                    <SelectItem key={entity} value={entity}>
                      {info.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 選択肢設定（SELECT_SINGLE, SELECT_MULTI用） */}
      {supportsOptions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">選択肢</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {options.map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                <Input
                  value={option.value}
                  onChange={(e) =>
                    handleUpdateOption(index, {
                      value: e.target.value,
                      label: e.target.value,
                    })
                  }
                  placeholder="選択肢の値"
                  disabled={isLoading}
                  className="flex-1"
                />
                <Input
                  type="color"
                  value={option.color || '#6b7280'}
                  onChange={(e) => handleUpdateOption(index, { color: e.target.value })}
                  disabled={isLoading}
                  className="w-12 h-9 p-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveOption(index)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              選択肢を追加
            </Button>
          </CardContent>
        </Card>
      )}

      {/* バリデーション設定 */}
      {CUSTOM_FIELD_TYPE_INFO[fieldType].supportsValidation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">バリデーション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(fieldType === 'TEXT' || fieldType === 'URL' || fieldType === 'EMAIL') && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>最小文字数</Label>
                  <Input
                    type="number"
                    value={validationRules.minLength || ''}
                    onChange={(e) =>
                      handleValidationChange(
                        'minLength',
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    placeholder="0"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>最大文字数</Label>
                  <Input
                    type="number"
                    value={validationRules.maxLength || ''}
                    onChange={(e) =>
                      handleValidationChange(
                        'maxLength',
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    placeholder="制限なし"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {fieldType === 'NUMBER' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>最小値</Label>
                  <Input
                    type="number"
                    value={validationRules.min || ''}
                    onChange={(e) =>
                      handleValidationChange(
                        'min',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="制限なし"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>最大値</Label>
                  <Input
                    type="number"
                    value={validationRules.max || ''}
                    onChange={(e) =>
                      handleValidationChange(
                        'max',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="制限なし"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {fieldType === 'DATE' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>最小日付</Label>
                  <Input
                    type="date"
                    value={validationRules.minDate || ''}
                    onChange={(e) => handleValidationChange('minDate', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>最大日付</Label>
                  <Input
                    type="date"
                    value={validationRules.maxDate || ''}
                    onChange={(e) => handleValidationChange('maxDate', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 表示設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">表示設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>必須フィールド</Label>
              <p className="text-xs text-muted-foreground">このフィールドを入力必須にする</p>
            </div>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} disabled={isLoading} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>検索可能</Label>
              <p className="text-xs text-muted-foreground">検索時にこのフィールドを対象に含める</p>
            </div>
            <Switch checked={isSearchable} onCheckedChange={setIsSearchable} disabled={isLoading} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>フィルター可能</Label>
              <p className="text-xs text-muted-foreground">フィルター条件として使用可能にする</p>
            </div>
            <Switch checked={isFilterable} onCheckedChange={setIsFilterable} disabled={isLoading} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>一覧表示</Label>
              <p className="text-xs text-muted-foreground">一覧画面にこのフィールドを表示する</p>
            </div>
            <Switch
              checked={isVisibleInList}
              onCheckedChange={setIsVisibleInList}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>デフォルト値</Label>
            <Input
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="デフォルト値を入力..."
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* プレビュー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">プレビュー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              {(() => {
                const Icon = FIELD_TYPE_ICONS[fieldType];
                return <Icon className="h-4 w-4 text-muted-foreground" />;
              })()}
              <span className="font-medium">{displayName || 'フィールド名'}</span>
              {isRequired && <Badge variant="destructive">必須</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {description || 'フィールドの説明がここに表示されます'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              タイプ: {CUSTOM_FIELD_TYPE_INFO[fieldType].label} | 対象:{' '}
              {TARGET_ENTITY_INFO[targetEntity].label}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="flex justify-end gap-2">
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
