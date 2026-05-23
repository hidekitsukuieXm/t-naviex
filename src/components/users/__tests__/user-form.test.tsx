import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserForm } from '../user-form';
import type { User } from '@/types/user';

describe('UserForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty form for new user', () => {
    render(<UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/メールアドレス/)).toBeTruthy();
    expect(screen.getByLabelText(/^名前/)).toBeTruthy();
    expect(screen.getByPlaceholderText('パスワードを入力')).toBeTruthy();
    expect(screen.getByPlaceholderText('パスワードを再入力')).toBeTruthy();
    expect(screen.getByText('作成')).toBeTruthy();
  });

  it('should render form with user data for editing', () => {
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

    render(<UserForm user={mockUser} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByDisplayValue('test@example.com')).toBeTruthy();
    expect(screen.getByDisplayValue('Test User')).toBeTruthy();
    expect(screen.getByText('更新')).toBeTruthy();
  });

  it('should show error for empty email', async () => {
    render(<UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.click(screen.getByText('作成'));

    await waitFor(() => {
      expect(screen.getByText('メールアドレスは必須です。')).toBeTruthy();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should not submit form with invalid email format', async () => {
    render(<UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Fill in all fields but with invalid email format (no @ sign)
    fireEvent.change(screen.getByLabelText(/メールアドレス/), {
      target: { value: 'invalid' },
    });
    fireEvent.change(screen.getByLabelText(/^名前/), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText('パスワードを入力'), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('パスワードを再入力'), {
      target: { value: 'Password123' },
    });
    fireEvent.click(screen.getByText('作成'));

    // Should show email validation error
    await waitFor(() => {
      const errorElements = screen.queryAllByText(/メールアドレス/);
      expect(errorElements.length).toBeGreaterThan(0);
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show error for empty name', async () => {
    render(<UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/メールアドレス/), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByText('作成'));

    await waitFor(() => {
      expect(screen.getByText('名前は必須です。')).toBeTruthy();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show error for empty password when creating new user', async () => {
    render(<UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/メールアドレス/), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^名前/), {
      target: { value: 'Test User' },
    });
    fireEvent.click(screen.getByText('作成'));

    await waitFor(() => {
      expect(screen.getByText('パスワードは必須です。')).toBeTruthy();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show error for weak password', async () => {
    render(<UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/メールアドレス/), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^名前/), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText('パスワードを入力'), {
      target: { value: 'weak' },
    });
    fireEvent.click(screen.getByText('作成'));

    await waitFor(() => {
      expect(screen.getByText(/パスワードは8文字以上/)).toBeTruthy();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show error for password mismatch', async () => {
    render(<UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/メールアドレス/), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^名前/), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText('パスワードを入力'), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('パスワードを再入力'), {
      target: { value: 'Different123' },
    });
    fireEvent.click(screen.getByText('作成'));

    await waitFor(() => {
      expect(screen.getByText('パスワードが一致しません。')).toBeTruthy();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should submit form with valid data for new user', async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined);

    render(<UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/メールアドレス/), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^名前/), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText('パスワードを入力'), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('パスワードを再入力'), {
      target: { value: 'Password123' },
    });

    fireEvent.click(screen.getByText('作成'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123',
        status: 'ACTIVE',
      });
    });
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(<UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.click(screen.getByText('キャンセル'));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should disable form when loading', () => {
    render(<UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />);

    expect(screen.getByLabelText(/メールアドレス/)).toHaveProperty('disabled', true);
    expect(screen.getByLabelText(/^名前/)).toHaveProperty('disabled', true);
    expect(screen.getByPlaceholderText('パスワードを入力')).toHaveProperty('disabled', true);
    expect(screen.getByText('保存中...')).toBeTruthy();
  });

  it('should not require password when editing existing user', async () => {
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
    mockOnSubmit.mockResolvedValueOnce(undefined);

    render(<UserForm user={mockUser} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Update name
    fireEvent.change(screen.getByLabelText(/^名前/), {
      target: { value: 'Updated Name' },
    });

    fireEvent.click(screen.getByText('更新'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Updated Name',
        password: '',
        status: 'ACTIVE',
      });
    });
  });
});
