'use client';

/**
 * XML Import Dialog Component
 * XMLファイルのインポートダイアログ
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, Check, AlertCircle, Loader2, Settings2 } from 'lucide-react';
import type { MigrationResult } from '@/types/migration';

// ============================================
// 型定義
// ============================================

interface XmlImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  testSpecs?: Array<{ id: string; name: string }>;
  onComplete?: (result: MigrationResult) => void;
}

type DialogStep = 'upload' | 'detect' | 'mapping' | 'options' | 'import' | 'complete';

interface FieldDetection {
  fields: string[];
  sampleData: Array<Record<string, string>>;
}

interface XmlConfig {
  rootElement: string;
  testCaseElement: string;
  stepElement: string;
  sectionElement: string;
}

interface FieldMapping {
  testCase: {
    title: string;
    description: string;
    preconditions: string;
    expectedResult: string;
    priority: string;
    tags: string;
    referenceId: string;
  };
  step: {
    action: string;
    expected: string;
    stepNo: string;
  };
}

// ============================================
// コンポーネント
// ============================================

export function XmlImportDialog({
  open,
  onOpenChange,
  projectId,
  testSpecs = [],
  onComplete,
}: XmlImportDialogProps) {
  // State
  const [step, setStep] = useState<DialogStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [detection, setDetection] = useState<FieldDetection | null>(null);
  const [config, setConfig] = useState<XmlConfig>({
    rootElement: '',
    testCaseElement: 'testcase',
    stepElement: 'step',
    sectionElement: '',
  });
  const [mapping, setMapping] = useState<FieldMapping>({
    testCase: {
      title: 'name',
      description: 'description',
      preconditions: 'preconditions',
      expectedResult: 'expectedResult',
      priority: 'priority',
      tags: 'tags',
      referenceId: 'id',
    },
    step: {
      action: 'action',
      expected: 'expected',
      stepNo: 'stepNo',
    },
  });
  const [options, setOptions] = useState({
    createTestSpec: true,
    testSpecName: '',
    testSpecId: '',
    defaultPriority: 'MEDIUM' as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
    defaultTestType: 'FUNCTIONAL',
    defaultTestTechnique: 'OTHER',
  });
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ============================================
  // Handlers
  // ============================================

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  }, []);

  const handleDetectFields = useCallback(async () => {
    if (!file) {
      setError('ファイルを選択してください。');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import/xml/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'フィールド検出に失敗しました。');
      }

      setDetection({
        fields: data.fields,
        sampleData: data.sampleData,
      });
      setStep('detect');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  const handleConfigChange = useCallback(
    <K extends keyof XmlConfig>(key: K, value: XmlConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleMappingChange = useCallback(
    (category: 'testCase' | 'step', field: string, value: string) => {
      setMapping((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: value,
        },
      }));
    },
    []
  );

  const handleOptionsChange = useCallback(
    <K extends keyof typeof options>(key: K, value: (typeof options)[K]) => {
      setOptions((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleImport = useCallback(async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setStep('import');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append(
        'options',
        JSON.stringify({
          projectId,
          ...options,
          config,
          fieldMapping: mapping,
        })
      );

      const response = await fetch('/api/import/xml', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'インポートに失敗しました。');
      }

      setResult(data);
      setStep('complete');
      onComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
      setStep('options');
    } finally {
      setIsLoading(false);
    }
  }, [file, projectId, options, config, mapping, onComplete]);

  const handleClose = useCallback(() => {
    setStep('upload');
    setFile(null);
    setDetection(null);
    setResult(null);
    setError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  // ============================================
  // Render Steps
  // ============================================

  const renderUploadStep = () => (
    <div className="space-y-4">
      <DialogDescription>XMLファイルをアップロードしてください。</DialogDescription>
      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <div className="space-y-2">
          <Label htmlFor="xml-file-upload" className="cursor-pointer text-primary hover:underline">
            ファイルを選択
          </Label>
          <Input
            id="xml-file-upload"
            type="file"
            accept=".xml"
            className="hidden"
            onChange={handleFileChange}
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              選択済み: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={handleDetectFields} disabled={!file || isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          フィールド検出
        </Button>
      </div>
    </div>
  );

  const renderDetectStep = () => (
    <div className="space-y-4">
      <DialogDescription>検出されたフィールドを確認してください。</DialogDescription>
      {detection && (
        <>
          <div className="space-y-2">
            <Label>検出されたフィールド ({detection.fields.length})</Label>
            <div className="flex flex-wrap gap-1 p-2 border rounded max-h-32 overflow-y-auto">
              {detection.fields.map((field) => (
                <span key={field} className="px-2 py-1 bg-muted rounded text-xs">
                  {field}
                </span>
              ))}
            </div>
          </div>
          {detection.sampleData.length > 0 && (
            <div className="space-y-2">
              <Label>サンプルデータ</Label>
              <div className="border rounded max-h-48 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(detection.sampleData[0])
                        .slice(0, 5)
                        .map((key) => (
                          <TableHead key={key} className="text-xs">
                            {key}
                          </TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detection.sampleData.slice(0, 3).map((row, idx) => (
                      <TableRow key={idx}>
                        {Object.values(row)
                          .slice(0, 5)
                          .map((val, i) => (
                            <TableCell key={i} className="text-xs truncate max-w-[100px]">
                              {String(val)}
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('upload')}>
          戻る
        </Button>
        <Button onClick={() => setStep('mapping')}>マッピング設定</Button>
      </div>
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      <DialogDescription>フィールドマッピングを設定してください。</DialogDescription>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">XML構造設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">テストケース要素</Label>
              <Input
                value={config.testCaseElement}
                onChange={(e) => handleConfigChange('testCaseElement', e.target.value)}
                placeholder="testcase"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ステップ要素</Label>
              <Input
                value={config.stepElement}
                onChange={(e) => handleConfigChange('stepElement', e.target.value)}
                placeholder="step"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">テストケースマッピング</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(mapping.testCase).map(([field, value]) => (
              <div key={field} className="space-y-1">
                <Label className="text-xs capitalize">{field}</Label>
                <Select
                  value={value}
                  onValueChange={(v) => handleMappingChange('testCase', field, v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="フィールドを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">未設定</SelectItem>
                    {detection?.fields.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">ステップマッピング</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(mapping.step).map(([field, value]) => (
              <div key={field} className="space-y-1">
                <Label className="text-xs capitalize">{field}</Label>
                <Select value={value} onValueChange={(v) => handleMappingChange('step', field, v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="フィールドを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">未設定</SelectItem>
                    {detection?.fields.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('detect')}>
          戻る
        </Button>
        <Button onClick={() => setStep('options')}>次へ</Button>
      </div>
    </div>
  );

  const renderOptionsStep = () => (
    <div className="space-y-4">
      <DialogDescription>インポートオプションを設定してください。</DialogDescription>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="createTestSpec"
            checked={options.createTestSpec}
            onCheckedChange={(checked) => handleOptionsChange('createTestSpec', !!checked)}
          />
          <Label htmlFor="createTestSpec">新しいテスト仕様書を作成</Label>
        </div>

        {options.createTestSpec ? (
          <div className="space-y-2">
            <Label htmlFor="testSpecName">テスト仕様書名</Label>
            <Input
              id="testSpecName"
              value={options.testSpecName}
              onChange={(e) => handleOptionsChange('testSpecName', e.target.value)}
              placeholder="インポートしたテストケース"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="testSpecId">インポート先テスト仕様書</Label>
            <Select
              value={options.testSpecId}
              onValueChange={(value) => handleOptionsChange('testSpecId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="テスト仕様書を選択" />
              </SelectTrigger>
              <SelectContent>
                {testSpecs.map((spec) => (
                  <SelectItem key={spec.id} value={spec.id}>
                    {spec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>デフォルト優先度</Label>
          <Select
            value={options.defaultPriority}
            onValueChange={(value) =>
              handleOptionsChange('defaultPriority', value as typeof options.defaultPriority)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CRITICAL">致命的</SelectItem>
              <SelectItem value="HIGH">高</SelectItem>
              <SelectItem value="MEDIUM">中</SelectItem>
              <SelectItem value="LOW">低</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('mapping')}>
          戻る
        </Button>
        <Button onClick={handleImport} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          インポート開始
        </Button>
      </div>
    </div>
  );

  const renderImportStep = () => (
    <div className="space-y-6 text-center py-8">
      <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
      <div>
        <h3 className="text-lg font-medium">インポート中...</h3>
        <p className="text-sm text-muted-foreground">しばらくお待ちください。</p>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6 text-center py-8">
      {result?.success ? (
        <>
          <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium">インポート完了</h3>
            <p className="text-sm text-muted-foreground">データのインポートが完了しました。</p>
          </div>
          {result.summary && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium">{result.summary.importedTestSuites}</div>
                <div className="text-muted-foreground">セクション</div>
              </div>
              <div>
                <div className="font-medium">{result.summary.importedTestCases}</div>
                <div className="text-muted-foreground">テストケース</div>
              </div>
              <div>
                <div className="font-medium">{result.summary.importedTestSteps}</div>
                <div className="text-muted-foreground">テストステップ</div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium">インポート失敗</h3>
            <p className="text-sm text-muted-foreground">エラーが発生しました。</p>
          </div>
        </>
      )}
      <Button onClick={handleClose}>閉じる</Button>
    </div>
  );

  // ============================================
  // Main Render
  // ============================================

  const stepTitles: Record<DialogStep, string> = {
    upload: 'XMLファイルのアップロード',
    detect: 'フィールド検出',
    mapping: 'フィールドマッピング',
    options: 'インポートオプション',
    import: 'インポート中',
    complete: '完了',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {stepTitles[step]}
          </DialogTitle>
        </DialogHeader>
        {step === 'upload' && renderUploadStep()}
        {step === 'detect' && renderDetectStep()}
        {step === 'mapping' && renderMappingStep()}
        {step === 'options' && renderOptionsStep()}
        {step === 'import' && renderImportStep()}
        {step === 'complete' && renderCompleteStep()}
      </DialogContent>
    </Dialog>
  );
}

export default XmlImportDialog;
