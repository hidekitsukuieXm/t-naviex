'use client';

import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import {
  type CatalogItemType,
  type CatalogItemStatus,
  CATALOG_ITEM_TYPE_INFO,
  CATALOG_ITEM_STATUS_INFO,
  CATALOG_ITEM_TYPES,
  CATALOG_ITEM_STATUSES,
} from '@/types/catalog-item';

export interface CatalogFormData {
  name: string;
  description: string;
  type: CatalogItemType;
  status: CatalogItemStatus;
  category: string;
  content: string;
  version: string;
}

interface CatalogFormProps {
  initialData?: Partial<CatalogFormData>;
  onSubmit: (data: CatalogFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  categories?: string[];
}

export function CatalogForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = '保存',
  categories = [],
}: CatalogFormProps) {
  const [formData, setFormData] = useState<CatalogFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    type: initialData?.type || 'TEST_CASE',
    status: initialData?.status || 'DRAFT',
    category: initialData?.category || '',
    content: initialData?.content || '',
    version: initialData?.version || '1.0.0',
  });
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('名前は必須です');
      return;
    }
    if (!formData.content.trim()) {
      setError('内容は必須です');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value === '__new__') {
      // Will be handled by newCategory input
      return;
    }
    setFormData({ ...formData, category: value });
  };

  const handleAddNewCategory = () => {
    if (newCategory.trim()) {
      setFormData({ ...formData, category: newCategory.trim() });
      setNewCategory('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">
          名前 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="カタログアイテム名"
          disabled={isLoading}
          maxLength={255}
        />
        <p className="text-xs text-muted-foreground">{formData.name.length}/255</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">タイプ</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value as CatalogItemType })}
            disabled={isLoading}
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATALOG_ITEM_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {CATALOG_ITEM_TYPE_INFO[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">ステータス</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value as CatalogItemStatus })
            }
            disabled={isLoading}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATALOG_ITEM_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {CATALOG_ITEM_STATUS_INFO[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">カテゴリ</Label>
        <div className="flex gap-2">
          <Select
            value={formData.category || ''}
            onValueChange={handleCategoryChange}
            disabled={isLoading}
          >
            <SelectTrigger id="category" className="flex-1">
              <SelectValue placeholder="カテゴリを選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">なし</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="新しいカテゴリ"
            disabled={isLoading}
            maxLength={100}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddNewCategory}
            disabled={isLoading || !newCategory.trim()}
          >
            追加
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="カタログアイテムの説明"
          disabled={isLoading}
          rows={3}
          maxLength={10000}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">
          内容 <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="カタログアイテムの内容（Markdown対応）"
          disabled={isLoading}
          rows={10}
          maxLength={100000}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">{formData.content.length}/100000</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="version">バージョン</Label>
        <Input
          id="version"
          value={formData.version}
          onChange={(e) => setFormData({ ...formData, version: e.target.value })}
          placeholder="1.0.0"
          disabled={isLoading}
          maxLength={20}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
