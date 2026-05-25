'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  type TestCasePriority,
  type TestType,
  type TestTechnique,
  type TestCaseFilterState,
  PRIORITY_LABELS,
  TEST_TYPE_LABELS,
  TEST_TECHNIQUE_LABELS,
} from '@/types/test-case';
import { Filter, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface TestCaseFilterPanelProps {
  filters: TestCaseFilterState;
  onFilterChange: (filters: TestCaseFilterState) => void;
  availableTags?: string[];
  className?: string;
}

// ============================================
// Default State
// ============================================

export const DEFAULT_FILTER_STATE: TestCaseFilterState = {
  query: '',
  priority: 'all',
  testType: 'all',
  testTechnique: 'all',
  tags: [],
  classification: '',
  isMatrix: 'all',
};

// ============================================
// Helper Functions
// ============================================

/**
 * フィルターがアクティブかどうかを判定
 */
export function hasActiveFilters(filters: TestCaseFilterState): boolean {
  return (
    filters.query !== '' ||
    filters.priority !== 'all' ||
    filters.testType !== 'all' ||
    filters.testTechnique !== 'all' ||
    filters.tags.length > 0 ||
    filters.classification !== '' ||
    filters.isMatrix !== 'all'
  );
}

/**
 * アクティブなフィルター数をカウント
 */
export function countActiveFilters(filters: TestCaseFilterState): number {
  let count = 0;
  if (filters.query !== '') count++;
  if (filters.priority !== 'all') count++;
  if (filters.testType !== 'all') count++;
  if (filters.testTechnique !== 'all') count++;
  if (filters.tags.length > 0) count++;
  if (filters.classification !== '') count++;
  if (filters.isMatrix !== 'all') count++;
  return count;
}

// ============================================
// Component
// ============================================

export function TestCaseFilterPanel({
  filters,
  onFilterChange,
  availableTags = [],
  className,
}: TestCaseFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const activeFilterCount = countActiveFilters(filters);

  const handleClearAll = useCallback(() => {
    onFilterChange(DEFAULT_FILTER_STATE);
  }, [onFilterChange]);

  const handleQueryChange = useCallback(
    (value: string) => {
      onFilterChange({ ...filters, query: value });
    },
    [filters, onFilterChange]
  );

  const handlePriorityChange = useCallback(
    (value: string) => {
      onFilterChange({
        ...filters,
        priority: value as TestCasePriority | 'all',
      });
    },
    [filters, onFilterChange]
  );

  const handleTestTypeChange = useCallback(
    (value: string) => {
      onFilterChange({
        ...filters,
        testType: value as TestType | 'all',
      });
    },
    [filters, onFilterChange]
  );

  const handleTestTechniqueChange = useCallback(
    (value: string) => {
      onFilterChange({
        ...filters,
        testTechnique: value as TestTechnique | 'all',
      });
    },
    [filters, onFilterChange]
  );

  const handleClassificationChange = useCallback(
    (value: string) => {
      onFilterChange({ ...filters, classification: value });
    },
    [filters, onFilterChange]
  );

  const handleIsMatrixChange = useCallback(
    (value: string) => {
      let isMatrixValue: boolean | 'all' = 'all';
      if (value === 'true') isMatrixValue = true;
      else if (value === 'false') isMatrixValue = false;
      onFilterChange({ ...filters, isMatrix: isMatrixValue });
    },
    [filters, onFilterChange]
  );

  const handleAddTag = useCallback(
    (tag: string) => {
      const trimmedTag = tag.trim();
      if (trimmedTag && !filters.tags.includes(trimmedTag)) {
        onFilterChange({
          ...filters,
          tags: [...filters.tags, trimmedTag],
        });
      }
      setTagInput('');
    },
    [filters, onFilterChange]
  );

  const handleRemoveTag = useCallback(
    (tag: string) => {
      onFilterChange({
        ...filters,
        tags: filters.tags.filter((t) => t !== tag),
      });
    },
    [filters, onFilterChange]
  );

  const handleTagInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag(tagInput);
      }
    },
    [tagInput, handleAddTag]
  );

  return (
    <div className={cn('space-y-3', className)}>
      {/* 検索バー + フィルターボタン */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="タイトルで検索..."
            value={filters.query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* クイックフィルター: 優先度 */}
          <Select value={filters.priority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="優先度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              {(Object.entries(PRIORITY_LABELS) as [TestCasePriority, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          {/* クイックフィルター: テストタイプ */}
          <Select value={filters.testType} onValueChange={handleTestTypeChange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="テストタイプ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              {(Object.entries(TEST_TYPE_LABELS) as [TestType, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 詳細フィルターボタン */}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger
              className={cn(
                'relative inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            >
              <Filter className="mr-2 size-4" />
              詳細フィルター
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 size-5 justify-center rounded-full p-0 text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">フィルター条件</h4>
                  {hasActiveFilters(filters) && (
                    <Button variant="ghost" size="sm" onClick={handleClearAll}>
                      <X className="mr-1 size-3" />
                      クリア
                    </Button>
                  )}
                </div>

                {/* テスト技法 */}
                <div className="space-y-2">
                  <Label>テスト技法</Label>
                  <Select value={filters.testTechnique} onValueChange={handleTestTechniqueChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="テスト技法を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全て</SelectItem>
                      {(Object.entries(TEST_TECHNIQUE_LABELS) as [TestTechnique, string][]).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* 分類 */}
                <div className="space-y-2">
                  <Label>分類</Label>
                  <Input
                    placeholder="分類で検索..."
                    value={filters.classification}
                    onChange={(e) => handleClassificationChange(e.target.value)}
                  />
                </div>

                {/* タグ */}
                <div className="space-y-2">
                  <Label>タグ</Label>
                  <div className="flex flex-wrap gap-1 min-h-[28px]">
                    {filters.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 rounded-full hover:bg-muted"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="タグを追加..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTag(tagInput)}
                      disabled={!tagInput.trim()}
                    >
                      追加
                    </Button>
                  </div>
                  {availableTags.length > 0 && (
                    <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between">
                          既存のタグから選択
                          {isAdvancedOpen ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                          {availableTags
                            .filter((tag) => !filters.tags.includes(tag))
                            .map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="cursor-pointer hover:bg-muted"
                                onClick={() => handleAddTag(tag)}
                              >
                                {tag}
                              </Badge>
                            ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>

                {/* マトリクス */}
                <div className="space-y-2">
                  <Label>マトリクステスト</Label>
                  <Select
                    value={filters.isMatrix === 'all' ? 'all' : filters.isMatrix ? 'true' : 'false'}
                    onValueChange={handleIsMatrixChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="マトリクステスト" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全て</SelectItem>
                      <SelectItem value="true">マトリクスのみ</SelectItem>
                      <SelectItem value="false">通常のみ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* クリアボタン（フィルターがある場合） */}
          {hasActiveFilters(filters) && (
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              <X className="mr-1 size-4" />
              クリア
            </Button>
          )}
        </div>
      </div>

      {/* アクティブフィルター表示 */}
      {hasActiveFilters(filters) && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>フィルター中:</span>
          {filters.query && (
            <Badge variant="secondary" className="gap-1">
              検索: {filters.query}
              <button
                type="button"
                onClick={() => handleQueryChange('')}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {filters.priority !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              優先度: {PRIORITY_LABELS[filters.priority]}
              <button
                type="button"
                onClick={() => handlePriorityChange('all')}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {filters.testType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              タイプ: {TEST_TYPE_LABELS[filters.testType]}
              <button
                type="button"
                onClick={() => handleTestTypeChange('all')}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {filters.testTechnique !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              技法: {TEST_TECHNIQUE_LABELS[filters.testTechnique]}
              <button
                type="button"
                onClick={() => handleTestTechniqueChange('all')}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {filters.classification && (
            <Badge variant="secondary" className="gap-1">
              分類: {filters.classification}
              <button
                type="button"
                onClick={() => handleClassificationChange('')}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {filters.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              タグ: {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          {filters.isMatrix !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.isMatrix ? 'マトリクスのみ' : '通常のみ'}
              <button
                type="button"
                onClick={() => handleIsMatrixChange('all')}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
