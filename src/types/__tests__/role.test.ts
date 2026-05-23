import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  isSystemRole,
  validateRoleName,
  DEFAULT_ROLES,
  SYSTEM_ROLE_NAMES,
  ROLE_DISPLAY_LABELS,
  RESOURCE_TYPE_LABELS,
  PERMISSION_ACTION_LABELS,
  type Permissions,
} from '../role';

describe('Role Types', () => {
  describe('hasPermission', () => {
    const permissions: Permissions = {
      projects: ['create', 'read', 'update'],
      users: ['read'],
      testCases: ['create', 'read', 'update', 'delete'],
    };

    it('should return true when permission exists', () => {
      expect(hasPermission(permissions, 'projects', 'create')).toBe(true);
      expect(hasPermission(permissions, 'projects', 'read')).toBe(true);
      expect(hasPermission(permissions, 'users', 'read')).toBe(true);
      expect(hasPermission(permissions, 'testCases', 'delete')).toBe(true);
    });

    it('should return false when permission does not exist', () => {
      expect(hasPermission(permissions, 'projects', 'delete')).toBe(false);
      expect(hasPermission(permissions, 'users', 'create')).toBe(false);
      expect(hasPermission(permissions, 'users', 'update')).toBe(false);
    });

    it('should return false when resource does not exist', () => {
      expect(hasPermission(permissions, 'bugs', 'read')).toBe(false);
      expect(hasPermission(permissions, 'reports', 'create')).toBe(false);
    });

    it('should return false for empty permissions', () => {
      const emptyPermissions: Permissions = {};
      expect(hasPermission(emptyPermissions, 'projects', 'read')).toBe(false);
    });
  });

  describe('isSystemRole', () => {
    it('should return true for system role names', () => {
      expect(isSystemRole('SYSTEM_ADMIN')).toBe(true);
      expect(isSystemRole('PROJECT_ADMIN')).toBe(true);
      expect(isSystemRole('MEMBER')).toBe(true);
      expect(isSystemRole('GUEST')).toBe(true);
    });

    it('should return false for non-system role names', () => {
      expect(isSystemRole('CUSTOM_ROLE')).toBe(false);
      expect(isSystemRole('Admin')).toBe(false);
      expect(isSystemRole('admin')).toBe(false);
      expect(isSystemRole('')).toBe(false);
    });
  });

  describe('validateRoleName', () => {
    it('should return valid for correct role names', () => {
      expect(validateRoleName('CUSTOM_ROLE').valid).toBe(true);
      expect(validateRoleName('custom-role').valid).toBe(true);
      expect(validateRoleName('Role123').valid).toBe(true);
      expect(validateRoleName('a').valid).toBe(true);
    });

    it('should return invalid for empty name', () => {
      const result = validateRoleName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('ロール名は必須です。');
    });

    it('should return invalid for whitespace only', () => {
      const result = validateRoleName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('ロール名は必須です。');
    });

    it('should return invalid for name exceeding 100 characters', () => {
      const longName = 'a'.repeat(101);
      const result = validateRoleName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('ロール名は100文字以内で入力してください。');
    });

    it('should return invalid for names with special characters', () => {
      expect(validateRoleName('Role Name').valid).toBe(false);
      expect(validateRoleName('Role@123').valid).toBe(false);
      expect(validateRoleName('ロール').valid).toBe(false);
      expect(validateRoleName('role.name').valid).toBe(false);
    });

    it('should return appropriate error message for invalid characters', () => {
      const result = validateRoleName('Role Name');
      expect(result.error).toBe('ロール名は英数字、アンダースコア、ハイフンのみ使用できます。');
    });
  });

  describe('DEFAULT_ROLES', () => {
    it('should have all system roles defined', () => {
      for (const roleName of SYSTEM_ROLE_NAMES) {
        expect(DEFAULT_ROLES[roleName]).toBeDefined();
        expect(DEFAULT_ROLES[roleName].displayName).toBeDefined();
        expect(DEFAULT_ROLES[roleName].description).toBeDefined();
        expect(DEFAULT_ROLES[roleName].permissions).toBeDefined();
      }
    });

    it('should have correct display names in Japanese', () => {
      expect(DEFAULT_ROLES.SYSTEM_ADMIN.displayName).toBe('システム管理者');
      expect(DEFAULT_ROLES.PROJECT_ADMIN.displayName).toBe('プロジェクト管理者');
      expect(DEFAULT_ROLES.MEMBER.displayName).toBe('メンバー');
      expect(DEFAULT_ROLES.GUEST.displayName).toBe('ゲスト');
    });

    it('SYSTEM_ADMIN should have all permissions', () => {
      const permissions = DEFAULT_ROLES.SYSTEM_ADMIN.permissions;
      expect(permissions.projects).toContain('create');
      expect(permissions.projects).toContain('read');
      expect(permissions.projects).toContain('update');
      expect(permissions.projects).toContain('delete');
      expect(permissions.users).toContain('create');
      expect(permissions.users).toContain('delete');
      expect(permissions.roles).toContain('create');
      expect(permissions.roles).toContain('delete');
    });

    it('GUEST should have read-only permissions', () => {
      const permissions = DEFAULT_ROLES.GUEST.permissions;
      expect(permissions.projects).toEqual(['read']);
      expect(permissions.testCases).toEqual(['read']);
      expect(permissions.testRuns).toEqual(['read']);
      expect(permissions.users).toBeUndefined();
      expect(permissions.roles).toBeUndefined();
    });

    it('PROJECT_ADMIN should not have user create/delete permissions', () => {
      const permissions = DEFAULT_ROLES.PROJECT_ADMIN.permissions;
      expect(permissions.users).toEqual(['read']);
      expect(permissions.users).not.toContain('create');
      expect(permissions.users).not.toContain('delete');
    });

    it('MEMBER should have limited permissions', () => {
      const permissions = DEFAULT_ROLES.MEMBER.permissions;
      expect(permissions.projects).toEqual(['read']);
      expect(permissions.testCases).toContain('create');
      expect(permissions.testCases).not.toContain('delete');
    });
  });

  describe('SYSTEM_ROLE_NAMES', () => {
    it('should have 4 system roles', () => {
      expect(SYSTEM_ROLE_NAMES.length).toBe(4);
    });

    it('should include required roles', () => {
      expect(SYSTEM_ROLE_NAMES).toContain('SYSTEM_ADMIN');
      expect(SYSTEM_ROLE_NAMES).toContain('PROJECT_ADMIN');
      expect(SYSTEM_ROLE_NAMES).toContain('MEMBER');
      expect(SYSTEM_ROLE_NAMES).toContain('GUEST');
    });
  });

  describe('ROLE_DISPLAY_LABELS', () => {
    it('should have Japanese labels for system roles', () => {
      expect(ROLE_DISPLAY_LABELS.SYSTEM_ADMIN).toBe('システム管理者');
      expect(ROLE_DISPLAY_LABELS.PROJECT_ADMIN).toBe('プロジェクト管理者');
      expect(ROLE_DISPLAY_LABELS.MEMBER).toBe('メンバー');
      expect(ROLE_DISPLAY_LABELS.GUEST).toBe('ゲスト');
    });
  });

  describe('RESOURCE_TYPE_LABELS', () => {
    it('should have Japanese labels for all resource types', () => {
      expect(RESOURCE_TYPE_LABELS.projects).toBe('プロジェクト');
      expect(RESOURCE_TYPE_LABELS.users).toBe('ユーザー');
      expect(RESOURCE_TYPE_LABELS.roles).toBe('ロール');
      expect(RESOURCE_TYPE_LABELS.testCases).toBe('テストケース');
      expect(RESOURCE_TYPE_LABELS.testRuns).toBe('テストラン');
      expect(RESOURCE_TYPE_LABELS.testResults).toBe('テスト結果');
      expect(RESOURCE_TYPE_LABELS.bugs).toBe('バグ');
      expect(RESOURCE_TYPE_LABELS.reports).toBe('レポート');
      expect(RESOURCE_TYPE_LABELS.settings).toBe('設定');
    });
  });

  describe('PERMISSION_ACTION_LABELS', () => {
    it('should have Japanese labels for all actions', () => {
      expect(PERMISSION_ACTION_LABELS.create).toBe('作成');
      expect(PERMISSION_ACTION_LABELS.read).toBe('閲覧');
      expect(PERMISSION_ACTION_LABELS.update).toBe('更新');
      expect(PERMISSION_ACTION_LABELS.delete).toBe('削除');
    });
  });
});
