import { describe, it, expect } from 'vitest';
import {
  validateMilestoneName,
  validateMilestoneDescription,
  validateMilestoneStatus,
  validateMilestoneDate,
  validateCreateMilestoneInput,
  validateUpdateMilestoneInput,
  getMilestoneStatusLabel,
  isValidMilestoneStatus,
  getMilestoneStatusColor,
  isMilestoneOverdue,
  getMilestoneProgress,
  MILESTONE_STATUS,
  MILESTONE_NAME_MAX_LENGTH,
  MILESTONE_DESCRIPTION_MAX_LENGTH,
} from '../milestone';
import type { Milestone } from '../milestone';

describe('milestone types', () => {
  describe('validateMilestoneName', () => {
    it('should accept valid name', () => {
      const result = validateMilestoneName('Sprint 1');
      expect(result.valid).toBe(true);
    });

    it('should reject empty name', () => {
      const result = validateMilestoneName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('必須');
    });

    it('should reject whitespace only name', () => {
      const result = validateMilestoneName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('空白のみ');
    });

    it('should reject name exceeding max length', () => {
      const longName = 'a'.repeat(MILESTONE_NAME_MAX_LENGTH + 1);
      const result = validateMilestoneName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${MILESTONE_NAME_MAX_LENGTH}文字以内`);
    });

    it('should accept name at max length', () => {
      const maxName = 'a'.repeat(MILESTONE_NAME_MAX_LENGTH);
      const result = validateMilestoneName(maxName);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateMilestoneDescription', () => {
    it('should accept valid description', () => {
      const result = validateMilestoneDescription('This is a description');
      expect(result.valid).toBe(true);
    });

    it('should accept null description', () => {
      const result = validateMilestoneDescription(null);
      expect(result.valid).toBe(true);
    });

    it('should accept empty description', () => {
      const result = validateMilestoneDescription('');
      expect(result.valid).toBe(true);
    });

    it('should reject description exceeding max length', () => {
      const longDesc = 'a'.repeat(MILESTONE_DESCRIPTION_MAX_LENGTH + 1);
      const result = validateMilestoneDescription(longDesc);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${MILESTONE_DESCRIPTION_MAX_LENGTH}文字以内`);
    });
  });

  describe('validateMilestoneStatus', () => {
    it('should accept PLANNED', () => {
      const result = validateMilestoneStatus('PLANNED');
      expect(result.valid).toBe(true);
    });

    it('should accept IN_PROGRESS', () => {
      const result = validateMilestoneStatus('IN_PROGRESS');
      expect(result.valid).toBe(true);
    });

    it('should accept COMPLETED', () => {
      const result = validateMilestoneStatus('COMPLETED');
      expect(result.valid).toBe(true);
    });

    it('should accept CANCELLED', () => {
      const result = validateMilestoneStatus('CANCELLED');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = validateMilestoneStatus('INVALID');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateMilestoneDate', () => {
    it('should accept valid date', () => {
      const result = validateMilestoneDate('2024-01-15');
      expect(result.valid).toBe(true);
    });

    it('should accept null date', () => {
      const result = validateMilestoneDate(null);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid date format', () => {
      const result = validateMilestoneDate('01-15-2024');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('YYYY-MM-DD');
    });

    it('should reject date with invalid format', () => {
      const result = validateMilestoneDate('2024/01/15');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateCreateMilestoneInput', () => {
    it('should accept valid input', () => {
      const result = validateCreateMilestoneInput({
        projectId: '1',
        name: 'Sprint 1',
        description: 'First sprint',
        status: 'PLANNED',
        startDate: '2024-01-01',
        dueDate: '2024-01-14',
      });
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should accept minimal input', () => {
      const result = validateCreateMilestoneInput({
        projectId: '1',
        name: 'Sprint 1',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject missing projectId', () => {
      const result = validateCreateMilestoneInput({
        name: 'Sprint 1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors?.projectId).toBeDefined();
    });

    it('should reject missing name', () => {
      const result = validateCreateMilestoneInput({
        projectId: '1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors?.name).toBeDefined();
    });
  });

  describe('validateUpdateMilestoneInput', () => {
    it('should accept valid input', () => {
      const result = validateUpdateMilestoneInput({
        name: 'Updated Sprint',
        status: 'IN_PROGRESS',
      });
      expect(result.valid).toBe(true);
    });

    it('should accept empty input', () => {
      const result = validateUpdateMilestoneInput({});
      expect(result.valid).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = validateUpdateMilestoneInput({
        status: 'INVALID',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('getMilestoneStatusLabel', () => {
    it('should return Japanese label for PLANNED', () => {
      expect(getMilestoneStatusLabel('PLANNED')).toBe('計画中');
    });

    it('should return Japanese label for IN_PROGRESS', () => {
      expect(getMilestoneStatusLabel('IN_PROGRESS')).toBe('進行中');
    });

    it('should return Japanese label for COMPLETED', () => {
      expect(getMilestoneStatusLabel('COMPLETED')).toBe('完了');
    });

    it('should return Japanese label for CANCELLED', () => {
      expect(getMilestoneStatusLabel('CANCELLED')).toBe('キャンセル');
    });
  });

  describe('isValidMilestoneStatus', () => {
    it('should return true for valid statuses', () => {
      expect(isValidMilestoneStatus('PLANNED')).toBe(true);
      expect(isValidMilestoneStatus('IN_PROGRESS')).toBe(true);
      expect(isValidMilestoneStatus('COMPLETED')).toBe(true);
      expect(isValidMilestoneStatus('CANCELLED')).toBe(true);
    });

    it('should return false for invalid statuses', () => {
      expect(isValidMilestoneStatus('INVALID')).toBe(false);
      expect(isValidMilestoneStatus('')).toBe(false);
    });
  });

  describe('getMilestoneStatusColor', () => {
    it('should return correct colors', () => {
      expect(getMilestoneStatusColor('PLANNED')).toContain('gray');
      expect(getMilestoneStatusColor('IN_PROGRESS')).toContain('blue');
      expect(getMilestoneStatusColor('COMPLETED')).toContain('green');
      expect(getMilestoneStatusColor('CANCELLED')).toContain('red');
    });
  });

  describe('isMilestoneOverdue', () => {
    const baseMilestone: Milestone = {
      id: '1',
      projectId: '1',
      name: 'Test',
      description: null,
      status: 'IN_PROGRESS',
      startDate: null,
      dueDate: null,
      completedAt: null,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should return false if no due date', () => {
      expect(isMilestoneOverdue(baseMilestone)).toBe(false);
    });

    it('should return false if completed', () => {
      const milestone: Milestone = {
        ...baseMilestone,
        status: 'COMPLETED',
        dueDate: '2020-01-01',
      };
      expect(isMilestoneOverdue(milestone)).toBe(false);
    });

    it('should return false if cancelled', () => {
      const milestone: Milestone = {
        ...baseMilestone,
        status: 'CANCELLED',
        dueDate: '2020-01-01',
      };
      expect(isMilestoneOverdue(milestone)).toBe(false);
    });

    it('should return true if due date is in the past', () => {
      const milestone: Milestone = {
        ...baseMilestone,
        dueDate: '2020-01-01',
      };
      expect(isMilestoneOverdue(milestone)).toBe(true);
    });

    it('should return false if due date is in the future', () => {
      const milestone: Milestone = {
        ...baseMilestone,
        dueDate: '2099-01-01',
      };
      expect(isMilestoneOverdue(milestone)).toBe(false);
    });
  });

  describe('getMilestoneProgress', () => {
    const baseMilestone: Milestone = {
      id: '1',
      projectId: '1',
      name: 'Test',
      description: null,
      status: 'PLANNED',
      startDate: null,
      dueDate: null,
      completedAt: null,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should return 0 for PLANNED', () => {
      expect(getMilestoneProgress({ ...baseMilestone, status: 'PLANNED' })).toBe(0);
    });

    it('should return 50 for IN_PROGRESS', () => {
      expect(getMilestoneProgress({ ...baseMilestone, status: 'IN_PROGRESS' })).toBe(50);
    });

    it('should return 100 for COMPLETED', () => {
      expect(getMilestoneProgress({ ...baseMilestone, status: 'COMPLETED' })).toBe(100);
    });

    it('should return 0 for CANCELLED', () => {
      expect(getMilestoneProgress({ ...baseMilestone, status: 'CANCELLED' })).toBe(0);
    });
  });

  describe('MILESTONE_STATUS', () => {
    it('should have all status values', () => {
      expect(MILESTONE_STATUS.PLANNED).toBe('PLANNED');
      expect(MILESTONE_STATUS.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(MILESTONE_STATUS.COMPLETED).toBe('COMPLETED');
      expect(MILESTONE_STATUS.CANCELLED).toBe('CANCELLED');
    });
  });
});
