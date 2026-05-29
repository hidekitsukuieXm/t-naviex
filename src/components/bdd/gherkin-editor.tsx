'use client';

/**
 * Gherkin Editor Component
 *
 * Gherkin記法のエディタ（シンタックスハイライト付き）
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle, Wand2, Copy, Download, Play, FileText } from 'lucide-react';
import {
  GHERKIN_KEYWORDS,
  GherkinLanguage,
  GherkinParseError,
  getStepTypeColor,
} from '@/types/gherkin';

export interface GherkinEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'ja' | 'en';
  readOnly?: boolean;
  placeholder?: string;
  errors?: GherkinParseError[];
  onValidate?: () => void;
  onFormat?: () => void;
  onExport?: () => void;
  className?: string;
  minHeight?: string;
}

/**
 * Gherkinエディタコンポーネント
 */
export function GherkinEditor({
  value,
  onChange,
  language = 'ja',
  readOnly = false,
  placeholder,
  errors = [],
  onValidate,
  onFormat,
  onExport,
  className,
  minHeight = '300px',
}: GherkinEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // スクロール同期
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // シンタックスハイライト適用
  const highlightedContent = applyHighlighting(value, language);

  // エラー行のハイライト
  const errorLines = new Set(errors.map((e) => e.line));

  // デフォルトプレースホルダー
  const defaultPlaceholder =
    language === 'ja'
      ? `機能: ログイン機能
  ユーザーがシステムにログインできること

  シナリオ: 正常なログイン
    前提 ユーザーがログイン画面にいる
    もし ユーザーが有効な認証情報を入力する
    ならば ダッシュボードが表示される`
      : `Feature: Login functionality
  Users can log into the system

  Scenario: Successful login
    Given User is on the login page
    When User enters valid credentials
    Then Dashboard is displayed`;

  return (
    <div className={cn('relative', className)}>
      {/* ツールバー */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {language === 'ja' ? '日本語' : 'English'}
          </Badge>
          {errors.length === 0 && value.trim() && (
            <Badge variant="default" className="text-xs bg-green-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              有効
            </Badge>
          )}
          {errors.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="w-3 h-3 mr-1" />
              {errors.length}件のエラー
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {onFormat && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onFormat} disabled={readOnly}>
                    <Wand2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>自動フォーマット</TooltipContent>
              </Tooltip>
            )}
            {onValidate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onValidate}>
                    <Play className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>検証</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(value)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>コピー</TooltipContent>
            </Tooltip>
            {onExport && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onExport}>
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>.featureファイルとしてエクスポート</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>

      {/* エディタ本体 */}
      <div
        className={cn(
          'relative border rounded-md overflow-hidden',
          isFocused && 'ring-2 ring-ring ring-offset-2',
          errors.length > 0 && 'border-destructive'
        )}
        style={{ minHeight }}
      >
        {/* シンタックスハイライト表示レイヤー */}
        <div
          ref={highlightRef}
          className="absolute inset-0 p-3 font-mono text-sm whitespace-pre-wrap break-words overflow-auto pointer-events-none"
          style={{ minHeight }}
          aria-hidden="true"
        >
          {highlightedContent}
        </div>

        {/* 実際の入力領域 */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || defaultPlaceholder}
          readOnly={readOnly}
          className={cn(
            'relative w-full p-3 font-mono text-sm resize-none bg-transparent',
            'text-transparent caret-foreground',
            'placeholder:text-muted-foreground/50'
          )}
          style={{ minHeight }}
        />
      </div>

      {/* エラー表示 */}
      {errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {errors.slice(0, 5).map((error, index) => (
            <div key={index} className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {error.line > 0 && `行 ${error.line}: `}
                {error.message}
              </span>
            </div>
          ))}
          {errors.length > 5 && (
            <div className="text-sm text-muted-foreground">
              ...他 {errors.length - 5} 件のエラー
            </div>
          )}
        </div>
      )}

      {/* ヘルプテキスト */}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="w-3 h-3" />
        <span>
          {language === 'ja'
            ? 'Gherkin記法: 機能 / シナリオ / 前提 / もし / ならば / かつ / しかし'
            : 'Gherkin syntax: Feature / Scenario / Given / When / Then / And / But'}
        </span>
      </div>
    </div>
  );
}

/**
 * シンタックスハイライトを適用
 */
function applyHighlighting(text: string, language: GherkinLanguage): React.ReactNode {
  if (!text) return null;

  const keywords = GHERKIN_KEYWORDS[language];
  const lines = text.split('\n');

  return lines.map((line, lineIndex) => {
    const trimmedLine = line.trim();

    // コメント
    if (trimmedLine.startsWith('#')) {
      return (
        <div key={lineIndex}>
          <span className="text-muted-foreground italic">{line}</span>
          {'\n'}
        </div>
      );
    }

    // タグ
    if (trimmedLine.startsWith('@')) {
      return (
        <div key={lineIndex}>
          <span className="text-purple-500 dark:text-purple-400">{line}</span>
          {'\n'}
        </div>
      );
    }

    // テーブル
    if (trimmedLine.startsWith('|')) {
      return (
        <div key={lineIndex}>
          <span className="text-cyan-600 dark:text-cyan-400">{line}</span>
          {'\n'}
        </div>
      );
    }

    // Doc String
    if (trimmedLine.startsWith('"""') || trimmedLine.startsWith("'''")) {
      return (
        <div key={lineIndex}>
          <span className="text-orange-500 dark:text-orange-400">{line}</span>
          {'\n'}
        </div>
      );
    }

    // キーワードのハイライト
    let highlighted: React.ReactNode = line;
    let hasKeyword = false;

    // Feature
    const featureKeywords = [keywords.feature, 'Feature'];
    for (const kw of featureKeywords) {
      if (trimmedLine.startsWith(kw + ':') || trimmedLine.startsWith(kw + ' ')) {
        highlighted = highlightKeyword(line, kw, 'text-blue-600 dark:text-blue-400 font-bold');
        hasKeyword = true;
        break;
      }
    }

    // Background
    if (!hasKeyword) {
      const bgKeywords = [keywords.background, 'Background'];
      for (const kw of bgKeywords) {
        if (trimmedLine.startsWith(kw + ':') || trimmedLine.startsWith(kw + ' ')) {
          highlighted = highlightKeyword(line, kw, 'text-gray-600 dark:text-gray-400 font-bold');
          hasKeyword = true;
          break;
        }
      }
    }

    // Scenario Outline
    if (!hasKeyword) {
      const outlineKeywords = [keywords.scenarioOutline, 'Scenario Outline'];
      for (const kw of outlineKeywords) {
        if (trimmedLine.startsWith(kw + ':') || trimmedLine.startsWith(kw + ' ')) {
          highlighted = highlightKeyword(
            line,
            kw,
            'text-indigo-600 dark:text-indigo-400 font-bold'
          );
          hasKeyword = true;
          break;
        }
      }
    }

    // Scenario
    if (!hasKeyword) {
      const scenarioKeywords = [keywords.scenario, 'Scenario'];
      for (const kw of scenarioKeywords) {
        if (trimmedLine.startsWith(kw + ':') || trimmedLine.startsWith(kw + ' ')) {
          highlighted = highlightKeyword(
            line,
            kw,
            'text-indigo-600 dark:text-indigo-400 font-bold'
          );
          hasKeyword = true;
          break;
        }
      }
    }

    // Examples
    if (!hasKeyword) {
      const examplesKeywords = [keywords.examples, 'Examples'];
      for (const kw of examplesKeywords) {
        if (trimmedLine.startsWith(kw + ':') || trimmedLine.startsWith(kw + ' ')) {
          highlighted = highlightKeyword(line, kw, 'text-teal-600 dark:text-teal-400 font-bold');
          hasKeyword = true;
          break;
        }
      }
    }

    // Step keywords (Given/When/Then/And/But)
    if (!hasKeyword) {
      const stepKeywordMap = [
        { keywords: [keywords.given, 'Given'], color: getStepTypeColor('GIVEN') },
        { keywords: [keywords.when, 'When'], color: getStepTypeColor('WHEN') },
        { keywords: [keywords.then, 'Then'], color: getStepTypeColor('THEN') },
        { keywords: [keywords.and, 'And'], color: getStepTypeColor('AND') },
        { keywords: [keywords.but, 'But'], color: getStepTypeColor('BUT') },
      ];

      for (const { keywords: kws, color } of stepKeywordMap) {
        for (const kw of kws) {
          if (trimmedLine.startsWith(kw + ' ')) {
            const indent = line.indexOf(kw);
            const rest = line.slice(indent + kw.length);
            highlighted = (
              <>
                {line.slice(0, indent)}
                <span style={{ color }} className="font-semibold">
                  {kw}
                </span>
                {highlightParameters(rest)}
              </>
            );
            hasKeyword = true;
            break;
          }
        }
        if (hasKeyword) break;
      }
    }

    return (
      <div key={lineIndex}>
        {hasKeyword ? highlighted : <span>{line}</span>}
        {'\n'}
      </div>
    );
  });
}

/**
 * キーワードをハイライト
 */
function highlightKeyword(line: string, keyword: string, className: string): React.ReactNode {
  const index = line.indexOf(keyword);
  if (index === -1) return line;

  return (
    <>
      {line.slice(0, index)}
      <span className={className}>{keyword}</span>
      {line.slice(index + keyword.length)}
    </>
  );
}

/**
 * パラメータ（<...>）をハイライト
 */
function highlightParameters(text: string): React.ReactNode {
  const parts = text.split(/(<[^>]+>)/g);

  return parts.map((part, index) => {
    if (part.startsWith('<') && part.endsWith('>')) {
      return (
        <span key={index} className="text-amber-600 dark:text-amber-400 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

export default GherkinEditor;
