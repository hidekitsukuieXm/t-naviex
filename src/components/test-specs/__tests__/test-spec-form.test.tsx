import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestSpecForm } from '../test-spec-form';
import type { TestSpec } from '@/types/test-spec';

describe('TestSpecForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form fields', () => {
    render(<TestSpecForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/テスト仕様書名/)).toBeDefined();
    expect(screen.getByLabelText(/説明/)).toBeDefined();
    expect(screen.getByLabelText(/ステータス/)).toBeDefined();
  });

  it('should render with initial values when testSpec is provided', () => {
    const mockTestSpec: TestSpec = {
      id: '1',
      projectId: '10',
      name: 'Existing Test Spec',
      description: 'Existing description',
      status: 'REVIEW',
      version: '1.0.0',
      isLocked: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    };

    render(
      <TestSpecForm testSpec={mockTestSpec} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    expect(screen.getByDisplayValue('Existing Test Spec')).toBeDefined();
    expect(screen.getByDisplayValue('Existing description')).toBeDefined();
  });

  it('should show error for empty name', async () => {
    render(<TestSpecForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('テスト仕様書名は必須です。')).toBeDefined();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show error for name exceeding max length', async () => {
    render(<TestSpecForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/テスト仕様書名/);
    const longName = 'a'.repeat(256);

    fireEvent.change(nameInput, { target: { value: longName } });

    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('テスト仕様書名は255文字以内で入力してください。')).toBeDefined();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit with form data', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<TestSpecForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/テスト仕様書名/);
    const descriptionInput = screen.getByLabelText(/説明/);

    fireEvent.change(nameInput, { target: { value: 'New Test Spec' } });
    fireEvent.change(descriptionInput, { target: { value: 'New description' } });

    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'New Test Spec',
        description: 'New description',
        status: 'DRAFT',
      });
    });
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(<TestSpecForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should show loading state', () => {
    render(<TestSpecForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />);

    expect(screen.getByText('保存中...')).toBeDefined();
  });

  it('should disable inputs when loading', () => {
    render(<TestSpecForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />);

    const nameInput = screen.getByLabelText(/テスト仕様書名/);
    const descriptionInput = screen.getByLabelText(/説明/);

    expect(nameInput.hasAttribute('disabled')).toBe(true);
    expect(descriptionInput.hasAttribute('disabled')).toBe(true);
  });

  it('should show update button text when testSpec is provided', () => {
    const mockTestSpec: TestSpec = {
      id: '1',
      projectId: '10',
      name: 'Existing Test Spec',
      description: null,
      status: 'DRAFT',
      version: '1.0.0',
      isLocked: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    };

    render(
      <TestSpecForm testSpec={mockTestSpec} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    expect(screen.getByRole('button', { name: '更新' })).toBeDefined();
  });

  it('should show error message when submit fails', async () => {
    mockOnSubmit.mockRejectedValue(new Error('API Error'));

    render(<TestSpecForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/テスト仕様書名/);
    fireEvent.change(nameInput, { target: { value: 'Test Spec' } });

    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeDefined();
    });
  });

  it('should default to DRAFT status', () => {
    render(<TestSpecForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // The select trigger shows the current value (either label or value)
    const statusTrigger = screen.getByLabelText(/ステータス/);
    // The select may show 'DRAFT' or '下書き' depending on rendering state
    expect(
      statusTrigger.textContent?.includes('下書き') || statusTrigger.textContent?.includes('DRAFT')
    ).toBe(true);
  });
});
