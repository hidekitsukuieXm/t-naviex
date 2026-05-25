'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  type TestCaseSearchResult,
  type FullTextSearchResponse,
  type SearchableField,
  SEARCHABLE_FIELD_LABELS,
  ALL_SEARCHABLE_FIELDS,
  PRIORITY_LABELS,
  TEST_TYPE_LABELS,
  type TestCasePriority,
} from '@/types/test-case';
import {
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface TestCaseSearchDialogProps {
  testSpecId: string;
  trigger?: React.ReactNode;
  onSelectTestCase?: (testCaseId: string) => void;
}

// ============================================
// Priority Badge
// ============================================

const PRIORITY_COLORS: Record<TestCasePriority, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
};

const PRIORITY_ICONS: Record<TestCasePriority, React.ReactNode> = {
  CRITICAL: <AlertCircle className="size-3" />,
  HIGH: <AlertTriangle className="size-3" />,
  MEDIUM: <CheckCircle2 className="size-3" />,
  LOW: <Info className="size-3" />,
};

// ============================================
// Search Result Item
// ============================================

interface SearchResultItemProps {
  result: TestCaseSearchResult;
  onSelect?: (testCaseId: string) => void;
}

function SearchResultItem({ result, onSelect }: SearchResultItemProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors hover:bg-muted/50',
        onSelect && 'cursor-pointer'
      )}
      onClick={() => onSelect?.(result.id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{result.title}</h4>
            <Badge variant="outline" className="text-xs">
              スコア: {result.rank}
            </Badge>
          </div>

          {/* Highlights */}
          {result.highlights.length > 0 && (
            <div className="space-y-1">
              {result.highlights.map((highlight, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium text-muted-foreground">
                    {SEARCHABLE_FIELD_LABELS[highlight.field]}:
                  </span>{' '}
                  <span
                    className="text-foreground"
                    dangerouslySetInnerHTML={{ __html: highlight.snippet }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                PRIORITY_COLORS[result.priority]
              )}
            >
              {PRIORITY_ICONS[result.priority]}
              {PRIORITY_LABELS[result.priority]}
            </span>
            <span>{TEST_TYPE_LABELS[result.testType]}</span>
            {result.tags.length > 0 && (
              <div className="flex gap-1">
                {result.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {result.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{result.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {onSelect && (
          <Button variant="ghost" size="sm">
            <ExternalLink className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function TestCaseSearchDialog({
  testSpecId,
  trigger,
  onSelectTestCase,
}: TestCaseSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFields, setSearchFields] = useState<SearchableField[]>([...ALL_SEARCHABLE_FIELDS]);
  const [results, setResults] = useState<TestCaseSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFieldsOpen, setIsFieldsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevOpenRef = useRef(open);
  const limit = 10;

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Handle dialog open/close state changes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    // Reset state when closing
    if (!newOpen && prevOpenRef.current) {
      setQuery('');
      setResults([]);
      setError(null);
      setTotalResults(0);
      setCurrentPage(1);
      setTotalPages(1);
    }
    prevOpenRef.current = newOpen;
    setOpen(newOpen);
  }, []);

  const handleSearch = useCallback(
    async (searchQuery: string, page: number = 1) => {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery.length < 2) {
        setResults([]);
        setTotalResults(0);
        setTotalPages(1);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('query', trimmedQuery);
        params.set('page', page.toString());
        params.set('limit', limit.toString());
        if (searchFields.length > 0 && searchFields.length < ALL_SEARCHABLE_FIELDS.length) {
          params.set('fields', searchFields.join(','));
        }

        const response = await fetch(
          `/api/test-specs/${testSpecId}/cases/search?${params.toString()}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '検索に失敗しました。');
        }

        const data: FullTextSearchResponse = await response.json();
        setResults(data.results);
        setTotalResults(data.total);
        setTotalPages(data.totalPages);
        setCurrentPage(page);
      } catch (err) {
        setError(err instanceof Error ? err.message : '検索に失敗しました。');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [testSpecId, searchFields]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        void handleSearch(query, 1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const handleFieldToggle = useCallback((field: SearchableField, checked: boolean) => {
    setSearchFields((prev) => {
      if (checked) {
        return [...prev, field];
      } else {
        return prev.filter((f) => f !== field);
      }
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSearchFields([...ALL_SEARCHABLE_FIELDS]);
  }, []);

  const handleSelectNone = useCallback(() => {
    setSearchFields(['title']); // Keep at least title
  }, []);

  const handleSelectTestCase = useCallback(
    (testCaseId: string) => {
      onSelectTestCase?.(testCaseId);
      setOpen(false);
    },
    [onSelectTestCase]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Search className="mr-2 size-4" />
            全文検索
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>テストケース全文検索</DialogTitle>
          <DialogDescription>テストケースの全フィールドを横断的に検索します。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="検索キーワードを入力... (2文字以上)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Search Fields */}
          <Collapsible open={isFieldsOpen} onOpenChange={setIsFieldsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                検索対象フィールド ({searchFields.length}/{ALL_SEARCHABLE_FIELDS.length})
                {isFieldsOpen ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    すべて選択
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSelectNone}>
                    タイトルのみ
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_SEARCHABLE_FIELDS.map((field) => (
                    <div key={field} className="flex items-center gap-2">
                      <Checkbox
                        id={`field-${field}`}
                        checked={searchFields.includes(field)}
                        onCheckedChange={(checked) => handleFieldToggle(field, !!checked)}
                        disabled={field === 'title' && searchFields.length === 1}
                      />
                      <Label htmlFor={`field-${field}`} className="text-sm cursor-pointer">
                        {SEARCHABLE_FIELD_LABELS[field]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Results */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="py-12 text-center text-destructive">{error}</div>
            ) : query.trim().length < 2 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="mb-4 size-12" />
                <p>2文字以上のキーワードを入力してください。</p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="mb-4 size-12" />
                <p>検索結果がありません。</p>
                <p className="text-sm mt-1">別のキーワードで試してください。</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{totalResults}件の検索結果</span>
                  {totalPages > 1 && (
                    <span>
                      {currentPage} / {totalPages} ページ
                    </span>
                  )}
                </div>
                <div className="h-[400px] overflow-y-auto">
                  <div className="space-y-2 pr-4">
                    {results.map((result) => (
                      <SearchResultItem
                        key={result.id}
                        result={result}
                        onSelect={onSelectTestCase ? handleSelectTestCase : undefined}
                      />
                    ))}
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSearch(query, currentPage - 1)}
                      disabled={currentPage === 1 || isLoading}
                    >
                      前へ
                    </Button>
                    <span className="text-sm">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSearch(query, currentPage + 1)}
                      disabled={currentPage === totalPages || isLoading}
                    >
                      次へ
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
