'use client';

/**
 * Migration Wizard Component
 * テスト管理ツールからのデータ移行ウィザード
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Progress } from '@radix-ui/react-progress';
import { Upload, Check, AlertCircle, Loader2, FileText, FolderTree, Settings } from 'lucide-react';
import type {
  MigrationSource,
  TestLinkImportOptions,
  MigrationResult,
  ImportPreview,
} from '@/types/migration';

// ============================================
// 型定義
// ============================================

interface MigrationWizardProps {
  projectId: string;
  testSpecs?: Array<{ id: string; name: string }>;
  onComplete?: (result: MigrationResult) => void;
  onCancel?: () => void;
}

type WizardStep = 'source' | 'upload' | 'options' | 'preview' | 'progress' | 'complete';

// ============================================
// コンポーネント
// ============================================

export function MigrationWizard({
  projectId,
  testSpecs = [],
  onComplete,
  onCancel,
}: MigrationWizardProps) {
  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('source');
  const [source, setSource] = useState<MigrationSource | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<TestLinkImportOptions>({
    projectId,
    createTestSpec: true,
    testSpecName: '',
    preserveHierarchy: true,
    importKeywordsAsTags: true,
    defaultPriority: 'MEDIUM',
    defaultTestType: 'FUNCTIONAL',
    defaultTestTechnique: 'OTHER',
  });
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // ============================================
  // Handlers
  // ============================================

  const handleSourceSelect = useCallback((selectedSource: MigrationSource) => {
    setSource(selectedSource);
    setCurrentStep('upload');
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  }, []);

  const handleFileUpload = useCallback(async () => {
    if (!file) {
      setError('ファイルを選択してください。');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/migration/testlink/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'プレビューの取得に失敗しました。');
      }

      setPreview(data.preview);
      setCurrentStep('options');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  const handleOptionsChange = useCallback(
    <K extends keyof TestLinkImportOptions>(key: K, value: TestLinkImportOptions[K]) => {
      setOptions((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handlePreview = useCallback(() => {
    setCurrentStep('preview');
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setCurrentStep('progress');
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify(options));

      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/migration/testlink', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'インポートに失敗しました。');
      }

      setResult(data);
      setCurrentStep('complete');
      onComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
      setCurrentStep('preview');
    } finally {
      setIsLoading(false);
    }
  }, [file, options, onComplete]);

  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'upload':
        setCurrentStep('source');
        break;
      case 'options':
        setCurrentStep('upload');
        break;
      case 'preview':
        setCurrentStep('options');
        break;
      default:
        break;
    }
  }, [currentStep]);

  // ============================================
  // Render Steps
  // ============================================

  const renderSourceStep = () => (
    <div className="space-y-4">
      <CardDescription>移行元のテスト管理ツールを選択してください。</CardDescription>
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: 'TESTLINK' as MigrationSource, name: 'TestLink', icon: FileText },
          { id: 'ZEPHYR' as MigrationSource, name: 'Zephyr', icon: FileText },
          { id: 'QTEST' as MigrationSource, name: 'qTest', icon: FileText },
          { id: 'XRAY' as MigrationSource, name: 'Xray', icon: FileText },
        ].map((tool) => (
          <Card
            key={tool.id}
            className={`cursor-pointer transition-colors hover:border-primary ${
              source === tool.id ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => handleSourceSelect(tool.id)}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <tool.icon className="h-6 w-6" />
              <span className="font-medium">{tool.name}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-4">
      <CardDescription>
        TestLinkからエクスポートしたXMLファイルをアップロードしてください。
      </CardDescription>
      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <div className="space-y-2">
          <Label htmlFor="file-upload" className="cursor-pointer text-primary hover:underline">
            ファイルを選択
          </Label>
          <Input
            id="file-upload"
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
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          戻る
        </Button>
        <Button onClick={handleFileUpload} disabled={!file || isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          次へ
        </Button>
      </div>
    </div>
  );

  const renderOptionsStep = () => (
    <div className="space-y-6">
      <CardDescription>インポートオプションを設定してください。</CardDescription>

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
              value={options.testSpecName || ''}
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

        <div className="flex items-center space-x-2">
          <Checkbox
            id="preserveHierarchy"
            checked={options.preserveHierarchy}
            onCheckedChange={(checked) => handleOptionsChange('preserveHierarchy', !!checked)}
          />
          <Label htmlFor="preserveHierarchy">階層構造を維持</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="importKeywordsAsTags"
            checked={options.importKeywordsAsTags}
            onCheckedChange={(checked) => handleOptionsChange('importKeywordsAsTags', !!checked)}
          />
          <Label htmlFor="importKeywordsAsTags">キーワードをタグとしてインポート</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultPriority">デフォルト優先度</Label>
          <Select
            value={options.defaultPriority}
            onValueChange={(value) =>
              handleOptionsChange(
                'defaultPriority',
                value as TestLinkImportOptions['defaultPriority']
              )
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
        <Button variant="outline" onClick={handleBack}>
          戻る
        </Button>
        <Button onClick={handlePreview}>プレビュー</Button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <CardDescription>インポート内容を確認してください。</CardDescription>

      {preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <FolderTree className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <div className="text-2xl font-bold">{preview.testSuites.length}</div>
                <div className="text-sm text-muted-foreground">テストスイート</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <div className="text-2xl font-bold">{preview.totalTestCases}</div>
                <div className="text-sm text-muted-foreground">テストケース</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Settings className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <div className="text-2xl font-bold">{preview.totalTestSteps}</div>
                <div className="text-sm text-muted-foreground">テストステップ</div>
              </CardContent>
            </Card>
          </div>

          <div className="text-sm text-muted-foreground">
            推定所要時間: 約 {preview.estimatedTime} 秒
          </div>

          {preview.warnings.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <h4 className="font-medium text-yellow-800 mb-2">警告</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {preview.warnings.slice(0, 5).map((warning, index) => (
                  <li key={index}>{warning.warningMessage}</li>
                ))}
                {preview.warnings.length > 5 && <li>... 他 {preview.warnings.length - 5} 件</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          戻る
        </Button>
        <Button onClick={handleImport} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          インポート開始
        </Button>
      </div>
    </div>
  );

  const renderProgressStep = () => (
    <div className="space-y-6 text-center">
      <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
      <div>
        <h3 className="text-lg font-medium">インポート中...</h3>
        <p className="text-sm text-muted-foreground">しばらくお待ちください。</p>
      </div>
      <Progress value={progress} className="w-full" />
      <div className="text-sm text-muted-foreground">{progress}%</div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6 text-center">
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
          {result?.summary?.errors && result.summary.errors.length > 0 && (
            <div className="text-left text-sm text-red-600">
              {result.summary.errors.slice(0, 5).map((err, index) => (
                <div key={index}>{err.errorMessage}</div>
              ))}
            </div>
          )}
        </>
      )}
      <Button onClick={onCancel}>閉じる</Button>
    </div>
  );

  // ============================================
  // Main Render
  // ============================================

  const stepTitles: Record<WizardStep, string> = {
    source: '移行元の選択',
    upload: 'ファイルのアップロード',
    options: 'オプション設定',
    preview: '確認',
    progress: 'インポート中',
    complete: '完了',
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{stepTitles[currentStep]}</CardTitle>
      </CardHeader>
      <CardContent>
        {currentStep === 'source' && renderSourceStep()}
        {currentStep === 'upload' && renderUploadStep()}
        {currentStep === 'options' && renderOptionsStep()}
        {currentStep === 'preview' && renderPreviewStep()}
        {currentStep === 'progress' && renderProgressStep()}
        {currentStep === 'complete' && renderCompleteStep()}
      </CardContent>
    </Card>
  );
}

export default MigrationWizard;
