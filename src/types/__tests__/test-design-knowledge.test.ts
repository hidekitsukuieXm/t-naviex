/**
 * テスト設計ナレッジ型定義テスト
 */

import { describe, it, expect } from 'vitest';
import {
  validateTitle,
  validateTechnique,
  validateContent,
  validateRating,
  validateVersion,
  validateCreateInput,
  getCategoryLabel,
  getStatusLabel,
  getCategoryColor,
  getStatusColor,
  ratingToStars,
  DEFAULT_TECHNIQUES,
  TECHNIQUE_CATEGORY_VALUES,
  STATUS_VALUES,
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  TECHNIQUE_MAX_LENGTH,
  VERSION_MAX_LENGTH,
  RATING_MIN,
  RATING_MAX,
} from '../test-design-knowledge';

describe('Test Design Knowledge Types', () => {
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
      expect(validateTitle('境界値分析の基本')).toEqual({ valid: true });
      expect(validateTitle('abc')).toEqual({ valid: true });
    });
  });

  describe('validateTechnique', () => {
    it('空のテスト技法はエラー', () => {
      expect(validateTechnique('')).toEqual({ valid: false, error: 'テスト技法は必須です' });
    });

    it('長すぎるテスト技法はエラー', () => {
      const longTechnique = 'a'.repeat(TECHNIQUE_MAX_LENGTH + 1);
      expect(validateTechnique(longTechnique).valid).toBe(false);
    });

    it('有効なテスト技法は成功', () => {
      expect(validateTechnique('境界値分析')).toEqual({ valid: true });
      expect(validateTechnique('同値分割')).toEqual({ valid: true });
    });
  });

  describe('validateContent', () => {
    it('空のコンテンツはエラー', () => {
      expect(validateContent('')).toEqual({ valid: false, error: 'コンテンツは必須です' });
      expect(validateContent('  ')).toEqual({ valid: false, error: 'コンテンツは必須です' });
    });

    it('有効なコンテンツは成功', () => {
      expect(validateContent('これはテスト設計ナレッジの内容です')).toEqual({ valid: true });
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
        title: '境界値分析の基本',
        technique: '境界値分析',
        content: 'これはテスト設計ナレッジの内容です',
        version: '1.0.0',
      };
      expect(validateCreateInput(input)).toEqual({ valid: true, errors: [] });
    });

    it('複数のエラーを返す', () => {
      const input = {
        title: '',
        technique: '',
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
      expect(getCategoryLabel('BLACK_BOX')).toBe('ブラックボックス');
      expect(getCategoryLabel('WHITE_BOX')).toBe('ホワイトボックス');
      expect(getCategoryLabel('EXPERIENCE_BASED')).toBe('経験ベース');
      expect(getCategoryLabel('STRUCTURE_BASED')).toBe('構造ベース');
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

  describe('getCategoryColor', () => {
    it('正しい色クラスを返す', () => {
      expect(getCategoryColor('BLACK_BOX')).toContain('blue');
      expect(getCategoryColor('WHITE_BOX')).toContain('purple');
      expect(getCategoryColor('EXPERIENCE_BASED')).toContain('orange');
      expect(getCategoryColor('STRUCTURE_BASED')).toContain('green');
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

  describe('DEFAULT_TECHNIQUES', () => {
    it('デフォルトテスト技法が定義されている', () => {
      expect(DEFAULT_TECHNIQUES).toBeDefined();
      expect(DEFAULT_TECHNIQUES.length).toBeGreaterThan(0);
      expect(DEFAULT_TECHNIQUES).toContain('同値分割');
      expect(DEFAULT_TECHNIQUES).toContain('境界値分析');
      expect(DEFAULT_TECHNIQUES).toContain('デシジョンテーブル');
    });
  });

  describe('TECHNIQUE_CATEGORY_VALUES', () => {
    it('テスト技法カテゴリが定義されている', () => {
      expect(TECHNIQUE_CATEGORY_VALUES).toBeDefined();
      expect(TECHNIQUE_CATEGORY_VALUES).toContain('BLACK_BOX');
      expect(TECHNIQUE_CATEGORY_VALUES).toContain('WHITE_BOX');
      expect(TECHNIQUE_CATEGORY_VALUES).toContain('EXPERIENCE_BASED');
      expect(TECHNIQUE_CATEGORY_VALUES).toContain('STRUCTURE_BASED');
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

  describe('Constants', () => {
    it('定数が正しく定義されている', () => {
      expect(TITLE_MIN_LENGTH).toBe(3);
      expect(TITLE_MAX_LENGTH).toBe(255);
      expect(TECHNIQUE_MAX_LENGTH).toBe(100);
      expect(VERSION_MAX_LENGTH).toBe(20);
      expect(RATING_MIN).toBe(1);
      expect(RATING_MAX).toBe(5);
    });
  });
});
