import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestStepForm } from '../test-step-form';
import type { TestStep } from '@/types/test-step';

describe('TestStepForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form fields', () => {
    render(<TestStepForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // RichTextEditor fields are tested via placeholder text
    expect(screen.getByPlaceholderText(/テストの操作手順を入力/)).toBeDefined();
    expect(screen.getByPlaceholderText(/期待される結果を入力/)).toBeDefined();
  });

  it('should render with initial values when step is provided', () => {
    const mockStep: TestStep = {
      id: 'step-1',
      testCaseId: 'tc-1',
      stepNo: 1,
      actionMd: 'Test action',
      expectedMd: 'Test expected result',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    render(<TestStepForm step={mockStep} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // RichTextEditor fields render with mock textarea that has the value
    const editors = screen.getAllByTestId('rich-text-editor') as HTMLTextAreaElement[];
    expect(editors.length).toBe(2);
    expect(editors[0].value).toBe('Test action');
    expect(editors[1].value).toBe('Test expected result');
  });

  it('should show error for empty action', async () => {
    render(<TestStepForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const submitButton = screen.getByRole('button', { name: '追加' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('操作手順は必須です。')).toBeDefined();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show error for action exceeding max length', async () => {
    render(<TestStepForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const actionInput = screen.getByPlaceholderText(/テストの操作手順を入力/);
    const longAction = 'a'.repeat(10001);

    fireEvent.change(actionInput, { target: { value: longAction } });

    const submitButton = screen.getByRole('button', { name: '追加' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('操作手順は10000文字以内で入力してください。')).toBeDefined();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit with form data', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<TestStepForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const actionInput = screen.getByPlaceholderText(/テストの操作手順を入力/);
    const expectedInput = screen.getByPlaceholderText(/期待される結果を入力/);

    fireEvent.change(actionInput, { target: { value: 'Click the button' } });
    fireEvent.change(expectedInput, { target: { value: 'Dialog opens' } });

    const submitButton = screen.getByRole('button', { name: '追加' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        actionMd: 'Click the button',
        expectedMd: 'Dialog opens',
      });
    });
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(<TestStepForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should show loading state', () => {
    render(<TestStepForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />);

    expect(screen.getByText('保存中...')).toBeDefined();
  });

  it('should disable inputs when loading', () => {
    render(<TestStepForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />);

    const actionInput = screen.getByPlaceholderText(/テストの操作手順を入力/);
    const expectedInput = screen.getByPlaceholderText(/期待される結果を入力/);

    expect(actionInput.hasAttribute('disabled')).toBe(true);
    expect(expectedInput.hasAttribute('disabled')).toBe(true);
  });

  it('should show update button text when step is provided', () => {
    const mockStep: TestStep = {
      id: 'step-1',
      testCaseId: 'tc-1',
      stepNo: 1,
      actionMd: 'Test action',
      expectedMd: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    render(<TestStepForm step={mockStep} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByRole('button', { name: '更新' })).toBeDefined();
  });

  it('should show error message when submit fails', async () => {
    mockOnSubmit.mockRejectedValue(new Error('API Error'));

    render(<TestStepForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const actionInput = screen.getByPlaceholderText(/テストの操作手順を入力/);
    fireEvent.change(actionInput, { target: { value: 'Test action' } });

    const submitButton = screen.getByRole('button', { name: '追加' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeDefined();
    });
  });

  it('should show character counts for text fields', () => {
    render(<TestStepForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Both fields have 10,000 character limit
    const charCounts = screen.getAllByText(/0 \/ 10,000文字/);
    expect(charCounts.length).toBe(2);
  });

  it('should allow empty expectedMd', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<TestStepForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const actionInput = screen.getByPlaceholderText(/テストの操作手順を入力/);
    fireEvent.change(actionInput, { target: { value: 'Only action provided' } });

    const submitButton = screen.getByRole('button', { name: '追加' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        actionMd: 'Only action provided',
        expectedMd: '',
      });
    });
  });

  it('should handle step with null expectedMd', () => {
    const mockStep: TestStep = {
      id: 'step-1',
      testCaseId: 'tc-1',
      stepNo: 1,
      actionMd: 'Test action',
      expectedMd: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    render(<TestStepForm step={mockStep} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const editors = screen.getAllByTestId('rich-text-editor') as HTMLTextAreaElement[];
    expect(editors[1].value).toBe('');
  });
});
