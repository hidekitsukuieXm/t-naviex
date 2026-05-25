'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileText, FileSpreadsheet, Loader2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// Types
// ============================================

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  includeSteps?: boolean;
  columns?: string[];
}

export interface ExportButtonProps {
  testSpecId: string;
  sectionId?: string | null;
  filters?: {
    priority?: string;
    testType?: string;
    testTechnique?: string;
    isMatrix?: boolean;
    tags?: string[];
    classification?: string;
  };
  disabled?: boolean;
  className?: string;
}

// ============================================
// Column Configuration
// ============================================

const COLUMN_OPTIONS = [
  { key: 'id', label: 'ID', default: true },
  { key: 'testCaseNumber', label: 'テストケース番号', default: true },
  { key: 'referenceId', label: '参照ID', default: false },
  { key: 'title', label: 'タイトル', default: true },
  { key: 'description', label: '説明', default: true },
  { key: 'precondition', label: '事前条件', default: true },
  { key: 'expectedResult', label: '期待結果', default: true },
  { key: 'checkpoint', label: 'チェックポイント', default: false },
  { key: 'scenario', label: 'シナリオ', default: false },
  { key: 'testEnvironment', label: 'テスト環境', default: false },
  { key: 'notes', label: '特記事項', default: false },
  { key: 'priority', label: '優先度', default: true },
  { key: 'testType', label: 'テストタイプ', default: true },
  { key: 'testTechnique', label: 'テスト技法', default: true },
  { key: 'classification', label: '分類', default: false },
  { key: 'estimatedTime', label: '見積時間(分)', default: false },
  { key: 'tags', label: 'タグ', default: true },
  { key: 'sectionName', label: 'セクション名', default: true },
  { key: 'sectionPath', label: 'セクションパス', default: false },
  { key: 'createdAt', label: '作成日時', default: false },
  { key: 'updatedAt', label: '更新日時', default: false },
];

// ============================================
// Component
// ============================================

export function ExportButton({
  testSpecId,
  sectionId,
  filters,
  disabled,
  className,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [includeSteps, setIncludeSteps] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(COLUMN_OPTIONS.filter((c) => c.default).map((c) => c.key))
  );

  // エクスポートURLを構築
  const buildExportUrl = useCallback(
    (format: 'csv' | 'xlsx' | 'json', columns?: string[], withSteps?: boolean) => {
      const params = new URLSearchParams();
      params.set('format', format);

      if (sectionId !== undefined) {
        params.set('sectionId', sectionId === null ? 'null' : sectionId);
      }

      if (filters?.priority) params.set('priority', filters.priority);
      if (filters?.testType) params.set('testType', filters.testType);
      if (filters?.testTechnique) params.set('testTechnique', filters.testTechnique);
      if (filters?.isMatrix !== undefined) params.set('isMatrix', String(filters.isMatrix));
      if (filters?.tags?.length) params.set('tags', filters.tags.join(','));
      if (filters?.classification) params.set('classification', filters.classification);

      if (withSteps !== undefined) params.set('includeSteps', String(withSteps));
      if (columns?.length) params.set('columns', columns.join(','));

      return `/api/test-specs/${testSpecId}/export?${params.toString()}`;
    },
    [testSpecId, sectionId, filters]
  );

  // クイックエクスポート
  const handleQuickExport = useCallback(
    async (format: 'csv' | 'xlsx' | 'json') => {
      setIsExporting(true);
      try {
        const url = buildExportUrl(format);
        const response = await fetch(url);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'エクスポートに失敗しました。');
        }

        if (format === 'json') {
          // JSON形式の場合はダウンロードリンクを作成
          const data = await response.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json',
          });
          downloadBlob(blob, `test_cases_${new Date().toISOString().split('T')[0]}.json`);
        } else {
          // CSV/Excel形式の場合はそのままダウンロード
          const blob = await response.blob();
          const contentDisposition = response.headers.get('Content-Disposition');
          const defaultFilename = format === 'xlsx' ? 'test_cases.xlsx' : 'test_cases.csv';
          const filename = extractFilename(contentDisposition) || defaultFilename;
          downloadBlob(blob, filename);
        }

        toast.success('エクスポートが完了しました。');
      } catch (error) {
        console.error('Export error:', error);
        toast.error(error instanceof Error ? error.message : 'エクスポートに失敗しました。');
      } finally {
        setIsExporting(false);
      }
    },
    [buildExportUrl]
  );

  // カスタムエクスポート
  const handleCustomExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const columns = Array.from(selectedColumns);
      const url = buildExportUrl('csv', columns, includeSteps);
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'エクスポートに失敗しました。');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = extractFilename(contentDisposition) || 'test_cases.csv';
      downloadBlob(blob, filename);

      toast.success('エクスポートが完了しました。');
      setShowOptions(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'エクスポートに失敗しました。');
    } finally {
      setIsExporting(false);
    }
  }, [buildExportUrl, selectedColumns, includeSteps]);

  // カラム選択トグル
  const toggleColumn = useCallback((key: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // 全選択/全解除
  const selectAllColumns = useCallback(() => {
    setSelectedColumns(new Set(COLUMN_OPTIONS.map((c) => c.key)));
  }, []);

  const deselectAllColumns = useCallback(() => {
    // タイトルは必須
    setSelectedColumns(new Set(['title']));
  }, []);

  const resetColumns = useCallback(() => {
    setSelectedColumns(new Set(COLUMN_OPTIONS.filter((c) => c.default).map((c) => c.key)));
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isExporting}
            className={className}
          >
            {isExporting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Download className="mr-2 size-4" />
            )}
            エクスポート
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => void handleQuickExport('xlsx')}>
            <FileSpreadsheet className="mr-2 size-4" />
            Excel形式でエクスポート
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void handleQuickExport('csv')}>
            <FileText className="mr-2 size-4" />
            CSV形式でエクスポート
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void handleQuickExport('json')}>
            <FileText className="mr-2 size-4" />
            JSON形式でエクスポート
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowOptions(true)}>
            <Settings2 className="mr-2 size-4" />
            エクスポート設定...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* エクスポート設定ダイアログ */}
      <Dialog open={showOptions} onOpenChange={setShowOptions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>エクスポート設定</DialogTitle>
            <DialogDescription>
              エクスポートするカラムとオプションを選択してください。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* テスト手順を含める */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeSteps"
                checked={includeSteps}
                onCheckedChange={(checked) => setIncludeSteps(checked === true)}
              />
              <Label htmlFor="includeSteps">テスト手順を含める</Label>
            </div>

            {/* カラム選択 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>エクスポートカラム</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllColumns}>
                    全選択
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllColumns}>
                    全解除
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetColumns}>
                    リセット
                  </Button>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                {COLUMN_OPTIONS.map((col) => (
                  <div key={col.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`col-${col.key}`}
                      checked={selectedColumns.has(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                      disabled={col.key === 'title'} // タイトルは必須
                    />
                    <Label
                      htmlFor={`col-${col.key}`}
                      className={col.key === 'title' ? 'text-muted-foreground' : ''}
                    >
                      {col.label}
                      {col.key === 'title' && (
                        <span className="text-xs text-muted-foreground ml-1">(必須)</span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                選択中: {selectedColumns.size} / {COLUMN_OPTIONS.length} カラム
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOptions(false)}>
              キャンセル
            </Button>
            <Button onClick={() => void handleCustomExport()} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  エクスポート中...
                </>
              ) : (
                <>
                  <Download className="mr-2 size-4" />
                  エクスポート
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================
// Helper Functions
// ============================================

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function extractFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  // filename="xxx.csv" または filename*=UTF-8''xxx.csv
  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (filenameMatch && filenameMatch[1]) {
    let filename = filenameMatch[1].replace(/['"]/g, '');
    // URLエンコードされている場合はデコード
    try {
      filename = decodeURIComponent(filename);
    } catch {
      // デコードに失敗した場合はそのまま使用
    }
    return filename;
  }

  return null;
}
