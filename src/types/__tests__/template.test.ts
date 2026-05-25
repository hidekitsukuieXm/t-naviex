import { describe, it, expect } from 'vitest';
import {
  validateTemplateName,
  validateTemplateDescription,
  validateTemplateTitle,
  validateTemplateSteps,
  validateTemplateSortOrder,
  validateCreateTemplateInput,
  validateUpdateTemplateInput,
} from '../template';

describe('template types', () => {
  describe('validateTemplateName', () => {
    it('should pass for valid name', () => {
      const result = validateTemplateName('テスト用テンプレート');
      expect(result.valid).toBe(true);
    });

    it('should fail for empty name', () => {
      const result = validateTemplateName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('テンプレート名は必須です。');
    });

    it('should fail for whitespace only name', () => {
      const result = validateTemplateName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('テンプレート名は必須です。');
    });

    it('should fail for too long name', () => {
      const result = validateTemplateName('a'.repeat(256));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('テンプレート名は255文字以内で入力してください。');
    });

    it('should pass for max length name', () => {
      const result = validateTemplateName('a'.repeat(255));
      expect(result.valid).toBe(true);
    });
  });

  describe('validateTemplateDescription', () => {
    it('should pass for null', () => {
      const result = validateTemplateDescription(null);
      expect(result.valid).toBe(true);
    });

    it('should pass for undefined', () => {
      const result = validateTemplateDescription(undefined);
      expect(result.valid).toBe(true);
    });

    it('should pass for valid description', () => {
      const result = validateTemplateDescription('有効な説明');
      expect(result.valid).toBe(true);
    });

    it('should fail for too long description', () => {
      const result = validateTemplateDescription('a'.repeat(5001));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('テンプレート説明は5000文字以内で入力してください。');
    });

    it('should pass for max length description', () => {
      const result = validateTemplateDescription('a'.repeat(5000));
      expect(result.valid).toBe(true);
    });
  });

  describe('validateTemplateTitle', () => {
    it('should pass for null', () => {
      const result = validateTemplateTitle(null);
      expect(result.valid).toBe(true);
    });

    it('should pass for undefined', () => {
      const result = validateTemplateTitle(undefined);
      expect(result.valid).toBe(true);
    });

    it('should pass for valid title', () => {
      const result = validateTemplateTitle('タイトルテンプレート');
      expect(result.valid).toBe(true);
    });

    it('should fail for too long title', () => {
      const result = validateTemplateTitle('a'.repeat(501));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('タイトルテンプレートは500文字以内で入力してください。');
    });

    it('should pass for max length title', () => {
      const result = validateTemplateTitle('a'.repeat(500));
      expect(result.valid).toBe(true);
    });
  });

  describe('validateTemplateSteps', () => {
    it('should pass for undefined', () => {
      const result = validateTemplateSteps(undefined);
      expect(result.valid).toBe(true);
    });

    it('should pass for empty array', () => {
      const result = validateTemplateSteps([]);
      expect(result.valid).toBe(true);
    });

    it('should pass for valid steps', () => {
      const result = validateTemplateSteps([
        { stepNo: 1, actionMd: '操作1', expectedMd: '期待結果1' },
        { stepNo: 2, actionMd: '操作2' },
      ]);
      expect(result.valid).toBe(true);
    });

    it('should fail for too many steps', () => {
      const steps = Array.from({ length: 101 }, (_, i) => ({
        stepNo: i + 1,
        actionMd: `操作${i + 1}`,
      }));
      const result = validateTemplateSteps(steps);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('テスト手順は100件以内で指定してください。');
    });

    it('should fail for empty action', () => {
      const result = validateTemplateSteps([{ stepNo: 1, actionMd: '' }]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('手順1のアクションは必須です。');
    });

    it('should fail for whitespace only action', () => {
      const result = validateTemplateSteps([{ stepNo: 1, actionMd: '   ' }]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('手順1のアクションは必須です。');
    });

    it('should fail for too long action', () => {
      const result = validateTemplateSteps([{ stepNo: 1, actionMd: 'a'.repeat(10001) }]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('手順1のアクションは10000文字以内で入力してください。');
    });

    it('should fail for too long expected result', () => {
      const result = validateTemplateSteps([
        { stepNo: 1, actionMd: '操作', expectedMd: 'a'.repeat(10001) },
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('手順1の期待結果は10000文字以内で入力してください。');
    });
  });

  describe('validateTemplateSortOrder', () => {
    it('should pass for undefined', () => {
      const result = validateTemplateSortOrder(undefined);
      expect(result.valid).toBe(true);
    });

    it('should pass for valid sort order', () => {
      const result = validateTemplateSortOrder(100);
      expect(result.valid).toBe(true);
    });

    it('should pass for zero', () => {
      const result = validateTemplateSortOrder(0);
      expect(result.valid).toBe(true);
    });

    it('should fail for non-integer', () => {
      const result = validateTemplateSortOrder(1.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は整数で指定してください。');
    });

    it('should fail for negative number', () => {
      const result = validateTemplateSortOrder(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は0以上の値を指定してください。');
    });

    it('should fail for too large number', () => {
      const result = validateTemplateSortOrder(10000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は9999以下の値を指定してください。');
    });

    it('should pass for max sort order', () => {
      const result = validateTemplateSortOrder(9999);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateCreateTemplateInput', () => {
    it('should pass for valid input', () => {
      const result = validateCreateTemplateInput({
        name: 'テストテンプレート',
        description: '説明',
        title: 'タイトル',
        templateSteps: [{ stepNo: 1, actionMd: '操作' }],
        sortOrder: 1,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for minimal input', () => {
      const result = validateCreateTemplateInput({
        name: 'テストテンプレート',
      });
      expect(result.valid).toBe(true);
    });

    it('should collect multiple errors', () => {
      const result = validateCreateTemplateInput({
        name: '',
        description: 'a'.repeat(5001),
        sortOrder: -1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateUpdateTemplateInput', () => {
    it('should pass for empty input', () => {
      const result = validateUpdateTemplateInput({});
      expect(result.valid).toBe(true);
    });

    it('should pass for partial update', () => {
      const result = validateUpdateTemplateInput({
        description: '新しい説明',
      });
      expect(result.valid).toBe(true);
    });

    it('should validate name only when provided', () => {
      const result = validateUpdateTemplateInput({
        name: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('テンプレート名は必須です。');
    });

    it('should pass for valid name update', () => {
      const result = validateUpdateTemplateInput({
        name: '新しいテンプレート名',
      });
      expect(result.valid).toBe(true);
    });
  });
});
