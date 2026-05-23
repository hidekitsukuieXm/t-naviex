import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoleForm } from '../role-form';
import type { Role } from '@/types/role';

describe('RoleForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const mockRole: Role = {
    id: '1',
    name: 'CUSTOM_ROLE',
    displayName: 'カスタムロール',
    description: 'テスト用のカスタムロール',
    permissions: {
      projects: ['read'],
      testCases: ['create', 'read', 'update'],
    },
    isSystemRole: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('新規作成フォーム', () => {
    it('新規作成フォームが表示される', () => {
      render(<RoleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByLabelText(/ロール名/)).toBeTruthy();
      expect(screen.getByLabelText(/表示名/)).toBeTruthy();
      expect(screen.getByLabelText('説明')).toBeTruthy();
      expect(screen.getByText('権限設定')).toBeTruthy();
      expect(screen.getByRole('button', { name: '作成' })).toBeTruthy();
    });

    it('ロール名が空の場合エラーが表示される', async () => {
      render(<RoleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      // Fill only displayName
      fireEvent.change(screen.getByLabelText(/表示名/), {
        target: { value: 'テストロール' },
      });

      fireEvent.click(screen.getByRole('button', { name: '作成' }));

      await waitFor(() => {
        expect(screen.getByText('ロール名は必須です。')).toBeTruthy();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('ロール名に不正な文字がある場合エラーが表示される', async () => {
      render(<RoleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByLabelText(/ロール名/), {
        target: { value: 'テスト ロール' },
      });
      fireEvent.change(screen.getByLabelText(/表示名/), {
        target: { value: 'テストロール' },
      });

      fireEvent.click(screen.getByRole('button', { name: '作成' }));

      await waitFor(() => {
        expect(
          screen.getByText('ロール名は英数字、アンダースコア、ハイフンのみ使用できます。')
        ).toBeTruthy();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('表示名が空の場合エラーが表示される', async () => {
      render(<RoleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByLabelText(/ロール名/), {
        target: { value: 'TEST_ROLE' },
      });

      fireEvent.click(screen.getByRole('button', { name: '作成' }));

      await waitFor(() => {
        expect(screen.getByText('表示名は必須です。')).toBeTruthy();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('正しいデータでフォームを送信できる', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined);

      render(<RoleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByLabelText(/ロール名/), {
        target: { value: 'TEST_ROLE' },
      });
      fireEvent.change(screen.getByLabelText(/表示名/), {
        target: { value: 'テストロール' },
      });
      fireEvent.change(screen.getByLabelText('説明'), {
        target: { value: 'テスト用のロール' },
      });

      fireEvent.click(screen.getByRole('button', { name: '作成' }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'TEST_ROLE',
          displayName: 'テストロール',
          description: 'テスト用のロール',
          permissions: {},
        });
      });
    });
  });

  describe('編集フォーム', () => {
    it('編集フォームに既存データが表示される', () => {
      render(<RoleForm role={mockRole} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      // ロール名は編集不可で表示のみ
      expect(screen.getByText('CUSTOM_ROLE')).toBeTruthy();
      const displayNameInput = screen.getByLabelText(/表示名/) as HTMLInputElement;
      expect(displayNameInput.value).toBe('カスタムロール');
      const descriptionInput = screen.getByLabelText('説明') as HTMLTextAreaElement;
      expect(descriptionInput.value).toBe('テスト用のカスタムロール');
      expect(screen.getByRole('button', { name: '更新' })).toBeTruthy();
    });

    it('編集時はロール名入力欄が表示されない', () => {
      render(<RoleForm role={mockRole} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.queryByLabelText(/^ロール名 /)).toBeNull();
    });

    it('編集フォームを送信できる', async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined);

      render(<RoleForm role={mockRole} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByLabelText(/表示名/), {
        target: { value: '更新されたロール' },
      });

      fireEvent.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            displayName: '更新されたロール',
          })
        );
      });
    });
  });

  describe('キャンセル', () => {
    it('キャンセルボタンをクリックするとonCancelが呼ばれる', () => {
      render(<RoleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中はフォームが無効化される', () => {
      render(<RoleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading />);

      const nameInput = screen.getByLabelText(/ロール名/) as HTMLInputElement;
      expect(nameInput.disabled).toBe(true);
      const displayNameInput = screen.getByLabelText(/表示名/) as HTMLInputElement;
      expect(displayNameInput.disabled).toBe(true);
      const descriptionInput = screen.getByLabelText('説明') as HTMLTextAreaElement;
      expect(descriptionInput.disabled).toBe(true);
      const cancelButton = screen.getByRole('button', { name: 'キャンセル' }) as HTMLButtonElement;
      expect(cancelButton.disabled).toBe(true);
      expect(screen.getByText('保存中...')).toBeTruthy();
    });
  });
});
