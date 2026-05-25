import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GanttChart } from '../gantt-chart';
import type { Task } from '@/types/task';
import type { Milestone } from '@/types/milestone';

// Mock the Gantt component from the library
vi.mock('@wamra/gantt-task-react', () => ({
  Gantt: vi.fn(({ tasks, onClick, onDoubleClick }) => (
    <div data-testid="gantt-chart">
      {tasks.map((task: { id: string; name: string }) => (
        <div
          key={task.id}
          data-testid={`gantt-task-${task.id}`}
          onClick={() => onClick?.(task)}
          onDoubleClick={() => onDoubleClick?.(task)}
        >
          {task.name}
        </div>
      ))}
    </div>
  )),
  ViewMode: {
    Day: 'Day',
    Week: 'Week',
    Month: 'Month',
  },
}));

describe('GanttChart', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      projectId: '100',
      parentId: null,
      title: 'Task 1',
      description: null,
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      assigneeId: null,
      startDate: '2024-01-01',
      endDate: '2024-01-15',
      progress: 50,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      projectId: '100',
      parentId: '1',
      title: 'Task 2',
      description: null,
      status: 'NOT_STARTED',
      priority: 'HIGH',
      assigneeId: null,
      startDate: '2024-01-10',
      endDate: '2024-01-20',
      progress: 0,
      sortOrder: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockMilestones: Milestone[] = [
    {
      id: '1',
      projectId: '100',
      name: 'Milestone 1',
      description: null,
      status: 'PLANNED',
      startDate: null,
      dueDate: '2024-01-31',
      completedAt: null,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  it('should render the gantt chart with tasks and milestones', () => {
    render(<GanttChart tasks={mockTasks} milestones={mockMilestones} />);

    expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-task-task-1')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-task-task-2')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-task-milestone-1')).toBeInTheDocument();
  });

  it('should show empty state when no displayable items', () => {
    const tasksWithoutDates: Task[] = [
      {
        ...mockTasks[0],
        startDate: null,
        endDate: null,
      },
    ];
    const milestonesWithoutDates: Milestone[] = [
      {
        ...mockMilestones[0],
        dueDate: null,
      },
    ];

    render(<GanttChart tasks={tasksWithoutDates} milestones={milestonesWithoutDates} />);

    expect(
      screen.getByText(/表示できるタスクまたはマイルストーンがありません/)
    ).toBeInTheDocument();
  });

  it('should render zoom controls', () => {
    render(<GanttChart tasks={mockTasks} milestones={mockMilestones} />);

    expect(screen.getByText('表示単位:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '日' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '週' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '月' })).toBeInTheDocument();
  });

  it('should have week view as default', () => {
    render(<GanttChart tasks={mockTasks} milestones={mockMilestones} />);

    const weekButton = screen.getByRole('button', { name: '週' });
    // Default variant should be applied
    expect(weekButton).toHaveClass('bg-primary');
  });

  it('should change zoom level when clicking zoom buttons', () => {
    render(<GanttChart tasks={mockTasks} milestones={mockMilestones} />);

    const dayButton = screen.getByRole('button', { name: '日' });
    fireEvent.click(dayButton);
    expect(dayButton).toHaveClass('bg-primary');

    const monthButton = screen.getByRole('button', { name: '月' });
    fireEvent.click(monthButton);
    expect(monthButton).toHaveClass('bg-primary');
  });

  it('should render legend', () => {
    render(<GanttChart tasks={mockTasks} milestones={mockMilestones} />);

    expect(screen.getByText('凡例:')).toBeInTheDocument();
    expect(screen.getByText('未着手')).toBeInTheDocument();
    expect(screen.getByText('進行中')).toBeInTheDocument();
    expect(screen.getByText('完了')).toBeInTheDocument();
    expect(screen.getByText('保留')).toBeInTheDocument();
    expect(screen.getByText('キャンセル')).toBeInTheDocument();
    expect(screen.getByText('マイルストーン')).toBeInTheDocument();
  });

  it('should call onTaskClick when a task is clicked', () => {
    const onTaskClick = vi.fn();
    render(<GanttChart tasks={mockTasks} milestones={mockMilestones} onTaskClick={onTaskClick} />);

    fireEvent.click(screen.getByTestId('gantt-task-task-1'));
    expect(onTaskClick).toHaveBeenCalledWith('1');
  });

  it('should call onMilestoneClick when a milestone is clicked', () => {
    const onMilestoneClick = vi.fn();
    render(
      <GanttChart
        tasks={mockTasks}
        milestones={mockMilestones}
        onMilestoneClick={onMilestoneClick}
      />
    );

    fireEvent.click(screen.getByTestId('gantt-task-milestone-1'));
    expect(onMilestoneClick).toHaveBeenCalledWith('1');
  });

  it('should filter out tasks without dates', () => {
    const mixedTasks: Task[] = [
      ...mockTasks,
      {
        id: '3',
        projectId: '100',
        parentId: null,
        title: 'Task without dates',
        description: null,
        status: 'NOT_STARTED',
        priority: 'LOW',
        assigneeId: null,
        startDate: null,
        endDate: null,
        progress: 0,
        sortOrder: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    render(<GanttChart tasks={mixedTasks} milestones={mockMilestones} />);

    expect(screen.getByTestId('gantt-task-task-1')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-task-task-2')).toBeInTheDocument();
    expect(screen.queryByTestId('gantt-task-task-3')).not.toBeInTheDocument();
  });

  it('should filter out milestones without due date', () => {
    const mixedMilestones: Milestone[] = [
      ...mockMilestones,
      {
        id: '2',
        projectId: '100',
        name: 'Milestone without date',
        description: null,
        status: 'PLANNED',
        startDate: null,
        dueDate: null,
        completedAt: null,
        sortOrder: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    render(<GanttChart tasks={mockTasks} milestones={mixedMilestones} />);

    expect(screen.getByTestId('gantt-task-milestone-1')).toBeInTheDocument();
    expect(screen.queryByTestId('gantt-task-milestone-2')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <GanttChart tasks={mockTasks} milestones={mockMilestones} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should handle empty tasks and milestones', () => {
    render(<GanttChart tasks={[]} milestones={[]} />);

    expect(
      screen.getByText(/表示できるタスクまたはマイルストーンがありません/)
    ).toBeInTheDocument();
  });

  it('should display task names correctly', () => {
    render(<GanttChart tasks={mockTasks} milestones={mockMilestones} />);

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Milestone 1')).toBeInTheDocument();
  });
});
