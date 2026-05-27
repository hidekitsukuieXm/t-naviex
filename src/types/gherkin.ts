/**
 * Gherkin Types
 *
 * BDD/Gherkin記法の型定義
 */

// ========================================
// Enums
// ========================================

/**
 * Gherkinステップタイプ
 */
export const GherkinStepType = {
  GIVEN: 'GIVEN',
  WHEN: 'WHEN',
  THEN: 'THEN',
  AND: 'AND',
  BUT: 'BUT',
} as const;

export type GherkinStepType = (typeof GherkinStepType)[keyof typeof GherkinStepType];

/**
 * Gherkinキーワード（日本語対応）
 */
export const GHERKIN_KEYWORDS = {
  // 英語
  en: {
    feature: 'Feature',
    background: 'Background',
    scenario: 'Scenario',
    scenarioOutline: 'Scenario Outline',
    examples: 'Examples',
    given: 'Given',
    when: 'When',
    then: 'Then',
    and: 'And',
    but: 'But',
  },
  // 日本語
  ja: {
    feature: '機能',
    background: '背景',
    scenario: 'シナリオ',
    scenarioOutline: 'シナリオアウトライン',
    examples: '例',
    given: '前提',
    when: 'もし',
    then: 'ならば',
    and: 'かつ',
    but: 'しかし',
  },
} as const;

export type GherkinLanguage = keyof typeof GHERKIN_KEYWORDS;

// ========================================
// Gherkin構造型
// ========================================

/**
 * Gherkinステップ
 */
export interface GherkinStep {
  id: string;
  type: GherkinStepType;
  keyword: string;
  text: string;
  docString?: string;
  dataTable?: GherkinDataTable;
  stepDefinitionId?: number; // ステップライブラリへの参照
}

/**
 * Gherkinデータテーブル
 */
export interface GherkinDataTable {
  headers: string[];
  rows: string[][];
}

/**
 * Gherkinシナリオ
 */
export interface GherkinScenario {
  id: string;
  keyword: string;
  name: string;
  description?: string;
  tags: string[];
  steps: GherkinStep[];
}

/**
 * Gherkinシナリオアウトライン
 */
export interface GherkinScenarioOutline extends GherkinScenario {
  examples: GherkinExamples[];
}

/**
 * Gherkin例（シナリオアウトライン用）
 */
export interface GherkinExamples {
  id: string;
  keyword: string;
  name?: string;
  tags: string[];
  table: GherkinDataTable;
}

/**
 * Gherkin背景
 */
export interface GherkinBackground {
  id: string;
  keyword: string;
  name?: string;
  description?: string;
  steps: GherkinStep[];
}

/**
 * Gherkin機能
 */
export interface GherkinFeature {
  id: string;
  keyword: string;
  name: string;
  description?: string;
  tags: string[];
  language: GherkinLanguage;
  background?: GherkinBackground;
  scenarios: (GherkinScenario | GherkinScenarioOutline)[];
}

/**
 * Gherkinドキュメント
 */
export interface GherkinDocument {
  feature?: GherkinFeature;
  comments: GherkinComment[];
  errors: GherkinParseError[];
}

/**
 * Gherkinコメント
 */
export interface GherkinComment {
  line: number;
  text: string;
}

/**
 * Gherkinパースエラー
 */
export interface GherkinParseError {
  line: number;
  column: number;
  message: string;
}

// ========================================
// ステップライブラリ型
// ========================================

/**
 * ステップ定義（ライブラリ）
 */
export interface StepDefinition {
  id: number;
  projectId: number;
  type: GherkinStepType;
  pattern: string; // 正規表現パターン（パラメータ含む）
  displayText: string; // 表示用テキスト
  description?: string;
  parameters: StepParameter[];
  isShared: boolean; // プロジェクト間で共有可能か
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ステップパラメータ
 */
export interface StepParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'table' | 'docstring';
  description?: string;
  defaultValue?: string;
}

/**
 * ステップ定義作成リクエスト
 */
export interface CreateStepDefinitionRequest {
  type: GherkinStepType;
  pattern: string;
  displayText: string;
  description?: string;
  parameters?: StepParameter[];
  isShared?: boolean;
}

/**
 * ステップ定義更新リクエスト
 */
export interface UpdateStepDefinitionRequest {
  displayText?: string;
  description?: string;
  parameters?: StepParameter[];
  isShared?: boolean;
}

// ========================================
// テストケースBDD拡張型
// ========================================

/**
 * BDDテストケース
 */
export interface BddTestCase {
  testCaseId: number;
  feature?: GherkinFeature;
  gherkinText: string; // 元のGherkin文字列
  language: GherkinLanguage;
  isValid: boolean;
  parseErrors: GherkinParseError[];
}

/**
 * BDDテストケース作成/更新リクエスト
 */
export interface UpsertBddTestCaseRequest {
  testCaseId: number;
  gherkinText: string;
  language?: GherkinLanguage;
}

// ========================================
// エクスポート型
// ========================================

/**
 * エクスポート形式
 */
export const BddExportFormat = {
  CUCUMBER: 'CUCUMBER', // Cucumber (.feature)
  BEHAVE: 'BEHAVE', // Python Behave
  SPECFLOW: 'SPECFLOW', // SpecFlow (C#)
  JBEHAVE: 'JBEHAVE', // JBehave (Java)
} as const;

export type BddExportFormat = (typeof BddExportFormat)[keyof typeof BddExportFormat];

/**
 * エクスポートオプション
 */
export interface BddExportOptions {
  format: BddExportFormat;
  language: GherkinLanguage;
  includeBackground: boolean;
  includeComments: boolean;
  includeTags: boolean;
}

// ========================================
// ユーティリティ
// ========================================

/**
 * ステップタイプからキーワードを取得
 */
export function getStepKeyword(type: GherkinStepType, language: GherkinLanguage = 'ja'): string {
  const keywords = GHERKIN_KEYWORDS[language];
  switch (type) {
    case 'GIVEN':
      return keywords.given;
    case 'WHEN':
      return keywords.when;
    case 'THEN':
      return keywords.then;
    case 'AND':
      return keywords.and;
    case 'BUT':
      return keywords.but;
    default:
      return type;
  }
}

/**
 * キーワードからステップタイプを取得
 */
export function getStepTypeFromKeyword(keyword: string): GherkinStepType | null {
  const lowerKeyword = keyword.toLowerCase().trim();

  // 英語キーワード
  if (lowerKeyword === 'given' || lowerKeyword === '前提') return 'GIVEN';
  if (lowerKeyword === 'when' || lowerKeyword === 'もし') return 'WHEN';
  if (lowerKeyword === 'then' || lowerKeyword === 'ならば') return 'THEN';
  if (lowerKeyword === 'and' || lowerKeyword === 'かつ') return 'AND';
  if (lowerKeyword === 'but' || lowerKeyword === 'しかし') return 'BUT';

  return null;
}

/**
 * ステップタイプの色を取得
 */
export function getStepTypeColor(type: GherkinStepType): string {
  switch (type) {
    case 'GIVEN':
      return '#3b82f6'; // blue
    case 'WHEN':
      return '#f59e0b'; // amber
    case 'THEN':
      return '#22c55e'; // green
    case 'AND':
      return '#6b7280'; // gray
    case 'BUT':
      return '#ef4444'; // red
    default:
      return '#6b7280';
  }
}

/**
 * ステップタイプのラベルを取得
 */
export function getStepTypeLabel(type: GherkinStepType): string {
  switch (type) {
    case 'GIVEN':
      return '前提条件';
    case 'WHEN':
      return 'アクション';
    case 'THEN':
      return '期待結果';
    case 'AND':
      return '追加条件';
    case 'BUT':
      return '例外条件';
    default:
      return type;
  }
}

/**
 * 空のGherkin機能を生成
 */
export function createEmptyFeature(language: GherkinLanguage = 'ja'): GherkinFeature {
  const keywords = GHERKIN_KEYWORDS[language];
  return {
    id: `feature_${Date.now()}`,
    keyword: keywords.feature,
    name: '',
    description: '',
    tags: [],
    language,
    scenarios: [],
  };
}

/**
 * 空のシナリオを生成
 */
export function createEmptyScenario(language: GherkinLanguage = 'ja'): GherkinScenario {
  const keywords = GHERKIN_KEYWORDS[language];
  return {
    id: `scenario_${Date.now()}`,
    keyword: keywords.scenario,
    name: '',
    tags: [],
    steps: [],
  };
}

/**
 * 空のステップを生成
 */
export function createEmptyStep(
  type: GherkinStepType,
  language: GherkinLanguage = 'ja'
): GherkinStep {
  return {
    id: `step_${Date.now()}`,
    type,
    keyword: getStepKeyword(type, language),
    text: '',
  };
}
