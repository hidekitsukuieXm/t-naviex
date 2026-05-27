'use client';
'use no memo';

/**
 * BDD Test Case Form Component
 *
 * BDDテストケースの編集フォーム
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Save,
  Loader2,
  FileText,
  Code,
  Library,
  Eye,
  Download,
  Undo,
  Redo,
  Globe,
} from 'lucide-react';
import { GherkinEditor } from './gherkin-editor';
import { StepLibraryPanel } from './step-library-panel';
import { GherkinParseError } from '@/types/gherkin';

export interface BddTestCaseFormProps {
  testCaseId: string;
  projectId: string;
  initialGherkinText?: string;
  initialLanguage?: 'ja' | 'en';
  onSave?: (gherkinText: string, language: 'ja' | 'en') => Promise<void>;
  onCancel?: () => void;
  readOnly?: boolean;
  className?: string;
}

/**
 * BDDテストケースフォーム
 */
export function BddTestCaseForm({
  testCaseId,
  projectId,
  initialGherkinText = '',
  initialLanguage = 'ja',
  onSave,
  onCancel,
  readOnly = false,
  className,
}: BddTestCaseFormProps) {
  const [gherkinText, setGherkinText] = useState(initialGherkinText);
  const [language, setLanguage] = useState<'ja' | 'en'>(initialLanguage);
  const [errors, setErrors] = useState<GherkinParseError[]>([]);
  const [saving, setSaving] = useState(false);
  const [_validating, setValidating] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'library'>('edit');
  const [history, setHistory] = useState<string[]>([initialGherkinText]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const isMounted = useRef(true);

  // テキスト変更時の履歴管理
  const handleTextChange = useCallback(
    (text: string) => {
      setGherkinText(text);
      setIsDirty(text !== initialGherkinText);

      // 履歴に追加（デバウンス付き）
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(text);
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex, initialGherkinText]
  );

  // 元に戻す
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setGherkinText(history[newIndex]);
    }
  }, [history, historyIndex]);

  // やり直し
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setGherkinText(history[newIndex]);
    }
  }, [history, historyIndex]);

  // バリデーション
  const handleValidate = useCallback(async () => {
    setValidating(true);
    try {
      const res = await fetch(`/api/test-cases/${testCaseId}/bdd`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          gherkinText,
          language,
        }),
      });

      if (!res.ok) throw new Error('Validation failed');

      const data = await res.json();
      if (isMounted.current) {
        setErrors(data.errors || []);
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      if (isMounted.current) {
        setValidating(false);
      }
    }
  }, [testCaseId, gherkinText, language]);

  // フォーマット
  const handleFormat = useCallback(async () => {
    try {
      const res = await fetch(`/api/test-cases/${testCaseId}/bdd`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'format',
          gherkinText,
          language,
        }),
      });

      if (!res.ok) throw new Error('Format failed');

      const data = await res.json();
      if (data.formatted && isMounted.current) {
        handleTextChange(data.formatted);
      }
    } catch (error) {
      console.error('Format error:', error);
    }
  }, [testCaseId, gherkinText, language, handleTextChange]);

  // エクスポート
  const handleExport = useCallback(() => {
    const blob = new Blob([gherkinText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-case-${testCaseId}.feature`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [gherkinText, testCaseId]);

  // 保存
  const handleSave = useCallback(async () => {
    if (!onSave) return;

    setSaving(true);
    try {
      await onSave(gherkinText, language);
      if (isMounted.current) {
        setIsDirty(false);
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      if (isMounted.current) {
        setSaving(false);
      }
    }
  }, [onSave, gherkinText, language]);

  // ステップ挿入
  const handleStepInsert = useCallback(
    (text: string) => {
      // カーソル位置に挿入（簡易実装：末尾に追加）
      const newText = gherkinText.trim() ? `${gherkinText}\n    ${text}` : text;
      handleTextChange(newText);
      setActiveTab('edit');
    },
    [gherkinText, handleTextChange]
  );

  // クリーンアップ
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 初回バリデーション
  useEffect(() => {
    if (gherkinText.trim()) {
      requestAnimationFrame(() => {
        if (isMounted.current) {
          handleValidate();
        }
      });
    }
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* ツールバー */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium">BDD/Gherkin形式</span>
          {isDirty && (
            <Badge variant="secondary" className="text-xs">
              未保存
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 言語選択 */}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <Select
              value={language}
              onValueChange={(v) => setLanguage(v as 'ja' | 'en')}
              disabled={readOnly}
            >
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ja">日本語</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={historyIndex === 0 || readOnly}
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1 || readOnly}
          >
            <Redo className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-border" />

          {/* エクスポート */}
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            エクスポート
          </Button>

          {/* 保存 */}
          {onSave && (
            <Button size="sm" onClick={handleSave} disabled={saving || !isDirty || readOnly}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              保存
            </Button>
          )}

          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              キャンセル
            </Button>
          )}
        </div>
      </div>

      {/* メインエリア */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={70} minSize={50}>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'edit' | 'preview' | 'library')}
            className="h-full flex flex-col"
          >
            <TabsList className="w-full justify-start rounded-none border-b h-auto p-0 bg-transparent">
              <TabsTrigger
                value="edit"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Code className="w-4 h-4 mr-1" />
                エディタ
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Eye className="w-4 h-4 mr-1" />
                プレビュー
              </TabsTrigger>
              <TabsTrigger
                value="library"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent sm:hidden"
              >
                <Library className="w-4 h-4 mr-1" />
                ライブラリ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="flex-1 p-4 mt-0">
              <GherkinEditor
                value={gherkinText}
                onChange={handleTextChange}
                language={language}
                readOnly={readOnly}
                errors={errors}
                onValidate={handleValidate}
                onFormat={handleFormat}
                onExport={handleExport}
                minHeight="calc(100vh - 300px)"
              />
            </TabsContent>

            <TabsContent value="preview" className="flex-1 p-4 mt-0 overflow-auto">
              <GherkinPreview gherkinText={gherkinText} language={language} />
            </TabsContent>

            <TabsContent value="library" className="flex-1 mt-0 sm:hidden">
              <StepLibraryPanel
                projectId={projectId}
                language={language}
                onStepInsert={handleStepInsert}
              />
            </TabsContent>
          </Tabs>
        </ResizablePanel>

        <ResizableHandle className="hidden sm:flex" />

        <ResizablePanel defaultSize={30} minSize={20} className="hidden sm:block border-l">
          <StepLibraryPanel
            projectId={projectId}
            language={language}
            onStepInsert={handleStepInsert}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

/**
 * Gherkinプレビュー
 */
interface GherkinPreviewProps {
  gherkinText: string;
  language: 'ja' | 'en';
}

function GherkinPreview({ gherkinText, language }: GherkinPreviewProps) {
  if (!gherkinText.trim()) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Gherkinテキストを入力するとプレビューが表示されます</p>
      </div>
    );
  }

  // 簡易的な構造化表示
  const lines = gherkinText.split('\n');

  return (
    <div className="space-y-4 font-mono text-sm">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) return <div key={index} className="h-4" />;

        // コメント
        if (trimmed.startsWith('#')) {
          return (
            <div key={index} className="text-muted-foreground italic pl-4">
              {line}
            </div>
          );
        }

        // タグ
        if (trimmed.startsWith('@')) {
          return (
            <div key={index} className="flex flex-wrap gap-1 pl-4">
              {trimmed.split(/\s+/).map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          );
        }

        // Feature
        if (trimmed.startsWith('Feature:') || trimmed.startsWith('機能:')) {
          return (
            <div
              key={index}
              className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-r"
            >
              <span className="font-bold text-blue-600 dark:text-blue-400">{trimmed}</span>
            </div>
          );
        }

        // Background
        if (trimmed.startsWith('Background:') || trimmed.startsWith('背景:')) {
          return (
            <div
              key={index}
              className="border-l-4 border-gray-400 pl-4 py-2 bg-gray-50 dark:bg-gray-900/30 rounded-r mt-4"
            >
              <span className="font-bold text-gray-600 dark:text-gray-400">{trimmed}</span>
            </div>
          );
        }

        // Scenario
        if (
          trimmed.startsWith('Scenario:') ||
          trimmed.startsWith('シナリオ:') ||
          trimmed.startsWith('Scenario Outline:') ||
          trimmed.startsWith('シナリオアウトライン:')
        ) {
          return (
            <div
              key={index}
              className="border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-r mt-4"
            >
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{trimmed}</span>
            </div>
          );
        }

        // Examples
        if (trimmed.startsWith('Examples:') || trimmed.startsWith('例:')) {
          return (
            <div key={index} className="pl-8 mt-2 font-semibold text-teal-600 dark:text-teal-400">
              {trimmed}
            </div>
          );
        }

        // テーブル行
        if (trimmed.startsWith('|')) {
          return (
            <div key={index} className="pl-12 text-cyan-700 dark:text-cyan-300 font-mono">
              {trimmed}
            </div>
          );
        }

        // ステップ
        const stepKeywords = {
          ja: ['前提', 'もし', 'ならば', 'かつ', 'しかし'],
          en: ['Given', 'When', 'Then', 'And', 'But'],
        };
        const keywords = [...stepKeywords.ja, ...stepKeywords.en];

        for (const keyword of keywords) {
          if (trimmed.startsWith(keyword + ' ')) {
            const color = getKeywordColor(keyword);
            return (
              <div key={index} className="pl-8 flex items-start gap-2">
                <span className={cn('font-semibold', color)}>{keyword}</span>
                <span>{trimmed.slice(keyword.length + 1)}</span>
              </div>
            );
          }
        }

        // その他（説明文など）
        return (
          <div key={index} className="pl-4 text-muted-foreground">
            {line}
          </div>
        );
      })}
    </div>
  );
}

function getKeywordColor(keyword: string): string {
  const colors: Record<string, string> = {
    Given: 'text-blue-600 dark:text-blue-400',
    前提: 'text-blue-600 dark:text-blue-400',
    When: 'text-amber-600 dark:text-amber-400',
    もし: 'text-amber-600 dark:text-amber-400',
    Then: 'text-green-600 dark:text-green-400',
    ならば: 'text-green-600 dark:text-green-400',
    And: 'text-gray-600 dark:text-gray-400',
    かつ: 'text-gray-600 dark:text-gray-400',
    But: 'text-red-600 dark:text-red-400',
    しかし: 'text-red-600 dark:text-red-400',
  };
  return colors[keyword] || 'text-foreground';
}

export default BddTestCaseForm;
