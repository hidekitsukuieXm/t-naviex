import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PermissionGate, canPerform, canPerformAll, canPerformAny } from '../components';
import type { Permissions } from '@/types/role';

describe('RBAC Components', () => {
  const memberPermissions: Permissions = {
    projects: ['read'],
    testCases: ['create', 'read', 'update'],
    testRuns: ['read', 'update'],
    bugs: ['create', 'read', 'update'],
    reports: ['read'],
  };

  const adminPermissions: Permissions = {
    projects: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    roles: ['create', 'read', 'update', 'delete'],
    testCases: ['create', 'read', 'update', 'delete'],
    testRuns: ['create', 'read', 'update', 'delete'],
    testResults: ['create', 'read', 'update', 'delete'],
    bugs: ['create', 'read', 'update', 'delete'],
    reports: ['create', 'read', 'update', 'delete'],
    settings: ['read', 'update'],
  };

  describe('PermissionGate', () => {
    it('should render children when user has permission', () => {
      render(
        <PermissionGate permissions={memberPermissions} resource="testCases" action="create">
          <button>Create Test Case</button>
        </PermissionGate>
      );

      expect(screen.getByText('Create Test Case')).toBeTruthy();
    });

    it('should not render children when user lacks permission', () => {
      render(
        <PermissionGate permissions={memberPermissions} resource="testCases" action="delete">
          <button>Delete Test Case</button>
        </PermissionGate>
      );

      expect(screen.queryByText('Delete Test Case')).toBeNull();
    });

    it('should render fallback when user lacks permission', () => {
      render(
        <PermissionGate
          permissions={memberPermissions}
          resource="testCases"
          action="delete"
          fallback={<span>No permission</span>}
        >
          <button>Delete Test Case</button>
        </PermissionGate>
      );

      expect(screen.queryByText('Delete Test Case')).toBeNull();
      expect(screen.getByText('No permission')).toBeTruthy();
    });

    it('should render fallback when permissions is null', () => {
      render(
        <PermissionGate
          permissions={null}
          resource="testCases"
          action="read"
          fallback={<span>Not logged in</span>}
        >
          <button>View Test Cases</button>
        </PermissionGate>
      );

      expect(screen.queryByText('View Test Cases')).toBeNull();
      expect(screen.getByText('Not logged in')).toBeTruthy();
    });

    it('should render fallback when permissions is undefined', () => {
      render(
        <PermissionGate
          permissions={undefined}
          resource="testCases"
          action="read"
          fallback={<span>Loading</span>}
        >
          <button>View Test Cases</button>
        </PermissionGate>
      );

      expect(screen.getByText('Loading')).toBeTruthy();
    });

    it('should check multiple permissions with AND condition', () => {
      render(
        <PermissionGate
          permissions={memberPermissions}
          resource="testCases"
          action="create"
          requiredPermissions={[
            { resource: 'testCases', action: 'create' },
            { resource: 'bugs', action: 'create' },
          ]}
        >
          <button>Admin Panel</button>
        </PermissionGate>
      );

      expect(screen.getByText('Admin Panel')).toBeTruthy();
    });

    it('should fail when one of multiple permissions is missing (AND)', () => {
      render(
        <PermissionGate
          permissions={memberPermissions}
          resource="testCases"
          action="create"
          requiredPermissions={[
            { resource: 'testCases', action: 'create' },
            { resource: 'testCases', action: 'delete' }, // member doesn't have this
          ]}
          fallback={<span>Missing permission</span>}
        >
          <button>Admin Panel</button>
        </PermissionGate>
      );

      expect(screen.queryByText('Admin Panel')).toBeNull();
      expect(screen.getByText('Missing permission')).toBeTruthy();
    });

    it('should pass when any permission is present (OR)', () => {
      render(
        <PermissionGate
          permissions={memberPermissions}
          resource="testCases"
          action="create"
          requiredPermissions={[
            { resource: 'testCases', action: 'delete' }, // member doesn't have this
            { resource: 'testCases', action: 'create' }, // member has this
          ]}
          anyPermission={true}
        >
          <button>Some Action</button>
        </PermissionGate>
      );

      expect(screen.getByText('Some Action')).toBeTruthy();
    });

    it('should fail when no permission is present (OR)', () => {
      render(
        <PermissionGate
          permissions={memberPermissions}
          resource="testCases"
          action="create"
          requiredPermissions={[
            { resource: 'users', action: 'create' },
            { resource: 'users', action: 'delete' },
          ]}
          anyPermission={true}
          fallback={<span>No access</span>}
        >
          <button>User Management</button>
        </PermissionGate>
      );

      expect(screen.queryByText('User Management')).toBeNull();
      expect(screen.getByText('No access')).toBeTruthy();
    });

    it('should work with admin permissions', () => {
      render(
        <PermissionGate permissions={adminPermissions} resource="users" action="delete">
          <button>Delete User</button>
        </PermissionGate>
      );

      expect(screen.getByText('Delete User')).toBeTruthy();
    });
  });

  describe('canPerform', () => {
    it('should return true when user has permission', () => {
      expect(canPerform(memberPermissions, 'testCases', 'create')).toBe(true);
      expect(canPerform(memberPermissions, 'bugs', 'update')).toBe(true);
    });

    it('should return false when user lacks permission', () => {
      expect(canPerform(memberPermissions, 'testCases', 'delete')).toBe(false);
      expect(canPerform(memberPermissions, 'users', 'create')).toBe(false);
    });

    it('should return false when permissions is null', () => {
      expect(canPerform(null, 'testCases', 'read')).toBe(false);
    });

    it('should return false when permissions is undefined', () => {
      expect(canPerform(undefined, 'testCases', 'read')).toBe(false);
    });

    it('should return false when resource is not in permissions', () => {
      expect(canPerform(memberPermissions, 'settings', 'update')).toBe(false);
    });
  });

  describe('canPerformAll', () => {
    it('should return true when user has all permissions', () => {
      expect(
        canPerformAll(memberPermissions, [
          { resource: 'testCases', action: 'create' },
          { resource: 'testCases', action: 'read' },
          { resource: 'bugs', action: 'create' },
        ])
      ).toBe(true);
    });

    it('should return false when user lacks any permission', () => {
      expect(
        canPerformAll(memberPermissions, [
          { resource: 'testCases', action: 'create' },
          { resource: 'testCases', action: 'delete' }, // missing
        ])
      ).toBe(false);
    });

    it('should return false when permissions is null', () => {
      expect(canPerformAll(null, [{ resource: 'testCases', action: 'read' }])).toBe(false);
    });

    it('should return true for admin with all permissions', () => {
      expect(
        canPerformAll(adminPermissions, [
          { resource: 'users', action: 'create' },
          { resource: 'users', action: 'delete' },
          { resource: 'roles', action: 'delete' },
        ])
      ).toBe(true);
    });
  });

  describe('canPerformAny', () => {
    it('should return true when user has at least one permission', () => {
      expect(
        canPerformAny(memberPermissions, [
          { resource: 'users', action: 'delete' }, // missing
          { resource: 'testCases', action: 'create' }, // has
        ])
      ).toBe(true);
    });

    it('should return false when user has no permissions', () => {
      expect(
        canPerformAny(memberPermissions, [
          { resource: 'users', action: 'create' },
          { resource: 'users', action: 'delete' },
        ])
      ).toBe(false);
    });

    it('should return false when permissions is null', () => {
      expect(canPerformAny(null, [{ resource: 'testCases', action: 'read' }])).toBe(false);
    });

    it('should return true for admin', () => {
      expect(
        canPerformAny(adminPermissions, [
          { resource: 'settings', action: 'delete' }, // admin doesn't have this
          { resource: 'settings', action: 'update' }, // admin has this
        ])
      ).toBe(true);
    });
  });
});
