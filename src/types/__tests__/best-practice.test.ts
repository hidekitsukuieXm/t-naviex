/**
 * ベストプラクティス型定義テスト
 */

import { describe, it, expect } from 'vitest';
import {
  validateTitle,
  validateCategory,
  validateContent,
  validateRating,
  validateVersion,
  validateCreateInput,
  getComplexityLabel,
  getStatusLabel,
  getComplexityColor,
  getStatusColor,
  ratingToStars,
  DEFAULT_CATEGORIES,
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  CATEGORY_MAX_LENGTH,
  VERSION_MAX_LENGTH,
  RATING_MIN,
  RATING_MAX,
} from '../best-practice';

describe('Best Practice Types', () => {
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
      expect(validateTitle('テスト設計のベストプラクティス')).toEqual({ valid: true });
      expect(validateTitle('abc')).toEqual({ valid: true });
    });
  });

  describe('validateCategory', () => {
    it('空のカテゴリはエラー', () => {
      expect(validateCategory('')).toEqual({ valid: false, error: 'カテゴリは必須です' });
    });

    it('長すぎるカテゴリはエラー', () => {
      const longCategory = 'a'.repeat(CATEGORY_MAX_LENGTH + 1);
      expect(validateCategory(longCategory).valid).toBe(false);
    });

    it('有効なカテゴリは成功', () => {
      expect(validateCategory('テスト設計')).toEqual({ valid: true });
    });
  });

  describe('validateContent', () => {
    it('空のコンテンツはエラー', () => {
      expect(validateContent('')).toEqual({ valid: false, error: 'コンテンツは必須です' });
      expect(validateContent('  ')).toEqual({ valid: false, error: 'コンテンツは必須です' });
    });

    it('有効なコンテンツは成功', () => {
      expect(validateContent('これはベストプラクティスの内容です')).toEqual({ valid: true });
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
        title: 'テスト設計のベストプラクティス',
        category: 'テスト設計',
        content: 'これはベストプラクティスの内容です',
        version: '1.0.0',
      };
      expect(validateCreateInput(input)).toEqual({ valid: true, errors: [] });
    });

    it('複数のエラーを返す', () => {
      const input = {
        title: '',
        category: '',
        content: '',
        version: 'invalid',
      };
      const result = validateCreateInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getComplexityLabel', () => {
    it('正しいラベルを返す', () => {
      expect(getComplexityLabel('LOW')).toBe('低');
      expect(getComplexityLabel('MEDIUM')).toBe('中');
      expect(getComplexityLabel('HIGH')).toBe('高');
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

  describe('getComplexityColor', () => {
    it('正しい色クラスを返す', () => {
      expect(getComplexityColor('LOW')).toContain('green');
      expect(getComplexityColor('MEDIUM')).toContain('yellow');
      expect(getComplexityColor('HIGH')).toContain('red');
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
      expect(ratingToStars(2.5)).toBe('★★☆☆☆'); // 2 full + 1 half + 2 empty = 5 chars
      expect(ratingToStars(3)).toBe('★★★☆☆');
      expect(ratingToStars(4.5)).toBe('★★★★☆'); // 4 full + 1 half + 0 empty = 5 chars
      expect(ratingToStars(5)).toBe('★★★★★');
    });
  });

  describe('DEFAULT_CATEGORIES', () => {
    it('デフォルトカテゴリが定義されている', () => {
      expect(DEFAULT_CATEGORIES).toBeDefined();
      expect(DEFAULT_CATEGORIES.length).toBeGreaterThan(0);
      expect(DEFAULT_CATEGORIES).toContain('テスト設計');
      expect(DEFAULT_CATEGORIES).toContain('テスト実行');
      expect(DEFAULT_CATEGORIES).toContain('バグ管理');
    });
  });

  describe('Constants', () => {
    it('定数が正しく定義されている', () => {
      expect(TITLE_MIN_LENGTH).toBe(3);
      expect(TITLE_MAX_LENGTH).toBe(255);
      expect(CATEGORY_MAX_LENGTH).toBe(100);
      expect(VERSION_MAX_LENGTH).toBe(20);
      expect(RATING_MIN).toBe(1);
      expect(RATING_MAX).toBe(5);
    });
  });
});
