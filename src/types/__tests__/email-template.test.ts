import { describe, it, expect } from 'vitest';
import {
  validateEmailTemplate,
  substituteVariables,
  extractVariables,
  EMAIL_TEMPLATE_TYPE_LABELS,
  DEFAULT_TEMPLATE_VARIABLES,
} from '../email-template';

describe('Email Template Types', () => {
  describe('validateEmailTemplate', () => {
    it('should return valid for empty object', () => {
      const result = validateEmailTemplate({});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when name is empty', () => {
      const result = validateEmailTemplate({ name: '', subject: 'Test', body: 'Test' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'テンプレート名を入力してください。',
      });
    });

    it('should return error when name is too long', () => {
      const result = validateEmailTemplate({
        name: 'a'.repeat(101),
        subject: 'Test',
        body: 'Test',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'テンプレート名は100文字以内で入力してください。',
      });
    });

    it('should return error when name contains invalid characters', () => {
      const result = validateEmailTemplate({
        name: 'test template', // スペースは無効
        subject: 'Test',
        body: 'Test',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'テンプレート名は英数字、ハイフン、アンダースコアのみ使用できます。',
      });
    });

    it('should return error when subject is empty', () => {
      const result = validateEmailTemplate({ name: 'test', subject: '', body: 'Test' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'subject',
        message: '件名を入力してください。',
      });
    });

    it('should return error when subject is too long', () => {
      const result = validateEmailTemplate({
        name: 'test',
        subject: 'a'.repeat(501),
        body: 'Test',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'subject',
        message: '件名は500文字以内で入力してください。',
      });
    });

    it('should return error when body is empty', () => {
      const result = validateEmailTemplate({ name: 'test', subject: 'Test', body: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'body',
        message: '本文を入力してください。',
      });
    });

    it('should return error when description is too long', () => {
      const result = validateEmailTemplate({
        name: 'test',
        subject: 'Test',
        body: 'Test',
        description: 'a'.repeat(501),
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'description',
        message: '説明は500文字以内で入力してください。',
      });
    });

    it('should return valid for valid template', () => {
      const result = validateEmailTemplate({
        name: 'test-template',
        subject: 'Test Subject',
        body: '<p>Test Body</p>',
        description: 'Test description',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('substituteVariables', () => {
    it('should substitute single variable', () => {
      const template = 'Hello, {{userName}}!';
      const result = substituteVariables(template, { userName: 'John' });
      expect(result).toBe('Hello, John!');
    });

    it('should substitute multiple variables', () => {
      const template = 'Hello, {{userName}}! Your project is {{projectName}}.';
      const result = substituteVariables(template, {
        userName: 'John',
        projectName: 'Test Project',
      });
      expect(result).toBe('Hello, John! Your project is Test Project.');
    });

    it('should handle variables with spaces', () => {
      const template = 'Hello, {{ userName }}!';
      const result = substituteVariables(template, { userName: 'John' });
      expect(result).toBe('Hello, John!');
    });

    it('should keep undefined variables as-is', () => {
      const template = 'Hello, {{userName}}! Your email is {{userEmail}}.';
      const result = substituteVariables(template, { userName: 'John' });
      expect(result).toBe('Hello, John! Your email is {{userEmail}}.');
    });

    it('should handle number values', () => {
      const template = 'You have {{count}} new messages.';
      const result = substituteVariables(template, { count: 5 });
      expect(result).toBe('You have 5 new messages.');
    });

    it('should handle boolean values', () => {
      const template = 'Active: {{isActive}}';
      const result = substituteVariables(template, { isActive: true });
      expect(result).toBe('Active: true');
    });

    it('should handle null values', () => {
      const template = 'Value: {{value}}';
      const result = substituteVariables(template, { value: null });
      expect(result).toBe('Value: ');
    });
  });

  describe('extractVariables', () => {
    it('should extract single variable', () => {
      const template = 'Hello, {{userName}}!';
      const result = extractVariables(template);
      expect(result).toEqual(['userName']);
    });

    it('should extract multiple variables', () => {
      const template = 'Hello, {{userName}}! Your project is {{projectName}}.';
      const result = extractVariables(template);
      expect(result).toEqual(['userName', 'projectName']);
    });

    it('should extract unique variables', () => {
      const template = 'Hello, {{userName}}! Goodbye, {{userName}}!';
      const result = extractVariables(template);
      expect(result).toEqual(['userName']);
    });

    it('should handle variables with spaces', () => {
      const template = 'Hello, {{ userName }}!';
      const result = extractVariables(template);
      expect(result).toEqual(['userName']);
    });

    it('should return empty array for no variables', () => {
      const template = 'Hello, World!';
      const result = extractVariables(template);
      expect(result).toEqual([]);
    });
  });

  describe('EMAIL_TEMPLATE_TYPE_LABELS', () => {
    it('should have labels for all types', () => {
      expect(EMAIL_TEMPLATE_TYPE_LABELS.WELCOME).toBe('ウェルカムメール');
      expect(EMAIL_TEMPLATE_TYPE_LABELS.PASSWORD_RESET).toBe('パスワードリセット');
      expect(EMAIL_TEMPLATE_TYPE_LABELS.TEST_ASSIGNED).toBe('テスト割当通知');
      expect(EMAIL_TEMPLATE_TYPE_LABELS.BUG_REPORTED).toBe('バグ報告通知');
      expect(EMAIL_TEMPLATE_TYPE_LABELS.REVIEW_REQUEST).toBe('レビュー依頼');
    });
  });

  describe('DEFAULT_TEMPLATE_VARIABLES', () => {
    it('should have variables for WELCOME template', () => {
      expect(DEFAULT_TEMPLATE_VARIABLES.WELCOME).toContain('userName');
      expect(DEFAULT_TEMPLATE_VARIABLES.WELCOME).toContain('loginUrl');
    });

    it('should have variables for PASSWORD_RESET template', () => {
      expect(DEFAULT_TEMPLATE_VARIABLES.PASSWORD_RESET).toContain('userName');
      expect(DEFAULT_TEMPLATE_VARIABLES.PASSWORD_RESET).toContain('resetLink');
      expect(DEFAULT_TEMPLATE_VARIABLES.PASSWORD_RESET).toContain('expiresIn');
    });

    it('should have variables for TEST_ASSIGNED template', () => {
      expect(DEFAULT_TEMPLATE_VARIABLES.TEST_ASSIGNED).toContain('userName');
      expect(DEFAULT_TEMPLATE_VARIABLES.TEST_ASSIGNED).toContain('testCaseTitle');
      expect(DEFAULT_TEMPLATE_VARIABLES.TEST_ASSIGNED).toContain('projectName');
    });

    it('should have variables for BUG_REPORTED template', () => {
      expect(DEFAULT_TEMPLATE_VARIABLES.BUG_REPORTED).toContain('bugTitle');
      expect(DEFAULT_TEMPLATE_VARIABLES.BUG_REPORTED).toContain('severity');
      expect(DEFAULT_TEMPLATE_VARIABLES.BUG_REPORTED).toContain('priority');
    });
  });
});
