import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MilestoneStatusBadge } from '../milestone-status-badge';
import { MilestoneCard } from '../milestone-card';
import { MilestoneForm } from '../milestone-form';
import type { Milestone } from '@/types/milestone';

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('MilestoneStatusBadge', () => {
  it('should render PLANNED status', () => {
    render(<MilestoneStatusBadge status="PLANNED" />);
    expect(screen.getByText('計画中')).toBeInTheDocument();
  });

  it('should render IN_PROGRESS status', () => {
    render(<MilestoneStatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('進行中')).toBeInTheDocument();
  });

  it('should render COMPLETED status', () => {
    render(<MilestoneStatusBadge status="COMPLETED" />);
    expect(screen.getByText('完了')).toBeInTheDocument();
  });

  it('should render CANCELLED status', () => {
    render(<MilestoneStatusBadge status="CANCELLED" />);
    expect(screen.getByText('キャンセル')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <MilestoneStatusBadge status="PLANNED" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('MilestoneCard', () => {
  const mockMilestone: Milestone = {
    id: '1',
    projectId: '100',
    name: 'Sprint 1',
    description: 'First sprint description',
    status: 'IN_PROGRESS',
    startDate: '2024-01-01',
    dueDate: '2024-01-14',
    completedAt: null,
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render milestone name', () => {
    render(
      <MilestoneCard
        milestone={mockMilestone}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDeleting={false}
      />
    );
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
  });

  it('should render milestone description', () => {
    render(
      <MilestoneCard
        milestone={mockMilestone}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDeleting={false}
      />
    );
    expect(screen.getByText('First sprint description')).toBeInTheDocument();
  });

  it('should render status badge', () => {
    render(
      <MilestoneCard
        milestone={mockMilestone}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDeleting={false}
      />
    );
    expect(screen.getByText('進行中')).toBeInTheDocument();
  });

  it('should render start and due dates', () => {
    render(
      <MilestoneCard
        milestone={mockMilestone}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDeleting={false}
      />
    );
    expect(screen.getByText(/開始: 2024\/01\/01/)).toBeInTheDocument();
    expect(screen.getByText(/期限: 2024\/01\/14/)).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', async () => {
    render(
      <MilestoneCard
        milestone={mockMilestone}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDeleting={false}
      />
    );

    const editButton = screen.getByRole('button', { name: /編集/ });
    await userEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockMilestone);
  });

  it('should call onDelete when delete button is clicked', async () => {
    render(
      <MilestoneCard
        milestone={mockMilestone}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDeleting={false}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /削除/ });
    await userEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('should disable delete button when isDeleting is true', () => {
    render(
      <MilestoneCard
        milestone={mockMilestone}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDeleting={true}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /削除/ });
    expect(deleteButton).toBeDisabled();
  });

  it('should show overdue indicator for past due date', () => {
    const overdueMilestone: Milestone = {
      ...mockMilestone,
      dueDate: '2020-01-01', // Past date
      status: 'IN_PROGRESS',
    };

    render(
      <MilestoneCard
        milestone={overdueMilestone}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDeleting={false}
      />
    );

    expect(screen.getByTitle('期限超過')).toBeInTheDocument();
  });

  it('should not show overdue indicator for completed milestone', () => {
    const completedMilestone: Milestone = {
      ...mockMilestone,
      dueDate: '2020-01-01', // Past date
      status: 'COMPLETED',
    };

    render(
      <MilestoneCard
        milestone={completedMilestone}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDeleting={false}
      />
    );

    expect(screen.queryByTitle('期限超過')).not.toBeInTheDocument();
  });

  it('should show default description when none provided', () => {
    const noDescMilestone: Milestone = {
      ...mockMilestone,
      description: null,
    };

    render(
      <MilestoneCard
        milestone={noDescMilestone}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDeleting={false}
      />
    );

    expect(screen.getByText('マイルストーンの説明がありません')).toBeInTheDocument();
  });
});

describe('MilestoneForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form fields', () => {
    render(<MilestoneForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/マイルストーン名/)).toBeInTheDocument();
    expect(screen.getByLabelText(/説明/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ステータス/)).toBeInTheDocument();
    expect(screen.getByLabelText(/開始日/)).toBeInTheDocument();
    expect(screen.getByLabelText(/期限日/)).toBeInTheDocument();
  });

  it('should show validation error for empty name', async () => {
    render(<MilestoneForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const submitButton = screen.getByRole('button', { name: /作成/ });
    await userEvent.click(submitButton);

    expect(screen.getByText(/マイルストーン名は必須/)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show validation error when due date is before start date', async () => {
    render(<MilestoneForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/マイルストーン名/);
    const startDateInput = screen.getByLabelText(/開始日/);
    const dueDateInput = screen.getByLabelText(/期限日/);

    await userEvent.type(nameInput, 'Test Milestone');
    await userEvent.type(startDateInput, '2024-01-15');
    await userEvent.type(dueDateInput, '2024-01-01');

    const submitButton = screen.getByRole('button', { name: /作成/ });
    await userEvent.click(submitButton);

    expect(screen.getByText(/期限日は開始日より後/)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should submit form with valid data', async () => {
    render(<MilestoneForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/マイルストーン名/);
    await userEvent.type(nameInput, 'Test Milestone');

    const submitButton = screen.getByRole('button', { name: /作成/ });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Milestone',
          status: 'PLANNED',
        })
      );
    });
  });

  it('should call onCancel when cancel button is clicked', async () => {
    render(<MilestoneForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', { name: /キャンセル/ });
    await userEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should populate form with initial data', () => {
    const initialData: Milestone = {
      id: '1',
      projectId: '100',
      name: 'Sprint 1',
      description: 'Test description',
      status: 'IN_PROGRESS',
      startDate: '2024-01-01',
      dueDate: '2024-01-14',
      completedAt: null,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    render(
      <MilestoneForm initialData={initialData} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    const nameInput = screen.getByLabelText(/マイルストーン名/) as HTMLInputElement;
    expect(nameInput.value).toBe('Sprint 1');

    const descriptionInput = screen.getByLabelText(/説明/) as HTMLTextAreaElement;
    expect(descriptionInput.value).toBe('Test description');
  });

  it('should show update button when editing', () => {
    const initialData: Milestone = {
      id: '1',
      projectId: '100',
      name: 'Sprint 1',
      description: null,
      status: 'PLANNED',
      startDate: null,
      dueDate: null,
      completedAt: null,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    render(
      <MilestoneForm initialData={initialData} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    expect(screen.getByRole('button', { name: /更新/ })).toBeInTheDocument();
  });

  it('should disable form when isSubmitting is true', () => {
    render(<MilestoneForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting={true} />);

    const nameInput = screen.getByLabelText(/マイルストーン名/);
    expect(nameInput).toBeDisabled();

    const submitButton = screen.getByRole('button', { name: /作成/ });
    expect(submitButton).toBeDisabled();

    const cancelButton = screen.getByRole('button', { name: /キャンセル/ });
    expect(cancelButton).toBeDisabled();
  });

  it('should show character count for name', () => {
    render(<MilestoneForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByText(/0\/255/)).toBeInTheDocument();
  });

  it('should update character count when typing', async () => {
    render(<MilestoneForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/マイルストーン名/);
    await userEvent.type(nameInput, 'Test');

    expect(screen.getByText(/4\/255/)).toBeInTheDocument();
  });
});
