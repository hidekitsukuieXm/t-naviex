import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoleCreateDialog } from '../role-create-dialog';
import { RoleEditDialog } from '../role-edit-dialog';
import { RoleDeleteDialog } from '../role-delete-dialog';
import type { Role } from '@/types/role';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RoleCreateDialog', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('ダイアログを開くボタンが表示される', () => {
    render(<RoleCreateDialog />);

    expect(screen.getByRole('button', { name: /新規ロール/ })).toBeTruthy();
  });

  it('ボタンをクリックするとダイアログが開く', async () => {
    render(<RoleCreateDialog />);

    fireEvent.click(screen.getByRole('button', { name: /新規ロール/ }));

    await waitFor(() => {
      expect(screen.getByText('新規ロール作成')).toBeTruthy();
    });
  });

  it('フォームを送信するとAPIが呼ばれる', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: '1',
          name: 'TEST_ROLE',
          displayName: 'テストロール',
        }),
    });

    const onSuccess = vi.fn();
    render(<RoleCreateDialog onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: /新規ロール/ }));

    await waitFor(() => {
      expect(screen.getByLabelText(/ロール名/)).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/ロール名/), {
      target: { value: 'TEST_ROLE' },
    });
    fireEvent.change(screen.getByLabelText(/表示名/), {
      target: { value: 'テストロール' },
    });

    fireEvent.click(screen.getByRole('button', { name: '作成' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/roles', expect.any(Object));
    });
  });
});

describe('RoleEditDialog', () => {
  const mockRole: Role = {
    id: '1',
    name: 'CUSTOM_ROLE',
    displayName: 'カスタムロール',
    description: 'テスト用',
    permissions: { projects: ['read'] },
    isSystemRole: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('編集ボタンが表示される', () => {
    render(<RoleEditDialog role={mockRole} />);

    expect(screen.getByRole('button', { name: /編集/ })).toBeTruthy();
  });

  it('ボタンをクリックするとダイアログが開く', async () => {
    render(<RoleEditDialog role={mockRole} />);

    fireEvent.click(screen.getByRole('button', { name: /編集/ }));

    await waitFor(() => {
      expect(screen.getByText('ロール編集')).toBeTruthy();
    });
  });

  it('既存のデータがフォームに表示される', async () => {
    render(<RoleEditDialog role={mockRole} />);

    fireEvent.click(screen.getByRole('button', { name: /編集/ }));

    await waitFor(() => {
      const displayNameInput = screen.getByLabelText(/表示名/) as HTMLInputElement;
      expect(displayNameInput.value).toBe('カスタムロール');
      const descriptionInput = screen.getByLabelText('説明') as HTMLTextAreaElement;
      expect(descriptionInput.value).toBe('テスト用');
    });
  });

  it('フォームを送信するとAPIが呼ばれる', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...mockRole, displayName: '更新されたロール' }),
    });

    const onSuccess = vi.fn();
    render(<RoleEditDialog role={mockRole} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: /編集/ }));

    await waitFor(() => {
      expect(screen.getByLabelText(/表示名/)).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/表示名/), {
      target: { value: '更新されたロール' },
    });

    fireEvent.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/roles/1', expect.any(Object));
    });
  });
});

describe('RoleDeleteDialog', () => {
  const mockRole: Role = {
    id: '1',
    name: 'CUSTOM_ROLE',
    displayName: 'カスタムロール',
    description: 'テスト用',
    permissions: {},
    isSystemRole: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('削除ボタンが表示される', () => {
    render(<RoleDeleteDialog role={mockRole} />);

    expect(screen.getByRole('button', { name: /削除/ })).toBeTruthy();
  });

  it('disabledの場合ボタンが無効化される', () => {
    render(<RoleDeleteDialog role={mockRole} disabled />);

    const button = screen.getByRole('button', { name: /削除/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('ボタンをクリックするとダイアログが開く', async () => {
    render(<RoleDeleteDialog role={mockRole} />);

    fireEvent.click(screen.getByRole('button', { name: /削除/ }));

    await waitFor(() => {
      expect(screen.getByText('ロール削除の確認')).toBeTruthy();
    });
  });

  it('ロール情報が表示される', async () => {
    render(<RoleDeleteDialog role={mockRole} />);

    fireEvent.click(screen.getByRole('button', { name: /削除/ }));

    await waitFor(() => {
      expect(screen.getByText('カスタムロール')).toBeTruthy();
      expect(screen.getByText('CUSTOM_ROLE')).toBeTruthy();
    });
  });

  it('削除を実行するとAPIが呼ばれる', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: '削除しました' }),
    });

    const onSuccess = vi.fn();
    render(<RoleDeleteDialog role={mockRole} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: /削除/ }));

    await waitFor(() => {
      expect(screen.getByText('ロール削除の確認')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: '削除する' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/roles/1', { method: 'DELETE' });
    });
  });

  it('削除に失敗するとエラーが表示される', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'このロールは使用中です。' }),
    });

    render(<RoleDeleteDialog role={mockRole} />);

    fireEvent.click(screen.getByRole('button', { name: /削除/ }));

    await waitFor(() => {
      expect(screen.getByText('ロール削除の確認')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: '削除する' }));

    await waitFor(() => {
      expect(screen.getByText('このロールは使用中です。')).toBeTruthy();
    });
  });

  it('キャンセルボタンでダイアログが閉じる', async () => {
    render(<RoleDeleteDialog role={mockRole} />);

    fireEvent.click(screen.getByRole('button', { name: /削除/ }));

    await waitFor(() => {
      expect(screen.getByText('ロール削除の確認')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

    await waitFor(() => {
      expect(screen.queryByText('ロール削除の確認')).toBeNull();
    });
  });
});
