'use client';
'use no memo';

/**
 * Change Set Form Component
 *
 * 変更セットの作成・編集フォーム
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { ChangeItemEditor } from './change-item-editor';
import {
  ChangeItem,
  ChangeSet,
  ImpactScope,
  getImpactScopeLabel,
  createEmptyChangeItem,
  validateChangeSet,
} from '@/types/smart-test-selection';

interface ChangeSetFormProps {
  changeSet?: ChangeSet;
  onSave: (data: {
    name: string;
    description?: string;
    changes: Omit<ChangeItem, 'id'>[];
    scope: ImpactScope;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
}

export function ChangeSetForm({ changeSet, onSave, onDelete, isLoading }: ChangeSetFormProps) {
  const [name, setName] = useState(changeSet?.name || '');
  const [description, setDescription] = useState(changeSet?.description || '');
  const [scope, setScope] = useState<ImpactScope>(changeSet?.scope || ImpactScope.SINGLE_FEATURE);
  const [changes, setChanges] = useState<Omit<ChangeItem, 'id'>[]>(
    changeSet?.changes.map((c) => ({
      type: c.type,
      name: c.name,
      description: c.description,
      path: c.path,
      severity: c.severity,
      affectedModules: c.affectedModules,
      affectedFeatures: c.affectedFeatures,
      metadata: c.metadata,
    })) || [createEmptyChangeItem()]
  );
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // バリデーション
      const validation = validateChangeSet({
        name,
        description,
        changes,
        scope,
      });

      if (!validation.valid) {
        setErrors(validation.errors);
        return;
      }

      setErrors([]);
      await onSave({
        name,
        description: description || undefined,
        changes,
        scope,
      });
    },
    [name, description, changes, scope, onSave]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {changeSet ? '変更セットを編集' : '新規変更セット'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 名前 */}
          <div>
            <Label htmlFor="name">名前 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="変更セットの名前"
              className="mt-1"
            />
          </div>

          {/* 説明 */}
          <div>
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="変更セットの説明"
              className="mt-1"
              rows={3}
            />
          </div>

          {/* 影響スコープ */}
          <div>
            <Label htmlFor="scope">影響スコープ</Label>
            <Select value={scope} onValueChange={(value) => setScope(value as ImpactScope)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ImpactScope).map((s) => (
                  <SelectItem key={s} value={s}>
                    {getImpactScopeLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 変更項目 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">変更項目</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangeItemEditor items={changes} onChange={setChanges} />
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {errors.length > 0 && (
        <div className="p-4 bg-destructive/10 rounded-lg">
          <p className="text-sm font-medium text-destructive mb-2">入力エラー</p>
          <ul className="text-sm text-destructive list-disc list-inside">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ボタン */}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {changeSet ? '更新' : '作成'}
            </>
          )}
        </Button>

        {changeSet && onDelete && (
          <Button type="button" variant="destructive" onClick={onDelete} disabled={isLoading}>
            <Trash2 className="h-4 w-4 mr-2" />
            削除
          </Button>
        )}
      </div>
    </form>
  );
}

export default ChangeSetForm;
