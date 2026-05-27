/**
 * Gherkin Parser
 *
 * BDD/Gherkin記法のパースとシリアライズ
 */

import {
  GherkinDocument,
  GherkinFeature,
  GherkinScenario,
  GherkinScenarioOutline,
  GherkinStep,
  GherkinBackground,
  GherkinExamples,
  GherkinDataTable,
  GherkinComment,
  GherkinParseError,
  GherkinStepType,
  GherkinLanguage,
  GHERKIN_KEYWORDS,
  getStepTypeFromKeyword,
} from '@/types/gherkin';

// ========================================
// パーサー
// ========================================

/**
 * Gherkinテキストをパースしてドキュメントを返す
 */
export function parseGherkin(text: string, language: GherkinLanguage = 'ja'): GherkinDocument {
  const lines = text.split('\n');
  const comments: GherkinComment[] = [];
  const errors: GherkinParseError[] = [];

  let feature: GherkinFeature | undefined;
  let currentScenario: GherkinScenario | GherkinScenarioOutline | undefined;
  let currentBackground: GherkinBackground | undefined;
  let currentExamples: GherkinExamples | undefined;
  let pendingTags: string[] = [];
  let inDataTable = false;
  let currentDataTable: GherkinDataTable | undefined;
  let lastStep: GherkinStep | undefined;
  let inDocString = false;
  let docStringContent: string[] = [];
  let docStringDelimiter = '';

  const keywords = GHERKIN_KEYWORDS[language];

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];
    const trimmedLine = line.trim();

    // 空行の処理
    if (trimmedLine === '') {
      inDataTable = false;
      continue;
    }

    // Doc String の処理
    if (inDocString) {
      if (trimmedLine === docStringDelimiter) {
        if (lastStep) {
          lastStep.docString = docStringContent.join('\n');
        }
        inDocString = false;
        docStringContent = [];
        docStringDelimiter = '';
      } else {
        docStringContent.push(line);
      }
      continue;
    }

    // Doc String 開始の検出
    if (trimmedLine.startsWith('"""') || trimmedLine.startsWith("'''")) {
      inDocString = true;
      docStringDelimiter = trimmedLine.slice(0, 3);
      docStringContent = [];
      continue;
    }

    // コメントの処理
    if (trimmedLine.startsWith('#')) {
      comments.push({
        line: lineNumber,
        text: trimmedLine.slice(1).trim(),
      });
      continue;
    }

    // タグの処理
    if (trimmedLine.startsWith('@')) {
      const tags = trimmedLine.split(/\s+/).filter((t) => t.startsWith('@'));
      pendingTags.push(...tags);
      continue;
    }

    // データテーブルの処理
    if (trimmedLine.startsWith('|')) {
      const cells = parseTableRow(trimmedLine);

      if (currentExamples) {
        if (!currentExamples.table.headers.length) {
          currentExamples.table.headers = cells;
        } else {
          currentExamples.table.rows.push(cells);
        }
      } else if (lastStep) {
        if (!inDataTable) {
          currentDataTable = { headers: cells, rows: [] };
          lastStep.dataTable = currentDataTable;
          inDataTable = true;
        } else if (currentDataTable) {
          currentDataTable.rows.push(cells);
        }
      }
      continue;
    }

    inDataTable = false;

    // Feature の処理
    if (startsWithKeyword(trimmedLine, keywords.feature)) {
      const name = extractName(trimmedLine, keywords.feature);
      feature = {
        id: `feature_${Date.now()}`,
        keyword: keywords.feature,
        name,
        tags: [...pendingTags],
        language,
        scenarios: [],
      };
      pendingTags = [];
      currentScenario = undefined;
      currentBackground = undefined;
      continue;
    }

    // Background の処理
    if (startsWithKeyword(trimmedLine, keywords.background)) {
      if (!feature) {
        errors.push({
          line: lineNumber,
          column: 1,
          message: `${keywords.background}はFeature内に記述してください`,
        });
        continue;
      }
      const name = extractName(trimmedLine, keywords.background);
      currentBackground = {
        id: `background_${Date.now()}`,
        keyword: keywords.background,
        name: name || undefined,
        steps: [],
      };
      feature.background = currentBackground;
      currentScenario = undefined;
      lastStep = undefined;
      continue;
    }

    // Scenario Outline の処理
    if (startsWithKeyword(trimmedLine, keywords.scenarioOutline)) {
      if (!feature) {
        errors.push({
          line: lineNumber,
          column: 1,
          message: `${keywords.scenarioOutline}はFeature内に記述してください`,
        });
        continue;
      }
      const name = extractName(trimmedLine, keywords.scenarioOutline);
      currentScenario = {
        id: `scenario_${Date.now()}`,
        keyword: keywords.scenarioOutline,
        name,
        tags: [...pendingTags],
        steps: [],
        examples: [],
      } as GherkinScenarioOutline;
      feature.scenarios.push(currentScenario);
      pendingTags = [];
      currentBackground = undefined;
      currentExamples = undefined;
      lastStep = undefined;
      continue;
    }

    // Scenario の処理
    if (startsWithKeyword(trimmedLine, keywords.scenario)) {
      if (!feature) {
        errors.push({
          line: lineNumber,
          column: 1,
          message: `${keywords.scenario}はFeature内に記述してください`,
        });
        continue;
      }
      const name = extractName(trimmedLine, keywords.scenario);
      currentScenario = {
        id: `scenario_${Date.now()}_${i}`,
        keyword: keywords.scenario,
        name,
        tags: [...pendingTags],
        steps: [],
      };
      feature.scenarios.push(currentScenario);
      pendingTags = [];
      currentBackground = undefined;
      currentExamples = undefined;
      lastStep = undefined;
      continue;
    }

    // Examples の処理
    if (startsWithKeyword(trimmedLine, keywords.examples)) {
      if (!currentScenario || !('examples' in currentScenario)) {
        errors.push({
          line: lineNumber,
          column: 1,
          message: `${keywords.examples}はScenario Outline内に記述してください`,
        });
        continue;
      }
      const name = extractName(trimmedLine, keywords.examples);
      currentExamples = {
        id: `examples_${Date.now()}`,
        keyword: keywords.examples,
        name: name || undefined,
        tags: [...pendingTags],
        table: { headers: [], rows: [] },
      };
      (currentScenario as GherkinScenarioOutline).examples.push(currentExamples);
      pendingTags = [];
      continue;
    }

    // ステップの処理
    const stepResult = parseStepLine(trimmedLine, language);
    if (stepResult) {
      const step: GherkinStep = {
        id: `step_${Date.now()}_${i}`,
        type: stepResult.type,
        keyword: stepResult.keyword,
        text: stepResult.text,
      };

      if (currentBackground) {
        currentBackground.steps.push(step);
      } else if (currentScenario) {
        currentScenario.steps.push(step);
      } else {
        errors.push({
          line: lineNumber,
          column: 1,
          message: 'ステップはScenarioまたはBackground内に記述してください',
        });
        continue;
      }

      lastStep = step;
      continue;
    }

    // 説明文の処理（Featureやシナリオの説明）
    if (feature && !currentScenario && !currentBackground) {
      if (feature.description) {
        feature.description += '\n' + trimmedLine;
      } else {
        feature.description = trimmedLine;
      }
      continue;
    }

    if (currentScenario && trimmedLine && !startsWithAnyKeyword(trimmedLine, language)) {
      if (currentScenario.description) {
        currentScenario.description += '\n' + trimmedLine;
      } else {
        currentScenario.description = trimmedLine;
      }
      continue;
    }
  }

  return {
    feature,
    comments,
    errors,
  };
}

/**
 * ステップ行をパース
 */
function parseStepLine(
  line: string,
  language: GherkinLanguage
): { type: GherkinStepType; keyword: string; text: string } | null {
  const keywords = GHERKIN_KEYWORDS[language];
  const stepKeywords = [
    { keyword: keywords.given, type: 'GIVEN' as GherkinStepType },
    { keyword: keywords.when, type: 'WHEN' as GherkinStepType },
    { keyword: keywords.then, type: 'THEN' as GherkinStepType },
    { keyword: keywords.and, type: 'AND' as GherkinStepType },
    { keyword: keywords.but, type: 'BUT' as GherkinStepType },
  ];

  // 英語キーワードも追加（日本語モードでも英語を認識）
  if (language === 'ja') {
    const enKeywords = GHERKIN_KEYWORDS.en;
    stepKeywords.push(
      { keyword: enKeywords.given, type: 'GIVEN' },
      { keyword: enKeywords.when, type: 'WHEN' },
      { keyword: enKeywords.then, type: 'THEN' },
      { keyword: enKeywords.and, type: 'AND' },
      { keyword: enKeywords.but, type: 'BUT' }
    );
  }

  for (const { keyword, type } of stepKeywords) {
    if (startsWithKeyword(line, keyword)) {
      const text = line.slice(keyword.length).trim();
      return { type, keyword, text };
    }
  }

  return null;
}

/**
 * テーブル行をパース
 */
function parseTableRow(line: string): string[] {
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
  return cells;
}

/**
 * キーワードで始まるかチェック
 */
function startsWithKeyword(line: string, keyword: string): boolean {
  return line.startsWith(keyword + ':') || line.startsWith(keyword + ' ');
}

/**
 * いずれかのキーワードで始まるかチェック
 */
function startsWithAnyKeyword(line: string, language: GherkinLanguage): boolean {
  const keywords = GHERKIN_KEYWORDS[language];
  const allKeywords = [
    keywords.feature,
    keywords.background,
    keywords.scenario,
    keywords.scenarioOutline,
    keywords.examples,
    keywords.given,
    keywords.when,
    keywords.then,
    keywords.and,
    keywords.but,
  ];
  return allKeywords.some((kw) => startsWithKeyword(line, kw));
}

/**
 * キーワードの後の名前を抽出
 */
function extractName(line: string, keyword: string): string {
  if (line.startsWith(keyword + ':')) {
    return line.slice(keyword.length + 1).trim();
  }
  return line.slice(keyword.length).trim();
}

// ========================================
// シリアライザー
// ========================================

/**
 * GherkinDocumentをテキストに変換
 */
export function serializeGherkin(
  document: GherkinDocument,
  options: SerializeOptions = {}
): string {
  const { indent = '  ', includeComments = true, includeTags = true } = options;

  const lines: string[] = [];

  // コメントの追加
  if (includeComments && document.comments.length > 0) {
    for (const comment of document.comments) {
      lines.push(`# ${comment.text}`);
    }
    lines.push('');
  }

  if (!document.feature) {
    return lines.join('\n');
  }

  const feature = document.feature;

  // Feature タグ
  if (includeTags && feature.tags.length > 0) {
    lines.push(feature.tags.join(' '));
  }

  // Feature
  lines.push(`${feature.keyword}: ${feature.name}`);

  // Feature 説明
  if (feature.description) {
    lines.push('');
    for (const descLine of feature.description.split('\n')) {
      lines.push(`${indent}${descLine}`);
    }
  }

  // Background
  if (feature.background) {
    lines.push('');
    serializeBackground(feature.background, lines, indent);
  }

  // Scenarios
  for (const scenario of feature.scenarios) {
    lines.push('');
    if ('examples' in scenario) {
      serializeScenarioOutline(scenario, lines, indent, includeTags);
    } else {
      serializeScenario(scenario, lines, indent, includeTags);
    }
  }

  return lines.join('\n');
}

/**
 * シリアライズオプション
 */
export interface SerializeOptions {
  indent?: string;
  includeComments?: boolean;
  includeTags?: boolean;
}

/**
 * Backgroundをシリアライズ
 */
function serializeBackground(background: GherkinBackground, lines: string[], indent: string): void {
  const namePart = background.name ? `: ${background.name}` : ':';
  lines.push(`${indent}${background.keyword}${namePart}`);

  if (background.description) {
    for (const descLine of background.description.split('\n')) {
      lines.push(`${indent}${indent}${descLine}`);
    }
  }

  for (const step of background.steps) {
    serializeStep(step, lines, indent + indent);
  }
}

/**
 * Scenarioをシリアライズ
 */
function serializeScenario(
  scenario: GherkinScenario,
  lines: string[],
  indent: string,
  includeTags: boolean
): void {
  if (includeTags && scenario.tags.length > 0) {
    lines.push(`${indent}${scenario.tags.join(' ')}`);
  }

  lines.push(`${indent}${scenario.keyword}: ${scenario.name}`);

  if (scenario.description) {
    for (const descLine of scenario.description.split('\n')) {
      lines.push(`${indent}${indent}${descLine}`);
    }
  }

  for (const step of scenario.steps) {
    serializeStep(step, lines, indent + indent);
  }
}

/**
 * ScenarioOutlineをシリアライズ
 */
function serializeScenarioOutline(
  scenario: GherkinScenarioOutline,
  lines: string[],
  indent: string,
  includeTags: boolean
): void {
  if (includeTags && scenario.tags.length > 0) {
    lines.push(`${indent}${scenario.tags.join(' ')}`);
  }

  lines.push(`${indent}${scenario.keyword}: ${scenario.name}`);

  if (scenario.description) {
    for (const descLine of scenario.description.split('\n')) {
      lines.push(`${indent}${indent}${descLine}`);
    }
  }

  for (const step of scenario.steps) {
    serializeStep(step, lines, indent + indent);
  }

  for (const examples of scenario.examples) {
    serializeExamples(examples, lines, indent + indent, includeTags);
  }
}

/**
 * Stepをシリアライズ
 */
function serializeStep(step: GherkinStep, lines: string[], indent: string): void {
  lines.push(`${indent}${step.keyword} ${step.text}`);

  // Doc String
  if (step.docString) {
    lines.push(`${indent}"""`);
    for (const docLine of step.docString.split('\n')) {
      lines.push(`${indent}${docLine}`);
    }
    lines.push(`${indent}"""`);
  }

  // Data Table
  if (step.dataTable) {
    serializeDataTable(step.dataTable, lines, indent);
  }
}

/**
 * Examplesをシリアライズ
 */
function serializeExamples(
  examples: GherkinExamples,
  lines: string[],
  indent: string,
  includeTags: boolean
): void {
  lines.push('');

  if (includeTags && examples.tags.length > 0) {
    lines.push(`${indent}${examples.tags.join(' ')}`);
  }

  const namePart = examples.name ? `: ${examples.name}` : ':';
  lines.push(`${indent}${examples.keyword}${namePart}`);

  serializeDataTable(examples.table, lines, indent + '  ');
}

/**
 * DataTableをシリアライズ
 */
function serializeDataTable(table: GherkinDataTable, lines: string[], indent: string): void {
  const allRows = [table.headers, ...table.rows];
  const columnWidths = calculateColumnWidths(allRows);

  for (const row of allRows) {
    const paddedCells = row.map((cell, i) => cell.padEnd(columnWidths[i]));
    lines.push(`${indent}| ${paddedCells.join(' | ')} |`);
  }
}

/**
 * 列幅を計算
 */
function calculateColumnWidths(rows: string[][]): number[] {
  const widths: number[] = [];
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      widths[i] = Math.max(widths[i] || 0, row[i].length);
    }
  }
  return widths;
}

// ========================================
// バリデーション
// ========================================

/**
 * Gherkinドキュメントを検証
 */
export function validateGherkin(document: GherkinDocument): GherkinParseError[] {
  const errors: GherkinParseError[] = [...document.errors];

  if (!document.feature) {
    errors.push({
      line: 1,
      column: 1,
      message: 'Featureが定義されていません',
    });
    return errors;
  }

  const feature = document.feature;

  // Feature名チェック
  if (!feature.name.trim()) {
    errors.push({
      line: 1,
      column: 1,
      message: 'Feature名が空です',
    });
  }

  // シナリオチェック
  if (feature.scenarios.length === 0) {
    errors.push({
      line: 1,
      column: 1,
      message: 'Scenarioが1つも定義されていません',
    });
  }

  for (const scenario of feature.scenarios) {
    // シナリオ名チェック
    if (!scenario.name.trim()) {
      errors.push({
        line: 1,
        column: 1,
        message: 'Scenario名が空です',
      });
    }

    // ステップチェック
    if (scenario.steps.length === 0) {
      errors.push({
        line: 1,
        column: 1,
        message: `Scenario "${scenario.name}" にステップが定義されていません`,
      });
    }

    // Scenario Outlineの場合、Examplesチェック
    if ('examples' in scenario) {
      const outline = scenario as GherkinScenarioOutline;
      if (outline.examples.length === 0) {
        errors.push({
          line: 1,
          column: 1,
          message: `Scenario Outline "${scenario.name}" にExamplesが定義されていません`,
        });
      }

      // プレースホルダーチェック
      const placeholders = extractPlaceholders(outline);
      for (const examples of outline.examples) {
        for (const placeholder of placeholders) {
          if (!examples.table.headers.includes(placeholder)) {
            errors.push({
              line: 1,
              column: 1,
              message: `プレースホルダー "<${placeholder}>" がExamplesテーブルに定義されていません`,
            });
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Scenario Outlineからプレースホルダーを抽出
 */
function extractPlaceholders(outline: GherkinScenarioOutline): string[] {
  const placeholders = new Set<string>();
  const regex = /<([^>]+)>/g;

  for (const step of outline.steps) {
    let match;
    while ((match = regex.exec(step.text)) !== null) {
      placeholders.add(match[1]);
    }
  }

  return Array.from(placeholders);
}

// ========================================
// フォーマッター
// ========================================

/**
 * Gherkinテキストを整形
 */
export function formatGherkin(text: string, language: GherkinLanguage = 'ja'): string {
  const document = parseGherkin(text, language);
  return serializeGherkin(document, {
    indent: '  ',
    includeComments: true,
    includeTags: true,
  });
}

// ========================================
// エクスポート用ユーティリティ
// ========================================

/**
 * Gherkinを.featureファイル形式でエクスポート
 */
export function exportToFeatureFile(document: GherkinDocument): string {
  return serializeGherkin(document);
}

/**
 * Gherkinを特定のBDDフレームワーク形式でエクスポート
 */
export function exportToBddFormat(
  document: GherkinDocument,
  format: 'CUCUMBER' | 'BEHAVE' | 'SPECFLOW' | 'JBEHAVE'
): string {
  // 基本的にはどのフォーマットもGherkin記法は同じ
  // フレームワーク固有の違いがある場合はここで対応
  switch (format) {
    case 'CUCUMBER':
    case 'BEHAVE':
    case 'SPECFLOW':
    case 'JBEHAVE':
    default:
      return serializeGherkin(document);
  }
}

// Re-export getStepTypeFromKeyword for convenience
export { getStepTypeFromKeyword };
