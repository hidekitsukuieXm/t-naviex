'use client';
'use no memo';

/**
 * Change Item Editor Component
 *
 * 変更項目の編集UI
 */

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, X } from 'lucide-react';
import {
  ChangeItem,
  ChangeType,
  ChangeSeverity,
  getChangeTypeLabel,
  getChangeTypeColor,
  getSeverityLabel,
  getSeverityColor,
  createEmptyChangeItem,
  validateChangeItem,
} from '@/types/smart-test-selection';

interface ChangeItemEditorProps {
  items: Omit<ChangeItem, 'id'>[];
  onChange: (items: Omit<ChangeItem, 'id'>[]) => void;
  readOnly?: boolean;
}

export function ChangeItemEditor({ items, onChange, readOnly }: ChangeItemEditorProps) {
  // アイテムを追加
  const handleAddItem = useCallback(() => {
    onChange([...items, createEmptyChangeItem()]);
  }, [items, onChange]);

  // アイテムを削除
  const handleRemoveItem = useCallback(
    (index: number) => {
      onChange(items.filter((_, i) => i !== index));
    },
    [items, onChange]
  );

  // アイテムを更新
  const handleUpdateItem = useCallback(
    (index: number, updates: Partial<Omit<ChangeItem, 'id'>>) => {
      onChange(items.map((item, i) => (i === index ? { ...item, ...updates } : item)));
    },
    [items, onChange]
  );

  // モジュールを追加
  const handleAddModule = useCallback(
    (index: number, module: string) => {
      if (!module.trim()) return;
      const item = items[index];
      if (!item.affectedModules.includes(module)) {
        handleUpdateItem(index, {
          affectedModules: [...item.affectedModules, module],
        });
      }
    },
    [items, handleUpdateItem]
  );

  // モジュールを削除
  const handleRemoveModule = useCallback(
    (index: number, module: string) => {
      const item = items[index];
      handleUpdateItem(index, {
        affectedModules: item.affectedModules.filter((m) => m !== module),
      });
    },
    [items, handleUpdateItem]
  );

  // 機能を追加
  const handleAddFeature = useCallback(
    (index: number, feature: string) => {
      if (!feature.trim()) return;
      const item = items[index];
      if (!item.affectedFeatures.includes(feature)) {
        handleUpdateItem(index, {
          affectedFeatures: [...item.affectedFeatures, feature],
        });
      }
    },
    [items, handleUpdateItem]
  );

  // 機能を削除
  const handleRemoveFeature = useCallback(
    (index: number, feature: string) => {
      const item = items[index];
      handleUpdateItem(index, {
        affectedFeatures: item.affectedFeatures.filter((f) => f !== feature),
      });
    },
    [items, handleUpdateItem]
  );

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const validation = validateChangeItem(item);

        return (
          <Card key={index} className={!validation.valid ? 'border-destructive' : ''}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">変更項目 {index + 1}</CardTitle>
                {!readOnly && items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(index)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 変更名 */}
                <div className="col-span-2">
                  <Label className="text-xs">変更名 *</Label>
                  {readOnly ? (
                    <p className="text-sm mt-1">{item.name || '-'}</p>
                  ) : (
                    <Input
                      value={item.name}
                      onChange={(e) => handleUpdateItem(index, { name: e.target.value })}
                      placeholder="変更の名前"
                      className="mt-1"
                    />
                  )}
                </div>

                {/* 変更タイプ */}
                <div>
                  <Label className="text-xs">変更タイプ *</Label>
                  {readOnly ? (
                    <Badge
                      variant="outline"
                      className="mt-1"
                      style={{ borderColor: getChangeTypeColor(item.type) }}
                    >
                      {getChangeTypeLabel(item.type)}
                    </Badge>
                  ) : (
                    <Select
                      value={item.type}
                      onValueChange={(value) =>
                        handleUpdateItem(index, { type: value as ChangeType })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ChangeType).map((type) => (
                          <SelectItem key={type} value={type}>
                            {getChangeTypeLabel(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* 深刻度 */}
                <div>
                  <Label className="text-xs">深刻度 *</Label>
                  {readOnly ? (
                    <Badge
                      variant="outline"
                      className="mt-1"
                      style={{ borderColor: getSeverityColor(item.severity) }}
                    >
                      {getSeverityLabel(item.severity)}
                    </Badge>
                  ) : (
                    <Select
                      value={item.severity}
                      onValueChange={(value) =>
                        handleUpdateItem(index, { severity: value as ChangeSeverity })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ChangeSeverity).map((severity) => (
                          <SelectItem key={severity} value={severity}>
                            {getSeverityLabel(severity)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* 説明 */}
                <div className="col-span-2">
                  <Label className="text-xs">説明</Label>
                  {readOnly ? (
                    <p className="text-sm mt-1">{item.description || '-'}</p>
                  ) : (
                    <Textarea
                      value={item.description || ''}
                      onChange={(e) => handleUpdateItem(index, { description: e.target.value })}
                      placeholder="変更の説明"
                      className="mt-1"
                      rows={2}
                    />
                  )}
                </div>

                {/* パス */}
                <div className="col-span-2">
                  <Label className="text-xs">パス</Label>
                  {readOnly ? (
                    <p className="text-sm mt-1 font-mono">{item.path || '-'}</p>
                  ) : (
                    <Input
                      value={item.path || ''}
                      onChange={(e) => handleUpdateItem(index, { path: e.target.value })}
                      placeholder="ファイルパスまたはURL"
                      className="mt-1 font-mono text-sm"
                    />
                  )}
                </div>

                {/* 影響モジュール */}
                <div className="col-span-2">
                  <Label className="text-xs">影響モジュール</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {item.affectedModules.map((module) => (
                      <Badge key={module} variant="secondary" className="text-xs">
                        {module}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveModule(index, module)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                    {!readOnly && (
                      <Input
                        placeholder="モジュール名を入力"
                        className="h-7 w-32 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddModule(index, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* 影響機能 */}
                <div className="col-span-2">
                  <Label className="text-xs">影響機能</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {item.affectedFeatures.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFeature(index, feature)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                    {!readOnly && (
                      <Input
                        placeholder="機能名を入力"
                        className="h-7 w-32 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddFeature(index, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* バリデーションエラー */}
              {!validation.valid && (
                <div className="text-xs text-destructive">
                  {validation.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* 追加ボタン */}
      {!readOnly && (
        <Button type="button" variant="outline" onClick={handleAddItem} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          変更項目を追加
        </Button>
      )}
    </div>
  );
}

export default ChangeItemEditor;
