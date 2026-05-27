'use client';

/**
 * Merge Request Form Component
 *
 * マージリクエスト作成フォーム
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { BranchSelector } from './branch-selector';
import { Branch, BranchType } from '@/types/branch';

interface MergeRequestFormProps {
  branches: Branch[];
  sourceBranchId?: string;
  targetBranchId?: string;
  onSubmit: (data: {
    sourceBranchId: string;
    targetBranchId: string;
    title: string;
    description?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function MergeRequestForm({
  branches,
  sourceBranchId: initialSourceId,
  targetBranchId: initialTargetId,
  onSubmit,
  onCancel,
  isLoading,
}: MergeRequestFormProps) {
  const [sourceBranchId, setSourceBranchId] = useState(initialSourceId || '');
  const [targetBranchId, setTargetBranchId] = useState(initialTargetId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // マスターブランチをデフォルトのターゲットとして設定
  const masterBranch = branches.find((b) => b.type === BranchType.MASTER);

  // ソースブランチから除外するブランチ（ターゲットとマスター以外は可）
  const sourceBranches = branches.filter((b) => b.id !== targetBranchId);

  // ターゲットブランチ（通常はマスターまたはリリースブランチ）
  const targetBranches = branches.filter((b) => b.id !== sourceBranchId);

  // タイトルを自動生成
  const generateTitle = useCallback(() => {
    const source = branches.find((b) => b.id === sourceBranchId);
    const target = branches.find((b) => b.id === targetBranchId);
    if (source && target) {
      setTitle(`Merge ${source.name} into ${target.name}`);
    }
  }, [branches, sourceBranchId, targetBranchId]);

  // ソースブランチ変更時にタイトルを更新
  const handleSourceChange = useCallback(
    (id: string) => {
      setSourceBranchId(id);
      // 初めてターゲットが選択されていない場合はマスターを設定
      if (!targetBranchId && masterBranch) {
        setTargetBranchId(masterBranch.id);
      }
    },
    [targetBranchId, masterBranch]
  );

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!sourceBranchId) {
      setError('ソースブランチを選択してください');
      return;
    }

    if (!targetBranchId) {
      setError('ターゲットブランチを選択してください');
      return;
    }

    if (sourceBranchId === targetBranchId) {
      setError('ソースとターゲットは異なるブランチを選択してください');
      return;
    }

    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    await onSubmit({
      sourceBranchId,
      targetBranchId,
      title: title.trim(),
      description: description.trim() || undefined,
    });
  }, [sourceBranchId, targetBranchId, title, description, onSubmit]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ソースブランチ *</Label>
          <BranchSelector
            branches={sourceBranches}
            selectedBranchId={sourceBranchId}
            onSelect={handleSourceChange}
            placeholder="マージ元を選択"
            disabled={isLoading}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label>ターゲットブランチ *</Label>
          <BranchSelector
            branches={targetBranches}
            selectedBranchId={targetBranchId}
            onSelect={setTargetBranchId}
            placeholder="マージ先を選択"
            disabled={isLoading}
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="title">タイトル *</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={generateTitle}
            disabled={!sourceBranchId || !targetBranchId}
          >
            自動生成
          </Button>
        </div>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="マージリクエストのタイトル"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="変更内容や目的を記述"
          rows={4}
          disabled={isLoading}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !sourceBranchId || !targetBranchId || !title.trim()}
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          作成
        </Button>
      </div>
    </div>
  );
}

export default MergeRequestForm;
