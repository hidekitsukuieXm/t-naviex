import { describe, it, expect } from 'vitest';
import {
  validateTagName,
  validateTagColor,
  validateTagDescription,
  validateCreateTagInput,
  validateUpdateTagInput,
  TAG_VALIDATION,
} from '../tag';

describe('Tag Validation', () => {
  describe('validateTagName', () => {
    it('should return valid for normal tag name', () => {
      const result = validateTagName('Bug');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for empty string', () => {
      const result = validateTagName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('タグ名は必須です。');
    });

    it('should return invalid for whitespace only', () => {
      const result = validateTagName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('タグ名は必須です。');
    });

    it('should return invalid for too long name', () => {
      const longName = 'a'.repeat(TAG_VALIDATION.NAME_MAX_LENGTH + 1);
      const result = validateTagName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${TAG_VALIDATION.NAME_MAX_LENGTH}文字以下`);
    });

    it('should return valid for max length name', () => {
      const maxName = 'a'.repeat(TAG_VALIDATION.NAME_MAX_LENGTH);
      const result = validateTagName(maxName);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateTagColor', () => {
    it('should return valid for correct hex color', () => {
      const result = validateTagColor('#3b82f6');
      expect(result.valid).toBe(true);
    });

    it('should return valid for uppercase hex color', () => {
      const result = validateTagColor('#3B82F6');
      expect(result.valid).toBe(true);
    });

    it('should return valid for empty string (optional)', () => {
      const result = validateTagColor('');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for short hex', () => {
      const result = validateTagColor('#fff');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('#RRGGBB');
    });

    it('should return invalid for missing hash', () => {
      const result = validateTagColor('3b82f6');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('#RRGGBB');
    });

    it('should return invalid for invalid characters', () => {
      const result = validateTagColor('#GGGGGG');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('#RRGGBB');
    });

    it('should return invalid for color name', () => {
      const result = validateTagColor('red');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('#RRGGBB');
    });
  });

  describe('validateTagDescription', () => {
    it('should return valid for normal description', () => {
      const result = validateTagDescription('This is a description');
      expect(result.valid).toBe(true);
    });

    it('should return valid for null (optional)', () => {
      const result = validateTagDescription(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined (optional)', () => {
      const result = validateTagDescription(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for empty string (optional)', () => {
      const result = validateTagDescription('');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for too long description', () => {
      const longDesc = 'a'.repeat(TAG_VALIDATION.DESCRIPTION_MAX_LENGTH + 1);
      const result = validateTagDescription(longDesc);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${TAG_VALIDATION.DESCRIPTION_MAX_LENGTH}文字以下`);
    });

    it('should return valid for max length description', () => {
      const maxDesc = 'a'.repeat(TAG_VALIDATION.DESCRIPTION_MAX_LENGTH);
      const result = validateTagDescription(maxDesc);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateCreateTagInput', () => {
    it('should return valid for valid input', () => {
      const result = validateCreateTagInput({
        projectId: '1',
        name: 'Bug',
        color: '#ef4444',
        description: 'Bug issues',
      });
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should return valid for minimal input', () => {
      const result = validateCreateTagInput({
        projectId: '1',
        name: 'Bug',
      });
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should return invalid for empty name', () => {
      const result = validateCreateTagInput({
        projectId: '1',
        name: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBeDefined();
    });

    it('should return invalid for invalid color', () => {
      const result = validateCreateTagInput({
        projectId: '1',
        name: 'Bug',
        color: 'red',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.color).toBeDefined();
    });

    it('should return invalid for too long description', () => {
      const result = validateCreateTagInput({
        projectId: '1',
        name: 'Bug',
        description: 'a'.repeat(TAG_VALIDATION.DESCRIPTION_MAX_LENGTH + 1),
      });
      expect(result.valid).toBe(false);
      expect(result.errors.description).toBeDefined();
    });

    it('should return multiple errors', () => {
      const result = validateCreateTagInput({
        projectId: '1',
        name: '',
        color: 'invalid',
        description: 'a'.repeat(TAG_VALIDATION.DESCRIPTION_MAX_LENGTH + 1),
      });
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.color).toBeDefined();
      expect(result.errors.description).toBeDefined();
    });
  });

  describe('validateUpdateTagInput', () => {
    it('should return valid for empty input', () => {
      const result = validateUpdateTagInput({});
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should return valid for valid name', () => {
      const result = validateUpdateTagInput({ name: 'NewName' });
      expect(result.valid).toBe(true);
    });

    it('should return invalid for empty name', () => {
      const result = validateUpdateTagInput({ name: '' });
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBeDefined();
    });

    it('should return valid for valid color', () => {
      const result = validateUpdateTagInput({ color: '#22c55e' });
      expect(result.valid).toBe(true);
    });

    it('should return invalid for invalid color', () => {
      const result = validateUpdateTagInput({ color: 'green' });
      expect(result.valid).toBe(false);
      expect(result.errors.color).toBeDefined();
    });

    it('should return valid for valid description', () => {
      const result = validateUpdateTagInput({ description: 'New description' });
      expect(result.valid).toBe(true);
    });

    it('should return invalid for too long description', () => {
      const result = validateUpdateTagInput({
        description: 'a'.repeat(TAG_VALIDATION.DESCRIPTION_MAX_LENGTH + 1),
      });
      expect(result.valid).toBe(false);
      expect(result.errors.description).toBeDefined();
    });
  });
});
