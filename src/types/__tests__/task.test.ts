import { describe, it, expect } from 'vitest';
import {
  validateTaskTitle,
  validateTaskDescription,
  validateTaskDate,
  validateTaskProgress,
  validateCreateTaskInput,
  validateUpdateTaskInput,
  getTaskStatusLabel,
  getTaskStatusColor,
  getTaskPriorityLabel,
  getTaskPriorityColor,
  isTaskOverdue,
  buildTaskTree,
  flattenTaskTree,
  TASK_TITLE_MAX_LENGTH,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_STATUS,
  TASK_PRIORITY,
  type Task,
} from '../task';

describe('task types', () => {
  describe('validateTaskTitle', () => {
    it('should accept valid title', () => {
      const result = validateTaskTitle('テスト実行');
      expect(result.valid).toBe(true);
    });

    it('should reject empty title', () => {
      const result = validateTaskTitle('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('必須');
    });

    it('should reject whitespace only title', () => {
      const result = validateTaskTitle('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('空白のみ');
    });

    it('should reject title exceeding max length', () => {
      const longTitle = 'a'.repeat(TASK_TITLE_MAX_LENGTH + 1);
      const result = validateTaskTitle(longTitle);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${TASK_TITLE_MAX_LENGTH}文字以内`);
    });

    it('should accept title at max length', () => {
      const maxTitle = 'a'.repeat(TASK_TITLE_MAX_LENGTH);
      const result = validateTaskTitle(maxTitle);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateTaskDescription', () => {
    it('should accept valid description', () => {
      const result = validateTaskDescription('タスクの詳細説明');
      expect(result.valid).toBe(true);
    });

    it('should accept null description', () => {
      const result = validateTaskDescription(null);
      expect(result.valid).toBe(true);
    });

    it('should accept empty description', () => {
      const result = validateTaskDescription('');
      expect(result.valid).toBe(true);
    });

    it('should reject description exceeding max length', () => {
      const longDesc = 'a'.repeat(TASK_DESCRIPTION_MAX_LENGTH + 1);
      const result = validateTaskDescription(longDesc);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${TASK_DESCRIPTION_MAX_LENGTH}文字以内`);
    });
  });

  describe('validateTaskDate', () => {
    it('should accept valid date', () => {
      const result = validateTaskDate('2024-01-15');
      expect(result.valid).toBe(true);
    });

    it('should accept null date', () => {
      const result = validateTaskDate(null);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid date format', () => {
      const result = validateTaskDate('2024/01/15');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('YYYY-MM-DD');
    });

    it('should reject incomplete date', () => {
      const result = validateTaskDate('2024-01');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateTaskProgress', () => {
    it('should accept valid progress', () => {
      const result = validateTaskProgress(50);
      expect(result.valid).toBe(true);
    });

    it('should accept 0', () => {
      const result = validateTaskProgress(0);
      expect(result.valid).toBe(true);
    });

    it('should accept 100', () => {
      const result = validateTaskProgress(100);
      expect(result.valid).toBe(true);
    });

    it('should reject negative progress', () => {
      const result = validateTaskProgress(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('0以上');
    });

    it('should reject progress over 100', () => {
      const result = validateTaskProgress(101);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('100以下');
    });
  });

  describe('validateCreateTaskInput', () => {
    it('should accept valid input', () => {
      const result = validateCreateTaskInput({
        projectId: '1',
        title: 'テストタスク',
        description: 'タスクの説明',
        status: TASK_STATUS.IN_PROGRESS,
        priority: TASK_PRIORITY.HIGH,
        startDate: '2024-01-01',
        endDate: '2024-01-15',
      });
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should accept minimal input', () => {
      const result = validateCreateTaskInput({
        projectId: '1',
        title: 'テストタスク',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject missing projectId', () => {
      const result = validateCreateTaskInput({
        title: 'テストタスク',
      });
      expect(result.valid).toBe(false);
      expect(result.errors?.projectId).toBeDefined();
    });

    it('should reject missing title', () => {
      const result = validateCreateTaskInput({
        projectId: '1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors?.title).toBeDefined();
    });

    it('should accept input with parentId', () => {
      const result = validateCreateTaskInput({
        projectId: '1',
        title: 'サブタスク',
        parentId: '2',
      });
      expect(result.valid).toBe(true);
      expect(result.data?.parentId).toBe('2');
    });

    it('should accept input with assigneeId', () => {
      const result = validateCreateTaskInput({
        projectId: '1',
        title: 'テストタスク',
        assigneeId: '3',
      });
      expect(result.valid).toBe(true);
      expect(result.data?.assigneeId).toBe('3');
    });
  });

  describe('validateUpdateTaskInput', () => {
    it('should accept valid input', () => {
      const result = validateUpdateTaskInput({
        title: '更新後タスク',
        status: TASK_STATUS.COMPLETED,
      });
      expect(result.valid).toBe(true);
    });

    it('should accept empty input', () => {
      const result = validateUpdateTaskInput({});
      expect(result.valid).toBe(true);
    });

    it('should accept progress update', () => {
      const result = validateUpdateTaskInput({
        progress: 75,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = validateUpdateTaskInput({
        status: 'INVALID' as never,
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid priority', () => {
      const result = validateUpdateTaskInput({
        priority: 'INVALID' as never,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('getTaskStatusLabel', () => {
    it('should return label for NOT_STARTED', () => {
      expect(getTaskStatusLabel(TASK_STATUS.NOT_STARTED)).toBe('未着手');
    });

    it('should return label for IN_PROGRESS', () => {
      expect(getTaskStatusLabel(TASK_STATUS.IN_PROGRESS)).toBe('進行中');
    });

    it('should return label for COMPLETED', () => {
      expect(getTaskStatusLabel(TASK_STATUS.COMPLETED)).toBe('完了');
    });

    it('should return label for ON_HOLD', () => {
      expect(getTaskStatusLabel(TASK_STATUS.ON_HOLD)).toBe('保留');
    });

    it('should return label for CANCELLED', () => {
      expect(getTaskStatusLabel(TASK_STATUS.CANCELLED)).toBe('キャンセル');
    });
  });

  describe('getTaskStatusColor', () => {
    it('should return color for each status', () => {
      expect(getTaskStatusColor(TASK_STATUS.NOT_STARTED)).toContain('gray');
      expect(getTaskStatusColor(TASK_STATUS.IN_PROGRESS)).toContain('blue');
      expect(getTaskStatusColor(TASK_STATUS.COMPLETED)).toContain('green');
      expect(getTaskStatusColor(TASK_STATUS.ON_HOLD)).toContain('yellow');
      expect(getTaskStatusColor(TASK_STATUS.CANCELLED)).toContain('red');
    });
  });

  describe('getTaskPriorityLabel', () => {
    it('should return label for LOW', () => {
      expect(getTaskPriorityLabel(TASK_PRIORITY.LOW)).toBe('低');
    });

    it('should return label for MEDIUM', () => {
      expect(getTaskPriorityLabel(TASK_PRIORITY.MEDIUM)).toBe('中');
    });

    it('should return label for HIGH', () => {
      expect(getTaskPriorityLabel(TASK_PRIORITY.HIGH)).toBe('高');
    });

    it('should return label for CRITICAL', () => {
      expect(getTaskPriorityLabel(TASK_PRIORITY.CRITICAL)).toBe('緊急');
    });
  });

  describe('getTaskPriorityColor', () => {
    it('should return color for each priority', () => {
      expect(getTaskPriorityColor(TASK_PRIORITY.LOW)).toContain('gray');
      expect(getTaskPriorityColor(TASK_PRIORITY.MEDIUM)).toContain('blue');
      expect(getTaskPriorityColor(TASK_PRIORITY.HIGH)).toContain('orange');
      expect(getTaskPriorityColor(TASK_PRIORITY.CRITICAL)).toContain('red');
    });
  });

  describe('isTaskOverdue', () => {
    const baseTask: Task = {
      id: '1',
      projectId: '1',
      parentId: null,
      title: 'Test Task',
      description: null,
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.MEDIUM,
      assigneeId: null,
      startDate: null,
      endDate: null,
      progress: 0,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should return false if no end date', () => {
      expect(isTaskOverdue({ ...baseTask, endDate: null })).toBe(false);
    });

    it('should return false if completed', () => {
      expect(
        isTaskOverdue({
          ...baseTask,
          endDate: '2020-01-01',
          status: TASK_STATUS.COMPLETED,
        })
      ).toBe(false);
    });

    it('should return false if cancelled', () => {
      expect(
        isTaskOverdue({
          ...baseTask,
          endDate: '2020-01-01',
          status: TASK_STATUS.CANCELLED,
        })
      ).toBe(false);
    });

    it('should return true if end date is past', () => {
      expect(
        isTaskOverdue({
          ...baseTask,
          endDate: '2020-01-01',
          status: TASK_STATUS.IN_PROGRESS,
        })
      ).toBe(true);
    });

    it('should return false if end date is in future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(
        isTaskOverdue({
          ...baseTask,
          endDate: futureDate.toISOString().split('T')[0],
          status: TASK_STATUS.IN_PROGRESS,
        })
      ).toBe(false);
    });
  });

  describe('buildTaskTree', () => {
    it('should build tree from flat list', () => {
      const tasks: Task[] = [
        {
          id: '1',
          projectId: '1',
          parentId: null,
          title: 'Root Task',
          description: null,
          status: TASK_STATUS.NOT_STARTED,
          priority: TASK_PRIORITY.MEDIUM,
          assigneeId: null,
          startDate: null,
          endDate: null,
          progress: 0,
          sortOrder: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          projectId: '1',
          parentId: '1',
          title: 'Child Task',
          description: null,
          status: TASK_STATUS.NOT_STARTED,
          priority: TASK_PRIORITY.MEDIUM,
          assigneeId: null,
          startDate: null,
          endDate: null,
          progress: 0,
          sortOrder: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const tree = buildTaskTree(tasks);
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('1');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children![0].id).toBe('2');
    });

    it('should handle multiple root tasks', () => {
      const tasks: Task[] = [
        {
          id: '1',
          projectId: '1',
          parentId: null,
          title: 'Root 1',
          description: null,
          status: TASK_STATUS.NOT_STARTED,
          priority: TASK_PRIORITY.MEDIUM,
          assigneeId: null,
          startDate: null,
          endDate: null,
          progress: 0,
          sortOrder: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          projectId: '1',
          parentId: null,
          title: 'Root 2',
          description: null,
          status: TASK_STATUS.NOT_STARTED,
          priority: TASK_PRIORITY.MEDIUM,
          assigneeId: null,
          startDate: null,
          endDate: null,
          progress: 0,
          sortOrder: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const tree = buildTaskTree(tasks);
      expect(tree).toHaveLength(2);
    });
  });

  describe('flattenTaskTree', () => {
    it('should flatten tree with level info', () => {
      const tree = [
        {
          id: '1',
          projectId: '1',
          parentId: null,
          title: 'Root',
          description: null,
          status: TASK_STATUS.NOT_STARTED as const,
          priority: TASK_PRIORITY.MEDIUM as const,
          assigneeId: null,
          startDate: null,
          endDate: null,
          progress: 0,
          sortOrder: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          children: [
            {
              id: '2',
              projectId: '1',
              parentId: '1',
              title: 'Child',
              description: null,
              status: TASK_STATUS.NOT_STARTED as const,
              priority: TASK_PRIORITY.MEDIUM as const,
              assigneeId: null,
              startDate: null,
              endDate: null,
              progress: 0,
              sortOrder: 0,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              children: [],
            },
          ],
        },
      ];

      const flat = flattenTaskTree(tree);
      expect(flat).toHaveLength(2);
      expect(flat[0].level).toBe(0);
      expect(flat[1].level).toBe(1);
    });
  });
});
