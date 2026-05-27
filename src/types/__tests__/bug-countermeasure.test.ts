/**
 * バグ対策ナレッジ型定義テスト
 */

import { describe, it, expect } from 'vitest';
import {
  validateTitle,
  validateBugPattern,
  validateContent,
  validateRating,
  validateVersion,
  validateCreateInput,
  getCategoryLabel,
  getStatusLabel,
  getSeverityLevelLabel,
  getCategoryColor,
  getStatusColor,
  getSeverityLevelColor,
  ratingToStars,
  DEFAULT_BUG_PATTERNS,
  COUNTERMEASURE_CATEGORY_VALUES,
  STATUS_VALUES,
  SEVERITY_LEVEL_VALUES,
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  BUG_PATTERN_MAX_LENGTH,
  VERSION_MAX_LENGTH,
  RATING_MIN,
  RATING_MAX,
} from '../bug-countermeasure';

describe('Bug Countermeasure Types', () => {
  describe('validateTitle', () => {
    it('空のタイトルはエラー', () => {
      expect(validateTitle('')).toEqual({ valid: false, error: 'タイトルは必須です' });
      expect(validateTitle('  ')).toEqual({ valid: false, error: 'タイトルは必須です' });
    });

    it('短すぎるタイトルはエラー', () => {
      expect(validateTitle('ab').valid).toBe(false);
      expect(validateTitle('ab').error).toContain(`${TITLE_MIN_LENGTH}文字以上`);
    });

    it('長すぎるタイトルはエラー', () => {
      const longTitle = 'a'.repeat(TITLE_MAX_LENGTH + 1);
      expect(validateTitle(longTitle).valid).toBe(false);
      expect(validateTitle(longTitle).error).toContain(`${TITLE_MAX_LENGTH}文字以下`);
    });

    it('有効なタイトルは成功', () => {
      expect(validateTitle('Null参照エラー対策')).toEqual({ valid: true });
      expect(validateTitle('abc')).toEqual({ valid: true });
    });
  });

  describe('validateBugPattern', () => {
    it('空のバグパターンはエラー', () => {
      expect(validateBugPattern('')).toEqual({ valid: false, error: 'バグパターンは必須です' });
    });

    it('長すぎるバグパターンはエラー', () => {
      const longPattern = 'a'.repeat(BUG_PATTERN_MAX_LENGTH + 1);
      expect(validateBugPattern(longPattern).valid).toBe(false);
    });

    it('有効なバグパターンは成功', () => {
      expect(validateBugPattern('Null参照エラー')).toEqual({ valid: true });
      expect(validateBugPattern('境界値エラー')).toEqual({ valid: true });
    });
  });

  describe('validateContent', () => {
    it('空のコンテンツはエラー', () => {
      expect(validateContent('')).toEqual({ valid: false, error: 'コンテンツは必須です' });
      expect(validateContent('  ')).toEqual({ valid: false, error: 'コンテンツは必須です' });
    });

    it('有効なコンテンツは成功', () => {
      expect(validateContent('これはバグ対策ナレッジの内容です')).toEqual({ valid: true });
    });
  });

  describe('validateRating', () => {
    it('整数でない評価はエラー', () => {
      expect(validateRating(3.5).valid).toBe(false);
      expect(validateRating(3.5).error).toContain('整数');
    });

    it('範囲外の評価はエラー', () => {
      expect(validateRating(0).valid).toBe(false);
      expect(validateRating(0).error).toContain(`${RATING_MIN}から${RATING_MAX}`);
      expect(validateRating(6).valid).toBe(false);
      expect(validateRating(6).error).toContain(`${RATING_MIN}から${RATING_MAX}`);
    });

    it('有効な評価は成功', () => {
      expect(validateRating(1)).toEqual({ valid: true });
      expect(validateRating(3)).toEqual({ valid: true });
      expect(validateRating(5)).toEqual({ valid: true });
    });
  });

  describe('validateVersion', () => {
    it('空のバージョンは成功（オプショナル）', () => {
      expect(validateVersion('')).toEqual({ valid: true });
    });

    it('長すぎるバージョンはエラー', () => {
      const longVersion = '1.0.0-' + 'a'.repeat(VERSION_MAX_LENGTH);
      expect(validateVersion(longVersion).valid).toBe(false);
    });

    it('無効なバージョン形式はエラー', () => {
      expect(validateVersion('v1.0').valid).toBe(false);
      expect(validateVersion('1.0').valid).toBe(false);
      expect(validateVersion('abc').valid).toBe(false);
    });

    it('有効なセマンティックバージョンは成功', () => {
      expect(validateVersion('1.0.0')).toEqual({ valid: true });
      expect(validateVersion('2.1.3')).toEqual({ valid: true });
      expect(validateVersion('1.0.0-beta')).toEqual({ valid: true });
      expect(validateVersion('1.0.0-alpha.1')).toEqual({ valid: true });
      expect(validateVersion('1.0.0+build.123')).toEqual({ valid: true });
    });
  });

  describe('validateCreateInput', () => {
    it('有効な入力は成功', () => {
      const input = {
        title: 'Null参照エラー対策',
        bugPattern: 'Null参照エラー',
        content: 'これはバグ対策ナレッジの内容です',
        version: '1.0.0',
      };
      expect(validateCreateInput(input)).toEqual({ valid: true, errors: [] });
    });

    it('複数のエラーを返す', () => {
      const input = {
        title: '',
        bugPattern: '',
        content: '',
        version: 'invalid',
      };
      const result = validateCreateInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getCategoryLabel', () => {
    it('正しいラベルを返す', () => {
      expect(getCategoryLabel('PREVENTION')).toBe('予防策');
      expect(getCategoryLabel('DETECTION')).toBe('検出策');
      expect(getCategoryLabel('CORRECTION')).toBe('修正策');
      expect(getCategoryLabel('ROOT_CAUSE')).toBe('根本原因対策');
      expect(getCategoryLabel('PROCESS')).toBe('プロセス改善');
      expect(getCategoryLabel('TOOL')).toBe('ツール活用');
      expect(getCategoryLabel('OTHER')).toBe('その他');
    });
  });

  describe('getStatusLabel', () => {
    it('正しいラベルを返す', () => {
      expect(getStatusLabel('DRAFT')).toBe('下書き');
      expect(getStatusLabel('ACTIVE')).toBe('アクティブ');
      expect(getStatusLabel('DEPRECATED')).toBe('非推奨');
      expect(getStatusLabel('ARCHIVED')).toBe('アーカイブ');
    });
  });

  describe('getSeverityLevelLabel', () => {
    it('正しいラベルを返す', () => {
      expect(getSeverityLevelLabel('CRITICAL')).toBe('致命的');
      expect(getSeverityLevelLabel('MAJOR')).toBe('重大');
      expect(getSeverityLevelLabel('MINOR')).toBe('軽微');
      expect(getSeverityLevelLabel('TRIVIAL')).toBe('軽度');
    });
  });

  describe('getCategoryColor', () => {
    it('正しい色クラスを返す', () => {
      expect(getCategoryColor('PREVENTION')).toContain('green');
      expect(getCategoryColor('DETECTION')).toContain('blue');
      expect(getCategoryColor('CORRECTION')).toContain('orange');
      expect(getCategoryColor('ROOT_CAUSE')).toContain('purple');
      expect(getCategoryColor('PROCESS')).toContain('cyan');
      expect(getCategoryColor('TOOL')).toContain('indigo');
      expect(getCategoryColor('OTHER')).toContain('gray');
    });
  });

  describe('getStatusColor', () => {
    it('正しい色クラスを返す', () => {
      expect(getStatusColor('DRAFT')).toContain('gray');
      expect(getStatusColor('ACTIVE')).toContain('green');
      expect(getStatusColor('DEPRECATED')).toContain('yellow');
      expect(getStatusColor('ARCHIVED')).toContain('red');
    });
  });

  describe('getSeverityLevelColor', () => {
    it('正しい色クラスを返す', () => {
      expect(getSeverityLevelColor('CRITICAL')).toContain('red');
      expect(getSeverityLevelColor('MAJOR')).toContain('orange');
      expect(getSeverityLevelColor('MINOR')).toContain('yellow');
      expect(getSeverityLevelColor('TRIVIAL')).toContain('gray');
    });
  });

  describe('ratingToStars', () => {
    it('正しい星を返す', () => {
      expect(ratingToStars(0)).toBe('☆☆☆☆☆');
      expect(ratingToStars(1)).toBe('★☆☆☆☆');
      expect(ratingToStars(2.5)).toBe('★★☆☆☆');
      expect(ratingToStars(3)).toBe('★★★☆☆');
      expect(ratingToStars(4.5)).toBe('★★★★☆');
      expect(ratingToStars(5)).toBe('★★★★★');
    });
  });

  describe('DEFAULT_BUG_PATTERNS', () => {
    it('デフォルトバグパターンが定義されている', () => {
      expect(DEFAULT_BUG_PATTERNS).toBeDefined();
      expect(DEFAULT_BUG_PATTERNS.length).toBeGreaterThan(0);
      expect(DEFAULT_BUG_PATTERNS).toContain('Null参照エラー');
      expect(DEFAULT_BUG_PATTERNS).toContain('境界値エラー');
      expect(DEFAULT_BUG_PATTERNS).toContain('レースコンディション');
    });
  });

  describe('COUNTERMEASURE_CATEGORY_VALUES', () => {
    it('バグ対策カテゴリが定義されている', () => {
      expect(COUNTERMEASURE_CATEGORY_VALUES).toBeDefined();
      expect(COUNTERMEASURE_CATEGORY_VALUES).toContain('PREVENTION');
      expect(COUNTERMEASURE_CATEGORY_VALUES).toContain('DETECTION');
      expect(COUNTERMEASURE_CATEGORY_VALUES).toContain('CORRECTION');
      expect(COUNTERMEASURE_CATEGORY_VALUES).toContain('ROOT_CAUSE');
    });
  });

  describe('STATUS_VALUES', () => {
    it('ステータス値が定義されている', () => {
      expect(STATUS_VALUES).toBeDefined();
      expect(STATUS_VALUES).toContain('DRAFT');
      expect(STATUS_VALUES).toContain('ACTIVE');
      expect(STATUS_VALUES).toContain('DEPRECATED');
      expect(STATUS_VALUES).toContain('ARCHIVED');
    });
  });

  describe('SEVERITY_LEVEL_VALUES', () => {
    it('深刻度レベル値が定義されている', () => {
      expect(SEVERITY_LEVEL_VALUES).toBeDefined();
      expect(SEVERITY_LEVEL_VALUES).toContain('CRITICAL');
      expect(SEVERITY_LEVEL_VALUES).toContain('MAJOR');
      expect(SEVERITY_LEVEL_VALUES).toContain('MINOR');
      expect(SEVERITY_LEVEL_VALUES).toContain('TRIVIAL');
    });
  });

  describe('Constants', () => {
    it('定数が正しく定義されている', () => {
      expect(TITLE_MIN_LENGTH).toBe(3);
      expect(TITLE_MAX_LENGTH).toBe(255);
      expect(BUG_PATTERN_MAX_LENGTH).toBe(100);
      expect(VERSION_MAX_LENGTH).toBe(20);
      expect(RATING_MIN).toBe(1);
      expect(RATING_MAX).toBe(5);
    });
  });
});
