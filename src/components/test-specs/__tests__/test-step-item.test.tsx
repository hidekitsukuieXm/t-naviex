import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestStepItem } from '../test-step-item';
import type { TestStep } from '@/types/test-step';

// Mock useSortable hook
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => null,
    },
  },
}));

describe('TestStepItem', () => {
  const mockOnUpdate = vi.fn();
  const mockOnDelete = vi.fn();

  const mockStep: TestStep = {
    id: 'step-1',
    testCaseId: 'tc-1',
    stepNo: 1,
    actionMd: 'Click the login button',
    expectedMd: 'Login dialog appears',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render step number', () => {
    render(<TestStepItem step={mockStep} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />);

    expect(screen.getByText('1')).toBeDefined();
  });

  it('should render action content', () => {
    render(<TestStepItem step={mockStep} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />);

    expect(screen.getByText('操作手順')).toBeDefined();
    expect(screen.getByText('Click the login button')).toBeDefined();
  });

  it('should render expected result', () => {
    render(<TestStepItem step={mockStep} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />);

    expect(screen.getByText('期待結果')).toBeDefined();
    expect(screen.getByText('Login dialog appears')).toBeDefined();
  });

  it('should not render expected result section when expectedMd is null', () => {
    const stepWithoutExpected: TestStep = {
      ...mockStep,
      expectedMd: null,
    };

    render(
      <TestStepItem step={stepWithoutExpected} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('操作手順')).toBeDefined();
    // There should only be one label - for 操作手順
    const labels = screen.queryAllByText('期待結果');
    expect(labels.length).toBe(0);
  });

  it('should open edit dialog when edit button is clicked', async () => {
    render(<TestStepItem step={mockStep} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />);

    const editButton = screen.getByTitle('編集');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('手順 1 を編集')).toBeDefined();
    });
  });

  it('should open delete confirm dialog when delete button is clicked', async () => {
    render(<TestStepItem step={mockStep} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByTitle('削除');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('手順の削除')).toBeDefined();
      expect(
        screen.getByText('手順 1 を削除してもよろしいですか？この操作は取り消せません。')
      ).toBeDefined();
    });
  });

  it('should call onDelete when confirming delete', async () => {
    mockOnDelete.mockResolvedValue(undefined);

    render(<TestStepItem step={mockStep} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByTitle('削除');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('手順の削除')).toBeDefined();
    });

    const confirmButton = screen.getByRole('button', { name: '削除' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('step-1');
    });
  });

  it('should cancel delete when cancel button clicked', async () => {
    render(<TestStepItem step={mockStep} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByTitle('削除');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('手順の削除')).toBeDefined();
    });

    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('should call onUpdate when editing step', async () => {
    mockOnUpdate.mockResolvedValue(undefined);

    render(<TestStepItem step={mockStep} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />);

    const editButton = screen.getByTitle('編集');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('手順 1 を編集')).toBeDefined();
    });

    const actionInput = screen.getByPlaceholderText(/テストの操作手順を入力/);
    fireEvent.change(actionInput, { target: { value: 'Updated action' } });

    const updateButton = screen.getByRole('button', { name: '更新' });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('step-1', {
        actionMd: 'Updated action',
        expectedMd: 'Login dialog appears',
      });
    });
  });

  it('should disable buttons when disabled prop is true', () => {
    render(
      <TestStepItem
        step={mockStep}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        disabled={true}
      />
    );

    const editButton = screen.getByTitle('編集');
    const deleteButton = screen.getByTitle('削除');

    expect(editButton.hasAttribute('disabled')).toBe(true);
    expect(deleteButton.hasAttribute('disabled')).toBe(true);
  });

  it('should render drag handle', () => {
    render(<TestStepItem step={mockStep} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />);

    // The grip icon should be present (rendered inside a button)
    const buttons = screen.getAllByRole('button');
    // Should have drag handle, edit, and delete buttons (3 total, plus dialogs when open)
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });
});
