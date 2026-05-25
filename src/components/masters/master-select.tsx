'use client';

import { useState, useCallback, startTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MasterItem, MasterType } from '@/types/master';
import { MASTER_TYPE_LABELS } from '@/types/master';

// ============================================
// Types
// ============================================

interface MasterSelectProps {
  projectId: string;
  masterType: MasterType;
  value?: string;
  onChange?: (code: string) => void;
  disabled?: boolean;
  placeholder?: string;
  includeEmpty?: boolean;
  emptyLabel?: string;
}

// ============================================
// Component
// ============================================

export function MasterSelect({
  projectId,
  masterType,
  value,
  onChange,
  disabled = false,
  placeholder,
  includeEmpty = false,
  emptyLabel = '未選択',
}: MasterSelectProps) {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string>('');

  const label = MASTER_TYPE_LABELS[masterType];
  const currentKey = `${projectId}-${masterType}`;

  // データ取得
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/masters/${masterType}?activeOnly=true&initialize=true`
      );
      if (response.ok) {
        const data = await response.json();
        startTransition(() => {
          setItems(data.items);
          setLoadedKey(`${projectId}-${masterType}`);
        });

        // デフォルト値を設定
        if (!value && data.items.length > 0 && onChange) {
          const defaultItem = data.items.find((item: MasterItem) => item.isDefault);
          if (defaultItem) {
            onChange(defaultItem.code);
          }
        }
      }
    } catch (error) {
      console.error(`${label}取得エラー:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, masterType, label, value, onChange]);

  // セレクトが開かれた時、または初回表示時にデータを取得
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && currentKey !== loadedKey) {
        void fetchItems();
      }
    },
    [fetchItems, currentKey, loadedKey]
  );

  // 初回マウント時にデータを取得（Select が開かれる前に選択肢を用意）
  const handleTriggerClick = useCallback(() => {
    if (currentKey !== loadedKey && !isLoading) {
      void fetchItems();
    }
  }, [currentKey, loadedKey, isLoading, fetchItems]);

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || isLoading}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger onClick={handleTriggerClick}>
        <SelectValue
          placeholder={isLoading ? '読み込み中...' : (placeholder ?? `${label}を選択`)}
        />
      </SelectTrigger>
      <SelectContent>
        {includeEmpty && <SelectItem value="">{emptyLabel}</SelectItem>}
        {items.map((item) => (
          <SelectItem key={item.id} value={item.code}>
            {item.name}
            {item.isDefault && ' (デフォルト)'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
