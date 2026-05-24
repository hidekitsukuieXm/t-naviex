import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestCaseForm } from '../test-case-form';
import type { TestCase } from '@/types/test-case';
import type { TestSectionWithChildren } from '@/types/test-section';

describe('TestCaseForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const mockSections: TestSectionWithChildren[] = [
    {
      id: 'section-1',
      testSpecId: 'spec-1',
      parentId: null,
      name: 'Section 1',
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      children: [
        {
          id: 'section-1-1',
          testSpecId: 'spec-1',
          parentId: 'section-1',
          name: 'Section 1.1',
          sortOrder: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          children: [],
        },
      ],
    },
    {
      id: 'section-2',
      testSpecId: 'spec-1',
      parentId: null,
      name: 'Section 2',
      sortOrder: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      children: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form fields', () => {
    render(<TestCaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/テストケース名/)).toBeDefined();
    expect(screen.getByLabelText(/優先度/)).toBeDefined();
    expect(screen.getByLabelText(/テストタイプ/)).toBeDefined();
    expect(screen.getByLabelText(/テスト技法/)).toBeDefined();
    expect(screen.getByLabelText(/説明/)).toBeDefined();
    expect(screen.getByLabelText(/事前条件/)).toBeDefined();
    expect(screen.getByLabelText(/マトリクステストとして作成/)).toBeDefined();
  });

  it('should render with initial values when testCase is provided', () => {
    const mockTestCase: TestCase = {
      id: 'tc-1',
      testSpecId: 'spec-1',
      sectionId: 'section-1',
      title: 'Existing Test Case',
      description: 'Existing description',
      preconditions: 'Existing preconditions',
      priority: 'HIGH',
      testType: 'FUNCTIONAL',
      testTechnique: 'BOUNDARY_VALUE_ANALYSIS',
      isMatrix: true,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    };

    render(
      <TestCaseForm
        testCase={mockTestCase}
        sections={mockSections}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('Existing Test Case')).toBeDefined();
    expect(screen.getByDisplayValue('Existing description')).toBeDefined();
    expect(screen.getByDisplayValue('Existing preconditions')).toBeDefined();
  });

  it('should show error for empty title', async () => {
    render(<TestCaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('テストケースタイトルは必須です。')).toBeDefined();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show error for title exceeding max length', async () => {
    render(<TestCaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const titleInput = screen.getByLabelText(/テストケース名/);
    const longTitle = 'a'.repeat(501);

    fireEvent.change(titleInput, { target: { value: longTitle } });

    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('テストケースタイトルは500文字以内で入力してください。')
      ).toBeDefined();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit with form data', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<TestCaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const titleInput = screen.getByLabelText(/テストケース名/);
    const descriptionInput = screen.getByLabelText(/説明/);

    fireEvent.change(titleInput, { target: { value: 'New Test Case' } });
    fireEvent.change(descriptionInput, { target: { value: 'New description' } });

    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'New Test Case',
        description: 'New description',
        preconditions: '',
        priority: 'MEDIUM',
        testType: 'FUNCTIONAL',
        testTechnique: 'OTHER',
        sectionId: null,
        isMatrix: false,
      });
    });
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(<TestCaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should show loading state', () => {
    render(<TestCaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />);

    expect(screen.getByText('保存中...')).toBeDefined();
  });

  it('should disable inputs when loading', () => {
    render(<TestCaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />);

    const titleInput = screen.getByLabelText(/テストケース名/);
    const descriptionInput = screen.getByLabelText(/説明/);

    expect(titleInput.hasAttribute('disabled')).toBe(true);
    expect(descriptionInput.hasAttribute('disabled')).toBe(true);
  });

  it('should show update button text when testCase is provided', () => {
    const mockTestCase: TestCase = {
      id: 'tc-1',
      testSpecId: 'spec-1',
      sectionId: null,
      title: 'Existing Test Case',
      description: null,
      preconditions: null,
      priority: 'MEDIUM',
      testType: 'FUNCTIONAL',
      testTechnique: 'OTHER',
      isMatrix: false,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    };

    render(
      <TestCaseForm testCase={mockTestCase} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    expect(screen.getByRole('button', { name: '更新' })).toBeDefined();
  });

  it('should show error message when submit fails', async () => {
    mockOnSubmit.mockRejectedValue(new Error('API Error'));

    render(<TestCaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'Test Case' } });

    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeDefined();
    });
  });

  it('should render section select when sections are provided', () => {
    render(
      <TestCaseForm sections={mockSections} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    expect(screen.getByLabelText(/セクション/)).toBeDefined();
  });

  it('should not render section select when no sections are provided', () => {
    render(<TestCaseForm sections={[]} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.queryByLabelText(/セクション/)).toBeNull();
  });

  it('should default to MEDIUM priority', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<TestCaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'Test Case' } });

    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'MEDIUM',
        })
      );
    });
  });

  it('should default to FUNCTIONAL test type', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<TestCaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'Test Case' } });

    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          testType: 'FUNCTIONAL',
        })
      );
    });
  });

  it('should handle isMatrix checkbox', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<TestCaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'Matrix Test' } });

    const matrixCheckbox = screen.getByLabelText(/マトリクステストとして作成/);
    fireEvent.click(matrixCheckbox);

    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          isMatrix: true,
        })
      );
    });
  });

  it('should use defaultSectionId when provided', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <TestCaseForm
        sections={mockSections}
        defaultSectionId="section-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'Test Case in Section' } });

    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionId: 'section-1',
        })
      );
    });
  });

  it('should show character count for description', () => {
    render(<TestCaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByText(/0 \/ 10,000文字/)).toBeDefined();
  });

  it('should show character count for preconditions', () => {
    render(<TestCaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByText(/0 \/ 5,000文字/)).toBeDefined();
  });
});
