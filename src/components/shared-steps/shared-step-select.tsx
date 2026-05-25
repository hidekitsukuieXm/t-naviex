'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Share2 } from 'lucide-react';
import type { SharedStep } from '@/types/shared-step';

// ============================================
// Types
// ============================================

interface SharedStepSelectProps {
  projectId: string;
  value?: string;
  onChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Component
// ============================================

export function SharedStepSelect({
  projectId,
  value,
  onChange,
  placeholder = '共有手順を選択',
  disabled,
  className,
}: SharedStepSelectProps) {
  const [sharedSteps, setSharedSteps] = useState<SharedStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadedRef = useRef(false);

  // データ取得
  const fetchSharedSteps = useCallback(async () => {
    if (loadedRef.current) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/shared-steps`);
      if (!response.ok) {
        throw new Error('データの取得に失敗しました。');
      }
      const data = await response.json();
      setSharedSteps(data.sharedSteps);
      loadedRef.current = true;
    } catch (error) {
      console.error('共有手順取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // 選択変更
  const handleValueChange = useCallback(
    (newValue: string) => {
      if (newValue === '__none__') {
        onChange?.(null);
      } else {
        onChange?.(newValue);
      }
    },
    [onChange]
  );

  // 開いた時にデータ取得
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        void fetchSharedSteps();
      }
    },
    [fetchSharedSteps]
  );

  return (
    <Select
      value={value ?? '__none__'}
      onValueChange={handleValueChange}
      onOpenChange={handleOpenChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">
          <span className="text-muted-foreground">共有手順なし</span>
        </SelectItem>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : sharedSteps.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">共有手順がありません</div>
        ) : (
          sharedSteps.map((step) => (
            <SelectItem key={step.id} value={step.id}>
              <span className="flex items-center gap-2">
                <Share2 className="size-4" />
                {step.name}
              </span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
