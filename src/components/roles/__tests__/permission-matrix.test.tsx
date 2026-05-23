import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PermissionMatrix } from '../permission-matrix';
import type { Permissions } from '@/types/role';

describe('PermissionMatrix', () => {
  const mockPermissions: Permissions = {
    projects: ['read', 'update'],
    users: ['read'],
    testCases: ['create', 'read', 'update', 'delete'],
  };

  describe('表示', () => {
    it('権限マトリクスが表示される', () => {
      render(<PermissionMatrix permissions={mockPermissions} />);

      // Check that resource labels are displayed
      expect(screen.getByText('プロジェクト')).toBeTruthy();
      expect(screen.getByText('ユーザー')).toBeTruthy();
      expect(screen.getByText('テストケース')).toBeTruthy();

      // Check that action labels are displayed
      expect(screen.getByText('作成')).toBeTruthy();
      expect(screen.getByText('閲覧')).toBeTruthy();
      expect(screen.getByText('更新')).toBeTruthy();
      expect(screen.getByText('削除')).toBeTruthy();
    });

    it('権限がチェックされている', () => {
      render(<PermissionMatrix permissions={mockPermissions} />);

      // Check specific permissions are checked
      const projectReadCheckbox = screen.getByRole('checkbox', {
        name: 'プロジェクトの閲覧',
      }) as HTMLInputElement;
      expect(projectReadCheckbox.checked).toBe(true);

      const projectUpdateCheckbox = screen.getByRole('checkbox', {
        name: 'プロジェクトの更新',
      }) as HTMLInputElement;
      expect(projectUpdateCheckbox.checked).toBe(true);

      const projectCreateCheckbox = screen.getByRole('checkbox', {
        name: 'プロジェクトの作成',
      }) as HTMLInputElement;
      expect(projectCreateCheckbox.checked).toBe(false);
    });

    it('readOnlyモードでは編集できない', () => {
      const onChange = vi.fn();
      render(<PermissionMatrix permissions={mockPermissions} onChange={onChange} readOnly />);

      const checkbox = screen.getByRole('checkbox', {
        name: 'プロジェクトの作成',
      }) as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });

    it('disabledモードでは編集できない', () => {
      const onChange = vi.fn();
      render(<PermissionMatrix permissions={mockPermissions} onChange={onChange} disabled />);

      const checkbox = screen.getByRole('checkbox', {
        name: 'プロジェクトの作成',
      }) as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });
  });

  describe('インタラクション', () => {
    it('チェックボックスをクリックすると権限が追加される', () => {
      const onChange = vi.fn();
      render(<PermissionMatrix permissions={mockPermissions} onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox', {
        name: 'プロジェクトの作成',
      });

      fireEvent.click(checkbox);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          projects: expect.arrayContaining(['read', 'update', 'create']),
        })
      );
    });

    it('チェックボックスをクリックすると権限が削除される', () => {
      const onChange = vi.fn();
      render(<PermissionMatrix permissions={mockPermissions} onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox', {
        name: 'プロジェクトの閲覧',
      });

      fireEvent.click(checkbox);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          projects: ['update'],
        })
      );
    });

    it('リソースの全選択をクリックすると全アクションが選択される', () => {
      const onChange = vi.fn();
      render(<PermissionMatrix permissions={{}} onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox', {
        name: 'プロジェクトをすべて選択',
      });

      fireEvent.click(checkbox);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          projects: expect.arrayContaining(['create', 'read', 'update', 'delete']),
        })
      );
    });

    it('アクションの全選択をクリックすると全リソースに対してアクションが選択される', () => {
      const onChange = vi.fn();
      render(<PermissionMatrix permissions={{}} onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox', {
        name: '閲覧をすべて選択',
      });

      fireEvent.click(checkbox);

      expect(onChange).toHaveBeenCalled();
      const calledPermissions = onChange.mock.calls[0][0];
      expect(calledPermissions.projects).toContain('read');
      expect(calledPermissions.users).toContain('read');
      expect(calledPermissions.testCases).toContain('read');
    });
  });

  describe('空の権限', () => {
    it('空の権限で表示できる', () => {
      render(<PermissionMatrix permissions={{}} />);

      // All individual checkboxes should be unchecked
      const projectReadCheckbox = screen.getByRole('checkbox', {
        name: 'プロジェクトの閲覧',
      }) as HTMLInputElement;
      expect(projectReadCheckbox.checked).toBe(false);
    });
  });
});
