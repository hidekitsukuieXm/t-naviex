import { describe, it, expect } from 'vitest';
import {
  type ProjectStatus,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_OPTIONS,
  VALID_PROJECT_STATUSES,
  validateProjectName,
  validateProject,
} from '../project';

describe('Project Types', () => {
  describe('PROJECT_STATUS_LABELS', () => {
    it('should have labels for all project statuses', () => {
      const statuses: ProjectStatus[] = ['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PLANNING'];

      statuses.forEach((status) => {
        expect(PROJECT_STATUS_LABELS[status]).toBeDefined();
        expect(typeof PROJECT_STATUS_LABELS[status]).toBe('string');
        expect(PROJECT_STATUS_LABELS[status].length).toBeGreaterThan(0);
      });
    });

    it('should have expected Japanese labels', () => {
      expect(PROJECT_STATUS_LABELS.ACTIVE).toBe('進行中');
      expect(PROJECT_STATUS_LABELS.INACTIVE).toBe('休止中');
      expect(PROJECT_STATUS_LABELS.ARCHIVED).toBe('アーカイブ');
      expect(PROJECT_STATUS_LABELS.PLANNING).toBe('計画中');
    });
  });

  describe('PROJECT_TYPE_OPTIONS', () => {
    it('should have project type options', () => {
      expect(PROJECT_TYPE_OPTIONS.length).toBeGreaterThan(0);

      PROJECT_TYPE_OPTIONS.forEach((option) => {
        expect(option.value).toBeDefined();
        expect(option.label).toBeDefined();
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
      });
    });

    it('should include common project types', () => {
      const values = PROJECT_TYPE_OPTIONS.map((o) => o.value);
      expect(values).toContain('web');
      expect(values).toContain('mobile');
      expect(values).toContain('api');
    });
  });

  describe('VALID_PROJECT_STATUSES', () => {
    it('should contain all valid project statuses', () => {
      expect(VALID_PROJECT_STATUSES).toContain('ACTIVE');
      expect(VALID_PROJECT_STATUSES).toContain('INACTIVE');
      expect(VALID_PROJECT_STATUSES).toContain('ARCHIVED');
      expect(VALID_PROJECT_STATUSES).toContain('PLANNING');
      expect(VALID_PROJECT_STATUSES.length).toBe(4);
    });
  });

  describe('validateProjectName', () => {
    it('should return valid for non-empty name', () => {
      const result = validateProjectName('Test Project');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for empty name', () => {
      const result = validateProjectName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('プロジェクト名は必須です。');
    });

    it('should return invalid for whitespace-only name', () => {
      const result = validateProjectName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('プロジェクト名は必須です。');
    });

    it('should return invalid for name exceeding 255 characters', () => {
      const longName = 'a'.repeat(256);
      const result = validateProjectName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('プロジェクト名は255文字以内で入力してください。');
    });

    it('should return valid for name with exactly 255 characters', () => {
      const maxLengthName = 'a'.repeat(255);
      const result = validateProjectName(maxLengthName);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateProject', () => {
    it('should return valid for valid project data', () => {
      const result = validateProject({
        name: 'Test Project',
        description: 'A test project',
        status: 'ACTIVE',
        projectType: 'web',
        targetVersion: '1.0.0',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for empty name', () => {
      const result = validateProject({
        name: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('プロジェクト名は必須です。');
    });

    it('should return invalid for invalid status', () => {
      const result = validateProject({
        name: 'Test Project',
        status: 'INVALID_STATUS',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('無効なステータスです。');
    });

    it('should return invalid for description exceeding 5000 characters', () => {
      const result = validateProject({
        name: 'Test Project',
        description: 'a'.repeat(5001),
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('説明は5000文字以内で入力してください。');
    });

    it('should return valid for description with exactly 5000 characters', () => {
      const result = validateProject({
        name: 'Test Project',
        description: 'a'.repeat(5000),
      });
      expect(result.valid).toBe(true);
    });

    it('should return invalid for projectType exceeding 100 characters', () => {
      const result = validateProject({
        name: 'Test Project',
        projectType: 'a'.repeat(101),
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('プロジェクトタイプは100文字以内で入力してください。');
    });

    it('should return invalid for targetVersion exceeding 100 characters', () => {
      const result = validateProject({
        name: 'Test Project',
        targetVersion: 'a'.repeat(101),
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ターゲットバージョンは100文字以内で入力してください。');
    });

    it('should return valid for null description', () => {
      const result = validateProject({
        name: 'Test Project',
        description: null,
      });
      expect(result.valid).toBe(true);
    });

    it('should return valid for null projectType', () => {
      const result = validateProject({
        name: 'Test Project',
        projectType: null,
      });
      expect(result.valid).toBe(true);
    });

    it('should return valid for null targetVersion', () => {
      const result = validateProject({
        name: 'Test Project',
        targetVersion: null,
      });
      expect(result.valid).toBe(true);
    });

    it('should accumulate multiple errors', () => {
      const result = validateProject({
        name: '',
        description: 'a'.repeat(5001),
        status: 'INVALID',
        projectType: 'a'.repeat(101),
        targetVersion: 'a'.repeat(101),
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });
});
