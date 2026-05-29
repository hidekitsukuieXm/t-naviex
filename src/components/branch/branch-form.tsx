'use client';

/**
 * Branch Form Component
 *
 * ブランチ作成・編集フォーム
 */

import { useState, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { Branch, BranchType, getBranchTypeLabel, validateBranchName } from '@/types/branch';

interface BranchFormProps {
  branch?: Branch;
  parentBranches?: Branch[];
  onSave: (data: {
    name: string;
    description?: string;
    type: BranchType;
    parentBranchId?: string;
    copyTestCases?: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BranchForm({
  branch,
  parentBranches = [],
  onSave,
  onCancel,
  isLoading,
}: BranchFormProps) {
  const [name, setName] = useState(branch?.name || '');
  const [description, setDescription] = useState(branch?.description || '');
  const [type, setType] = useState<BranchType>(branch?.type || BranchType.FEATURE);
  const [parentBranchId, setParentBranchId] = useState(branch?.parentBranchId || '');
  const [copyTestCases, setCopyTestCases] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!branch;

  const handleSubmit = useCallback(async () => {
    setError(null);

    const validation = validateBranchName(name);
    if (!validation.valid) {
      setError(validation.errors[0] || 'ブランチ名が無効です');
      return;
    }

    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      parentBranchId: parentBranchId || undefined,
      copyTestCases: !isEditing && copyTestCases && !!parentBranchId,
    });
  }, [name, description, type, parentBranchId, copyTestCases, isEditing, onSave]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">ブランチ名 *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="feature/new-feature"
          disabled={isLoading}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="このブランチの目的や内容を記述"
          rows={3}
          disabled={isLoading}
        />
      </div>

      {!isEditing && (
        <>
          <div className="space-y-2">
            <Label htmlFor="type">ブランチタイプ *</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as BranchType)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="タイプを選択" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(BranchType)
                  .filter((t) => t !== BranchType.MASTER) // MASTERは選択不可
                  .map((t) => (
                    <SelectItem key={t} value={t}>
                      {getBranchTypeLabel(t)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentBranch">親ブランチ</Label>
            <Select value={parentBranchId} onValueChange={setParentBranchId} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="親ブランチを選択（任意）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">なし</SelectItem>
                {parentBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {parentBranchId && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="copyTestCases"
                checked={copyTestCases}
                onCheckedChange={(checked) => setCopyTestCases(checked === true)}
                disabled={isLoading}
              />
              <Label htmlFor="copyTestCases" className="text-sm font-normal">
                親ブランチのテストケースをコピーする
              </Label>
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          キャンセル
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading || !name.trim()}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? '更新' : '作成'}
        </Button>
      </div>
    </div>
  );
}

export default BranchForm;
