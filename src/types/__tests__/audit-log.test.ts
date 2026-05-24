import { describe, it, expect } from 'vitest';
import {
  type AuditAction,
  type AuditTargetType,
  type AuditActionCategory,
  AUDIT_ACTION_LABELS,
  AUDIT_TARGET_TYPE_LABELS,
  AUDIT_ACTION_CATEGORY_LABELS,
  getActionCategory,
} from '../audit-log';

describe('Audit Log Types', () => {
  describe('AUDIT_ACTION_LABELS', () => {
    it('should have labels for all audit actions', () => {
      const actions: AuditAction[] = [
        'LOGIN',
        'LOGOUT',
        'LOGIN_FAILED',
        'PASSWORD_CHANGE',
        'PASSWORD_RESET_REQUEST',
        'PASSWORD_RESET',
        'USER_CREATE',
        'USER_UPDATE',
        'USER_DELETE',
        'USER_LOCK',
        'USER_UNLOCK',
        'ROLE_CREATE',
        'ROLE_UPDATE',
        'ROLE_DELETE',
        'PROJECT_CREATE',
        'PROJECT_UPDATE',
        'PROJECT_DELETE',
        'PROJECT_MEMBER_ADD',
        'PROJECT_MEMBER_UPDATE',
        'PROJECT_MEMBER_REMOVE',
        'PASSWORD_POLICY_UPDATE',
        'SESSION_SETTINGS_UPDATE',
        'AUDIT_LOG_EXPORT',
      ];

      actions.forEach((action) => {
        expect(AUDIT_ACTION_LABELS[action]).toBeDefined();
        expect(typeof AUDIT_ACTION_LABELS[action]).toBe('string');
        expect(AUDIT_ACTION_LABELS[action].length).toBeGreaterThan(0);
      });
    });
  });

  describe('AUDIT_TARGET_TYPE_LABELS', () => {
    it('should have labels for all target types', () => {
      const targetTypes: AuditTargetType[] = [
        'USER',
        'ROLE',
        'PROJECT',
        'PROJECT_MEMBER',
        'PASSWORD_POLICY',
        'SESSION_SETTINGS',
        'AUDIT_LOG',
        'SYSTEM',
      ];

      targetTypes.forEach((type) => {
        expect(AUDIT_TARGET_TYPE_LABELS[type]).toBeDefined();
        expect(typeof AUDIT_TARGET_TYPE_LABELS[type]).toBe('string');
        expect(AUDIT_TARGET_TYPE_LABELS[type].length).toBeGreaterThan(0);
      });
    });
  });

  describe('AUDIT_ACTION_CATEGORY_LABELS', () => {
    it('should have labels for all categories', () => {
      const categories: AuditActionCategory[] = [
        'auth',
        'user',
        'role',
        'project',
        'settings',
        'other',
      ];

      categories.forEach((category) => {
        expect(AUDIT_ACTION_CATEGORY_LABELS[category]).toBeDefined();
        expect(typeof AUDIT_ACTION_CATEGORY_LABELS[category]).toBe('string');
      });
    });
  });

  describe('getActionCategory', () => {
    it('should return "auth" for authentication actions', () => {
      expect(getActionCategory('LOGIN')).toBe('auth');
      expect(getActionCategory('LOGOUT')).toBe('auth');
      expect(getActionCategory('LOGIN_FAILED')).toBe('auth');
      expect(getActionCategory('PASSWORD_CHANGE')).toBe('auth');
      expect(getActionCategory('PASSWORD_RESET_REQUEST')).toBe('auth');
      expect(getActionCategory('PASSWORD_RESET')).toBe('auth');
    });

    it('should return "user" for user management actions', () => {
      expect(getActionCategory('USER_CREATE')).toBe('user');
      expect(getActionCategory('USER_UPDATE')).toBe('user');
      expect(getActionCategory('USER_DELETE')).toBe('user');
      expect(getActionCategory('USER_LOCK')).toBe('user');
      expect(getActionCategory('USER_UNLOCK')).toBe('user');
    });

    it('should return "role" for role management actions', () => {
      expect(getActionCategory('ROLE_CREATE')).toBe('role');
      expect(getActionCategory('ROLE_UPDATE')).toBe('role');
      expect(getActionCategory('ROLE_DELETE')).toBe('role');
    });

    it('should return "project" for project management actions', () => {
      expect(getActionCategory('PROJECT_CREATE')).toBe('project');
      expect(getActionCategory('PROJECT_UPDATE')).toBe('project');
      expect(getActionCategory('PROJECT_DELETE')).toBe('project');
      expect(getActionCategory('PROJECT_MEMBER_ADD')).toBe('project');
      expect(getActionCategory('PROJECT_MEMBER_UPDATE')).toBe('project');
      expect(getActionCategory('PROJECT_MEMBER_REMOVE')).toBe('project');
    });

    it('should return "settings" for settings actions', () => {
      expect(getActionCategory('PASSWORD_POLICY_UPDATE')).toBe('settings');
      expect(getActionCategory('SESSION_SETTINGS_UPDATE')).toBe('settings');
    });

    it('should return "other" for other actions', () => {
      expect(getActionCategory('AUDIT_LOG_EXPORT')).toBe('other');
    });
  });
});
