import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { UserCreateDialog } from '../user-create-dialog';
import { UserEditDialog } from '../user-edit-dialog';
import { UserDeleteDialog } from '../user-delete-dialog';
import type { User } from '@/types/user';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  status: 'ACTIVE',
  emailVerified: null,
  image: null,
  mfaEnabled: false,
  mfaType: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('UserCreateDialog', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render trigger button', () => {
    render(<UserCreateDialog onSuccess={mockOnSuccess} />);
    expect(screen.getByText('新規ユーザー')).toBeTruthy();
  });

  it('should open dialog on trigger click', async () => {
    render(<UserCreateDialog onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText('新規ユーザー'));

    await waitFor(() => {
      expect(screen.getByText('新規ユーザー作成')).toBeTruthy();
    });
  });

  it('should call API on form submit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '1' }),
    });

    render(<UserCreateDialog onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText('新規ユーザー'));

    await waitFor(() => {
      expect(screen.getByText('新規ユーザー作成')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/メールアドレス/), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^名前/), {
      target: { value: 'New User' },
    });
    fireEvent.change(screen.getByPlaceholderText('パスワードを入力'), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('パスワードを再入力'), {
      target: { value: 'Password123' },
    });

    fireEvent.click(screen.getByText('作成'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      });
    });
  });

  it('should call onSuccess after successful creation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '1' }),
    });

    render(<UserCreateDialog onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText('新規ユーザー'));

    await waitFor(() => {
      expect(screen.getByText('新規ユーザー作成')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/メールアドレス/), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^名前/), {
      target: { value: 'New User' },
    });
    fireEvent.change(screen.getByPlaceholderText('パスワードを入力'), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('パスワードを再入力'), {
      target: { value: 'Password123' },
    });

    fireEvent.click(screen.getByText('作成'));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});

describe('UserEditDialog', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render trigger button', () => {
    render(<UserEditDialog user={mockUser} onSuccess={mockOnSuccess} />);
    expect(screen.getByText('編集')).toBeTruthy();
  });

  it('should open dialog with user data', async () => {
    render(<UserEditDialog user={mockUser} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText('編集'));

    await waitFor(() => {
      expect(screen.getByText('ユーザー編集')).toBeTruthy();
      expect(screen.getByDisplayValue('test@example.com')).toBeTruthy();
      expect(screen.getByDisplayValue('Test User')).toBeTruthy();
    });
  });

  it('should call API on form submit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockUser, name: 'Updated Name' }),
    });

    render(<UserEditDialog user={mockUser} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText('編集'));

    await waitFor(() => {
      expect(screen.getByText('ユーザー編集')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/^名前/), {
      target: { value: 'Updated Name' },
    });

    fireEvent.click(screen.getByText('更新'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      });
    });
  });

  it('should not include password if not provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    render(<UserEditDialog user={mockUser} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText('編集'));

    await waitFor(() => {
      expect(screen.getByText('ユーザー編集')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('更新'));

    await waitFor(() => {
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.password).toBeUndefined();
    });
  });
});

describe('UserDeleteDialog', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render trigger button', () => {
    render(<UserDeleteDialog user={mockUser} onSuccess={mockOnSuccess} />);
    expect(screen.getByText('削除')).toBeTruthy();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<UserDeleteDialog user={mockUser} onSuccess={mockOnSuccess} disabled={true} />);
    expect(screen.getByText('削除').closest('button')).toHaveProperty('disabled', true);
  });

  it('should open dialog on trigger click', async () => {
    render(<UserDeleteDialog user={mockUser} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText('削除'));

    await waitFor(() => {
      expect(screen.getByText('ユーザー削除の確認')).toBeTruthy();
      expect(screen.getByText('Test User')).toBeTruthy();
      expect(screen.getByText('test@example.com')).toBeTruthy();
    });
  });

  it('should call API on confirm delete', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'ユーザーを削除しました。' }),
    });

    render(<UserDeleteDialog user={mockUser} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText('削除'));

    await waitFor(() => {
      expect(screen.getByText('ユーザー削除の確認')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('削除する'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
        method: 'DELETE',
      });
    });
  });

  it('should call onSuccess after successful deletion', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'ユーザーを削除しました。' }),
    });

    render(<UserDeleteDialog user={mockUser} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText('削除'));

    await waitFor(() => {
      expect(screen.getByText('ユーザー削除の確認')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('削除する'));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should show error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'ユーザーの削除に失敗しました。' }),
    });

    render(<UserDeleteDialog user={mockUser} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText('削除'));

    await waitFor(() => {
      expect(screen.getByText('ユーザー削除の確認')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('削除する'));

    await waitFor(() => {
      expect(screen.getByText('ユーザーの削除に失敗しました。')).toBeTruthy();
    });
  });

  it('should close dialog on cancel', async () => {
    render(<UserDeleteDialog user={mockUser} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText('削除'));

    await waitFor(() => {
      expect(screen.getByText('ユーザー削除の確認')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('キャンセル'));

    await waitFor(() => {
      expect(screen.queryByText('ユーザー削除の確認')).toBeNull();
    });
  });
});
