'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import type { FieldMapping } from '@/lib/import';
import { TARGET_FIELDS } from '@/lib/import';

// ============================================
// Types
// ============================================

interface AutoMapping {
  csvHeader: string;
  targetField: string;
}

interface StepColumnInfo {
  maxSteps: number;
  stepMappings: Array<{ stepNo: number; actionHeader: string; expectedHeader?: string }>;
}

interface PreviewResult {
  headers: string[];
  preview: string[][];
  totalRows: number;
  autoMappings: AutoMapping[];
  stepColumns: StepColumnInfo;
  parseErrors: Array<{ line: number; message: string }>;
  fileType?: 'csv' | 'excel';
  sheetName?: string;
  availableSheets?: string[];
}

interface ValidationResult {
  validCount: number;
  invalidCount: number;
  totalCount: number;
  validationResults: Array<{
    row: number;
    valid: boolean;
    errors: Array<{ field: string; message: string }>;
    data?: { title?: string; sectionName?: string };
  }>;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; errors: Array<{ field: string; message: string }> }>;
  createdIds: string[];
}

export interface ImportButtonProps {
  testSpecId: string;
  sectionId?: string | null;
  disabled?: boolean;
  className?: string;
  onImportComplete?: (result: ImportResult) => void;
}

type ImportStep = 'upload' | 'mapping' | 'validate' | 'importing' | 'complete';

// ============================================
// Component
// ============================================

export function ImportButton({
  testSpecId,
  sectionId,
  disabled,
  className,
  onImportComplete,
}: ImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ダイアログを閉じるときにリセット
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setStep('upload');
    setFile(null);
    setPreviewResult(null);
    setMappings([]);
    setValidationResult(null);
    setImportResult(null);
    setSelectedSheet(null);
  }, []);

  // ファイル選択
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      setFile(selectedFile);
      setIsLoading(true);

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('action', 'preview');

        const response = await fetch(`/api/test-specs/${testSpecId}/import`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'ファイルの解析に失敗しました。');
        }

        const result: PreviewResult = await response.json();
        setPreviewResult(result);

        // 自動マッピングを設定
        setMappings(
          result.autoMappings.map((m) => ({
            csvHeader: m.csvHeader,
            targetField: m.targetField,
          }))
        );

        // Excelファイルの場合はシート名を設定
        if (result.sheetName) {
          setSelectedSheet(result.sheetName);
        }

        setStep('mapping');
      } catch (error) {
        console.error('File preview error:', error);
        toast.error(error instanceof Error ? error.message : 'ファイルの解析に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    },
    [testSpecId]
  );

  // シート変更（Excelファイルの場合）
  const handleSheetChange = useCallback(
    async (sheetName: string) => {
      if (!file || !previewResult) return;

      setSelectedSheet(sheetName);
      setIsLoading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('action', 'preview');
        formData.append('sheetName', sheetName);

        const response = await fetch(`/api/test-specs/${testSpecId}/import`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'シートの読み込みに失敗しました。');
        }

        const result: PreviewResult = await response.json();
        setPreviewResult(result);

        // 自動マッピングを再設定
        setMappings(
          result.autoMappings.map((m) => ({
            csvHeader: m.csvHeader,
            targetField: m.targetField,
          }))
        );
      } catch (error) {
        console.error('Sheet change error:', error);
        toast.error(error instanceof Error ? error.message : 'シートの読み込みに失敗しました。');
      } finally {
        setIsLoading(false);
      }
    },
    [file, previewResult, testSpecId]
  );

  // マッピング変更
  const handleMappingChange = useCallback((csvHeader: string, targetField: string) => {
    setMappings((prev) => {
      const existing = prev.find((m) => m.csvHeader === csvHeader);
      if (existing) {
        if (targetField === '_none') {
          return prev.filter((m) => m.csvHeader !== csvHeader);
        }
        return prev.map((m) => (m.csvHeader === csvHeader ? { ...m, targetField } : m));
      }
      if (targetField !== '_none') {
        return [...prev, { csvHeader, targetField }];
      }
      return prev;
    });
  }, []);

  // バリデーション実行
  const handleValidate = useCallback(async () => {
    if (!file || !previewResult) return;

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'validate');
      formData.append('mappings', JSON.stringify(mappings));
      if (selectedSheet) {
        formData.append('sheetName', selectedSheet);
      }

      const response = await fetch(`/api/test-specs/${testSpecId}/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'バリデーションに失敗しました。');
      }

      const result: ValidationResult = await response.json();
      setValidationResult(result);
      setStep('validate');
    } catch (error) {
      console.error('Validation error:', error);
      toast.error(error instanceof Error ? error.message : 'バリデーションに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [file, previewResult, mappings, testSpecId, selectedSheet]);

  // インポート実行
  const handleImport = useCallback(async () => {
    if (!file || !validationResult || validationResult.validCount === 0) return;

    setIsLoading(true);
    setStep('importing');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'import');
      formData.append('mappings', JSON.stringify(mappings));
      if (sectionId !== undefined) {
        formData.append('sectionId', sectionId === null ? 'null' : sectionId);
      }
      if (selectedSheet) {
        formData.append('sheetName', selectedSheet);
      }

      const response = await fetch(`/api/test-specs/${testSpecId}/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'インポートに失敗しました。');
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      setStep('complete');

      if (result.success > 0) {
        toast.success(`${result.success}件のテストケースをインポートしました。`);
      }

      onImportComplete?.(result);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'インポートに失敗しました。');
      setStep('validate');
    } finally {
      setIsLoading(false);
    }
  }, [file, validationResult, mappings, sectionId, testSpecId, onImportComplete, selectedSheet]);

  // 現在のマッピング状態を取得
  const getMappingForHeader = useCallback(
    (csvHeader: string): string => {
      const mapping = mappings.find((m) => m.csvHeader === csvHeader);
      return mapping?.targetField || '_none';
    },
    [mappings]
  );

  // 使用済みのターゲットフィールドを取得
  const usedTargetFields = mappings.map((m) => m.targetField);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        className={className}
        onClick={() => setIsOpen(true)}
      >
        <Upload className="mr-2 size-4" />
        インポート
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>テストケースのインポート</DialogTitle>
            <DialogDescription>
              {step === 'upload' && 'CSVまたはExcelファイルを選択してください。'}
              {step === 'mapping' && 'カラムとフィールドのマッピングを確認してください。'}
              {step === 'validate' && 'インポート内容を確認してください。'}
              {step === 'importing' && 'インポート中...'}
              {step === 'complete' && 'インポートが完了しました。'}
            </DialogDescription>
          </DialogHeader>

          {/* アップロードステップ */}
          {step === 'upload' && (
            <div className="flex-1 flex flex-col items-center justify-center py-8">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.xlsm"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              >
                {isLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">解析中...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="size-6 text-muted-foreground" />
                      <FileSpreadsheet className="size-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      クリックしてCSVまたはExcelファイルを選択
                    </p>
                    <p className="text-xs text-muted-foreground">
                      対応形式: .csv, .xlsx, .xls, .xlsm（最大10MB）
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* マッピングステップ */}
          {step === 'mapping' && previewResult && (
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {previewResult.fileType === 'excel' ? (
                  <FileSpreadsheet className="size-4" />
                ) : (
                  <FileText className="size-4" />
                )}
                <span>{file?.name}</span>
                <Badge variant="secondary">{previewResult.totalRows}行</Badge>
                {previewResult.stepColumns.maxSteps > 0 && (
                  <Badge variant="outline">
                    手順: 最大{previewResult.stepColumns.maxSteps}ステップ
                  </Badge>
                )}
              </div>

              {/* Excelシート選択 */}
              {previewResult.fileType === 'excel' &&
                previewResult.availableSheets &&
                previewResult.availableSheets.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">シート:</Label>
                    <Select value={selectedSheet || ''} onValueChange={handleSheetChange}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="シートを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {previewResult.availableSheets.map((sheet) => (
                          <SelectItem key={sheet} value={sheet}>
                            {sheet}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              {previewResult.parseErrors.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 text-sm font-medium">
                    <AlertCircle className="size-4" />
                    パース警告
                  </div>
                  <ul className="mt-1 text-xs text-yellow-600 dark:text-yellow-500">
                    {previewResult.parseErrors.slice(0, 3).map((err, i) => (
                      <li key={i}>
                        行 {err.line}: {err.message}
                      </li>
                    ))}
                    {previewResult.parseErrors.length > 3 && (
                      <li>他 {previewResult.parseErrors.length - 3} 件の警告</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex-1 min-h-0">
                <Label className="text-sm font-medium">フィールドマッピング</Label>
                <ScrollArea className="h-[300px] mt-2 border rounded-lg p-3">
                  <div className="space-y-3">
                    {previewResult.headers.map((header) => {
                      // 手順カラムはスキップ
                      const isStepColumn = previewResult.stepColumns.stepMappings.some(
                        (s) => s.actionHeader === header || s.expectedHeader === header
                      );
                      if (isStepColumn) return null;

                      const currentMapping = getMappingForHeader(header);

                      return (
                        <div key={header} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{header}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {previewResult.preview[0]?.[previewResult.headers.indexOf(header)] ||
                                '(空)'}
                            </p>
                          </div>
                          <Select
                            value={currentMapping}
                            onValueChange={(value) => handleMappingChange(header, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="マッピングなし" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">マッピングなし</SelectItem>
                              {TARGET_FIELDS.map((field) => (
                                <SelectItem
                                  key={field.key}
                                  value={field.key}
                                  disabled={
                                    usedTargetFields.includes(field.key) &&
                                    currentMapping !== field.key
                                  }
                                >
                                  {field.label}
                                  {field.required && ' *'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {previewResult.stepColumns.maxSteps > 0 && (
                <div className="text-sm text-muted-foreground">
                  <p>検出されたテスト手順カラム:</p>
                  <ul className="list-disc list-inside text-xs mt-1">
                    {previewResult.stepColumns.stepMappings.map((s) => (
                      <li key={s.stepNo}>
                        手順{s.stepNo}: {s.actionHeader}
                        {s.expectedHeader && `, ${s.expectedHeader}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* バリデーションステップ */}
          {step === 'validate' && validationResult && (
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <span className="text-sm">{validationResult.validCount} 件成功</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="size-4 text-red-600" />
                  <span className="text-sm">{validationResult.invalidCount} 件エラー</span>
                </div>
              </div>

              {validationResult.invalidCount > 0 && (
                <ScrollArea className="flex-1 min-h-0 max-h-[300px] border rounded-lg">
                  <div className="p-3 space-y-2">
                    {validationResult.validationResults
                      .filter((r) => !r.valid)
                      .map((r) => (
                        <div
                          key={r.row}
                          className="text-sm bg-red-50 dark:bg-red-950/20 rounded-lg p-2"
                        >
                          <p className="font-medium text-red-600 dark:text-red-400">行 {r.row}</p>
                          <ul className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {r.errors.map((err, i) => (
                              <li key={i}>
                                {err.field}: {err.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              )}

              {validationResult.validCount > 0 && (
                <div className="text-sm text-muted-foreground">
                  <p>インポートされるテストケース（先頭5件）:</p>
                  <ul className="list-disc list-inside text-xs mt-1">
                    {validationResult.validationResults
                      .filter((r) => r.valid)
                      .slice(0, 5)
                      .map((r) => (
                        <li key={r.row}>
                          行 {r.row}: {r.data?.title || '(タイトルなし)'}
                          {r.data?.sectionName && ` [${r.data.sectionName}]`}
                        </li>
                      ))}
                    {validationResult.validCount > 5 && (
                      <li>他 {validationResult.validCount - 5} 件</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* インポート中ステップ */}
          {step === 'importing' && (
            <div className="flex-1 flex flex-col items-center justify-center py-8">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">インポート中...</p>
            </div>
          )}

          {/* 完了ステップ */}
          {step === 'complete' && importResult && (
            <div className="flex-1 flex flex-col items-center justify-center py-8 gap-4">
              <CheckCircle2 className="size-12 text-green-600" />
              <div className="text-center">
                <p className="text-lg font-medium">インポート完了</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {importResult.success} 件のテストケースをインポートしました。
                </p>
                {importResult.failed > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    {importResult.failed} 件はエラーのためスキップされました。
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {step === 'upload' && (
              <Button variant="outline" onClick={handleClose}>
                キャンセル
              </Button>
            )}

            {step === 'mapping' && (
              <>
                <Button variant="outline" onClick={() => setStep('upload')}>
                  戻る
                </Button>
                <Button onClick={handleValidate} disabled={isLoading || mappings.length === 0}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      検証中...
                    </>
                  ) : (
                    '検証'
                  )}
                </Button>
              </>
            )}

            {step === 'validate' && validationResult && (
              <>
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  戻る
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isLoading || validationResult.validCount === 0}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      インポート中...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 size-4" />
                      {validationResult.validCount}件をインポート
                    </>
                  )}
                </Button>
              </>
            )}

            {step === 'complete' && <Button onClick={handleClose}>閉じる</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
