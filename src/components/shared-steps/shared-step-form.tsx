'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { SharedStep, CreateSharedStepInput, UpdateSharedStepInput } from '@/types/shared-step';

// ============================================
// Types
// ============================================

interface SharedStepFormProps {
  sharedStep?: SharedStep;
  onSubmit: (data: CreateSharedStepInput | UpdateSharedStepInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// ============================================
// Component
// ============================================

export function SharedStepForm({ sharedStep, onSubmit, onCancel, isLoading }: SharedStepFormProps) {
  const [name, setName] = useState(sharedStep?.name ?? '');
  const [description, setDescription] = useState(sharedStep?.description ?? '');
  const [contentMd, setContentMd] = useState(sharedStep?.contentMd ?? '');
  const [sortOrder, setSortOrder] = useState(sharedStep?.sortOrder ?? 0);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const data: CreateSharedStepInput | UpdateSharedStepInput = {
        name: name.trim(),
        description: description.trim() || null,
        contentMd: contentMd.trim(),
        sortOrder,
      };

      await onSubmit(data);
    },
    [name, description, contentMd, sortOrder, onSubmit]
  );

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">共有手順名 *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="共有手順名"
            required
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sortOrder">並び順</Label>
          <Input
            id="sortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            min={0}
            max={9999}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="この共有手順の説明"
          rows={2}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contentMd">手順内容 * (Markdown)</Label>
        <Textarea
          id="contentMd"
          value={contentMd}
          onChange={(e) => setContentMd(e.target.value)}
          placeholder="共有するテスト手順の内容（Markdown形式）"
          rows={10}
          required
          disabled={isLoading}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading || !name.trim() || !contentMd.trim()}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {sharedStep ? '更新' : '作成'}
        </Button>
      </div>
    </form>
  );
}
