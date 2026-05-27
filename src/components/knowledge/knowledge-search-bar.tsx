'use client';

/**
 * Knowledge Search Bar Component
 *
 * ナレッジグラフ検索バーコンポーネント
 */

import { useState, useCallback } from 'react';
import { Search, Filter, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  KnowledgeNodeType,
  KnowledgeCategory,
  KNOWLEDGE_CATEGORY_INFO,
} from '@/types/knowledge-graph';

// ========================================
// Types
// ========================================

export interface SearchFilters {
  nodeTypes: KnowledgeNodeType[];
  categories: KnowledgeCategory[];
}

export interface KnowledgeSearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  isSearching?: boolean;
  placeholder?: string;
}

// ========================================
// Constants
// ========================================

const NODE_TYPE_OPTIONS: { value: KnowledgeNodeType; label: string }[] = [
  { value: 'TestCase', label: 'テストケース' },
  { value: 'TestStep', label: 'テストステップ' },
  { value: 'Bug', label: 'バグ' },
  { value: 'BestPractice', label: 'ベストプラクティス' },
  { value: 'TestDesignKnowledge', label: 'テスト設計ナレッジ' },
  { value: 'BugCountermeasure', label: 'バグ対策' },
  { value: 'Feature', label: '機能' },
  { value: 'Module', label: 'モジュール' },
  { value: 'Tag', label: 'タグ' },
];

const CATEGORY_OPTIONS: { value: KnowledgeCategory; label: string }[] = [
  { value: 'TEST_ASSET', label: KNOWLEDGE_CATEGORY_INFO.TEST_ASSET.label },
  { value: 'DEFECT', label: KNOWLEDGE_CATEGORY_INFO.DEFECT.label },
  { value: 'BEST_PRACTICE', label: KNOWLEDGE_CATEGORY_INFO.BEST_PRACTICE.label },
  { value: 'DESIGN_KNOWLEDGE', label: KNOWLEDGE_CATEGORY_INFO.DESIGN_KNOWLEDGE.label },
  { value: 'COUNTERMEASURE', label: KNOWLEDGE_CATEGORY_INFO.COUNTERMEASURE.label },
  { value: 'SYSTEM_COMPONENT', label: KNOWLEDGE_CATEGORY_INFO.SYSTEM_COMPONENT.label },
];

// ========================================
// Component
// ========================================

export function KnowledgeSearchBar({
  onSearch,
  isSearching = false,
  placeholder = 'ナレッジを検索...',
}: KnowledgeSearchBarProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    nodeTypes: [],
    categories: [],
  });

  const handleSearch = useCallback(() => {
    if (query.trim() || filters.nodeTypes.length > 0 || filters.categories.length > 0) {
      onSearch(query.trim(), filters);
    }
  }, [query, filters, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const toggleNodeType = (type: KnowledgeNodeType) => {
    setFilters((prev) => ({
      ...prev,
      nodeTypes: prev.nodeTypes.includes(type)
        ? prev.nodeTypes.filter((t) => t !== type)
        : [...prev.nodeTypes, type],
    }));
  };

  const toggleCategory = (category: KnowledgeCategory) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const clearFilters = () => {
    setFilters({ nodeTypes: [], categories: [] });
  };

  const hasFilters = filters.nodeTypes.length > 0 || filters.categories.length > 0;
  const filterCount = filters.nodeTypes.length + filters.categories.length;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-9"
            disabled={isSearching}
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Filter className="h-4 w-4" />
              {filterCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-4 w-4 p-0 text-[10px]"
                >
                  {filterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">フィルター</h4>
                {hasFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-auto p-0 text-xs text-muted-foreground"
                  >
                    クリア
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">カテゴリ</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${option.value}`}
                        checked={filters.categories.includes(option.value)}
                        onCheckedChange={() => toggleCategory(option.value)}
                      />
                      <Label htmlFor={`category-${option.value}`} className="text-xs font-normal">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">ノードタイプ</Label>
                <div className="grid grid-cols-2 gap-2">
                  {NODE_TYPE_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${option.value}`}
                        checked={filters.nodeTypes.includes(option.value)}
                        onCheckedChange={() => toggleNodeType(option.value)}
                      />
                      <Label htmlFor={`type-${option.value}`} className="text-xs font-normal">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : '検索'}
        </Button>
      </div>

      {/* 適用中のフィルター表示 */}
      {hasFilters && (
        <div className="flex flex-wrap gap-1">
          {filters.categories.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggleCategory(category)}
            >
              {CATEGORY_OPTIONS.find((c) => c.value === category)?.label}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
          {filters.nodeTypes.map((type) => (
            <Badge
              key={type}
              variant="outline"
              className="cursor-pointer"
              onClick={() => toggleNodeType(type)}
            >
              {NODE_TYPE_OPTIONS.find((t) => t.value === type)?.label}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
