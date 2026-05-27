/**
 * Gherkin Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  GherkinStepType,
  GHERKIN_KEYWORDS,
  getStepKeyword,
  getStepTypeFromKeyword,
  getStepTypeColor,
  getStepTypeLabel,
  createEmptyFeature,
  createEmptyScenario,
  createEmptyStep,
} from '../gherkin';

describe('Gherkin Types', () => {
  describe('GherkinStepType', () => {
    it('すべてのステップタイプが定義されている', () => {
      expect(GherkinStepType.GIVEN).toBe('GIVEN');
      expect(GherkinStepType.WHEN).toBe('WHEN');
      expect(GherkinStepType.THEN).toBe('THEN');
      expect(GherkinStepType.AND).toBe('AND');
      expect(GherkinStepType.BUT).toBe('BUT');
    });
  });

  describe('GHERKIN_KEYWORDS', () => {
    it('日本語キーワードが定義されている', () => {
      const ja = GHERKIN_KEYWORDS.ja;
      expect(ja.feature).toBe('機能');
      expect(ja.background).toBe('背景');
      expect(ja.scenario).toBe('シナリオ');
      expect(ja.scenarioOutline).toBe('シナリオアウトライン');
      expect(ja.examples).toBe('例');
      expect(ja.given).toBe('前提');
      expect(ja.when).toBe('もし');
      expect(ja.then).toBe('ならば');
      expect(ja.and).toBe('かつ');
      expect(ja.but).toBe('しかし');
    });

    it('英語キーワードが定義されている', () => {
      const en = GHERKIN_KEYWORDS.en;
      expect(en.feature).toBe('Feature');
      expect(en.background).toBe('Background');
      expect(en.scenario).toBe('Scenario');
      expect(en.scenarioOutline).toBe('Scenario Outline');
      expect(en.examples).toBe('Examples');
      expect(en.given).toBe('Given');
      expect(en.when).toBe('When');
      expect(en.then).toBe('Then');
      expect(en.and).toBe('And');
      expect(en.but).toBe('But');
    });
  });

  describe('getStepKeyword', () => {
    it('日本語キーワードを取得できる', () => {
      expect(getStepKeyword('GIVEN', 'ja')).toBe('前提');
      expect(getStepKeyword('WHEN', 'ja')).toBe('もし');
      expect(getStepKeyword('THEN', 'ja')).toBe('ならば');
      expect(getStepKeyword('AND', 'ja')).toBe('かつ');
      expect(getStepKeyword('BUT', 'ja')).toBe('しかし');
    });

    it('英語キーワードを取得できる', () => {
      expect(getStepKeyword('GIVEN', 'en')).toBe('Given');
      expect(getStepKeyword('WHEN', 'en')).toBe('When');
      expect(getStepKeyword('THEN', 'en')).toBe('Then');
      expect(getStepKeyword('AND', 'en')).toBe('And');
      expect(getStepKeyword('BUT', 'en')).toBe('But');
    });

    it('デフォルトは日本語', () => {
      expect(getStepKeyword('GIVEN')).toBe('前提');
    });
  });

  describe('getStepTypeFromKeyword', () => {
    it('日本語キーワードからタイプを取得できる', () => {
      expect(getStepTypeFromKeyword('前提')).toBe('GIVEN');
      expect(getStepTypeFromKeyword('もし')).toBe('WHEN');
      expect(getStepTypeFromKeyword('ならば')).toBe('THEN');
      expect(getStepTypeFromKeyword('かつ')).toBe('AND');
      expect(getStepTypeFromKeyword('しかし')).toBe('BUT');
    });

    it('英語キーワードからタイプを取得できる', () => {
      expect(getStepTypeFromKeyword('given')).toBe('GIVEN');
      expect(getStepTypeFromKeyword('when')).toBe('WHEN');
      expect(getStepTypeFromKeyword('then')).toBe('THEN');
      expect(getStepTypeFromKeyword('and')).toBe('AND');
      expect(getStepTypeFromKeyword('but')).toBe('BUT');
    });

    it('大文字小文字を区別しない', () => {
      expect(getStepTypeFromKeyword('GIVEN')).toBe('GIVEN');
      expect(getStepTypeFromKeyword('Given')).toBe('GIVEN');
      expect(getStepTypeFromKeyword('given')).toBe('GIVEN');
    });

    it('不明なキーワードはnullを返す', () => {
      expect(getStepTypeFromKeyword('unknown')).toBeNull();
      expect(getStepTypeFromKeyword('')).toBeNull();
    });
  });

  describe('getStepTypeColor', () => {
    it('各タイプに色が設定されている', () => {
      expect(getStepTypeColor('GIVEN')).toBe('#3b82f6');
      expect(getStepTypeColor('WHEN')).toBe('#f59e0b');
      expect(getStepTypeColor('THEN')).toBe('#22c55e');
      expect(getStepTypeColor('AND')).toBe('#6b7280');
      expect(getStepTypeColor('BUT')).toBe('#ef4444');
    });
  });

  describe('getStepTypeLabel', () => {
    it('各タイプに日本語ラベルが設定されている', () => {
      expect(getStepTypeLabel('GIVEN')).toBe('前提条件');
      expect(getStepTypeLabel('WHEN')).toBe('アクション');
      expect(getStepTypeLabel('THEN')).toBe('期待結果');
      expect(getStepTypeLabel('AND')).toBe('追加条件');
      expect(getStepTypeLabel('BUT')).toBe('例外条件');
    });
  });

  describe('createEmptyFeature', () => {
    it('空のFeatureを生成できる（日本語）', () => {
      const feature = createEmptyFeature('ja');
      expect(feature.keyword).toBe('機能');
      expect(feature.name).toBe('');
      expect(feature.tags).toEqual([]);
      expect(feature.language).toBe('ja');
      expect(feature.scenarios).toEqual([]);
    });

    it('空のFeatureを生成できる（英語）', () => {
      const feature = createEmptyFeature('en');
      expect(feature.keyword).toBe('Feature');
      expect(feature.language).toBe('en');
    });
  });

  describe('createEmptyScenario', () => {
    it('空のScenarioを生成できる（日本語）', () => {
      const scenario = createEmptyScenario('ja');
      expect(scenario.keyword).toBe('シナリオ');
      expect(scenario.name).toBe('');
      expect(scenario.tags).toEqual([]);
      expect(scenario.steps).toEqual([]);
    });

    it('空のScenarioを生成できる（英語）', () => {
      const scenario = createEmptyScenario('en');
      expect(scenario.keyword).toBe('Scenario');
    });
  });

  describe('createEmptyStep', () => {
    it('空のStepを生成できる', () => {
      const step = createEmptyStep('GIVEN', 'ja');
      expect(step.type).toBe('GIVEN');
      expect(step.keyword).toBe('前提');
      expect(step.text).toBe('');
    });

    it('各タイプのStepを生成できる', () => {
      expect(createEmptyStep('WHEN', 'ja').keyword).toBe('もし');
      expect(createEmptyStep('THEN', 'ja').keyword).toBe('ならば');
      expect(createEmptyStep('AND', 'ja').keyword).toBe('かつ');
      expect(createEmptyStep('BUT', 'ja').keyword).toBe('しかし');
    });
  });
});
