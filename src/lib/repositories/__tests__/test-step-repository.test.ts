import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/prisma', () => ({
  prisma: {
    testStep: {
      create: vi.fn(),
      createMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    testCase: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import {
  createTestStep,
  createTestStepsBulk,
  getTestStepById,
  getTestSteps,
  updateTestStep,
  deleteTestStep,
  deleteAllTestSteps,
  reorderTestSteps,
  testCaseExists,
  isTestCaseLocked,
  getTestSpecIdByTestCaseId,
  getTestStepCount,
  hasReachedMaxSteps,
  isStepNoTaken,
  getNextStepNo,
} from '../test-step-repository';

const mockPrisma = vi.mocked(prisma);

describe('Test Step Repository', () => {
  const mockDbTestStep = {
    id: BigInt(1),
    testCaseId: BigInt(100),
    stepNo: 1,
    actionMd: 'ボタンをクリックする',
    expectedMd: 'ダイアログが表示される' as string | null,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-02T12:00:00Z'),
  };

  const mockDbTestStepDetail = {
    ...mockDbTestStep,
    testCase: {
      id: BigInt(100),
      title: 'Test Case 1',
      testSpecId: BigInt(1000),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTestStep', () => {
    it('should create a new test step', async () => {
      mockPrisma.testStep.aggregate.mockResolvedValueOnce({
        _max: { stepNo: null },
        _min: {},
        _avg: {},
        _sum: {},
        _count: 0,
      });
      mockPrisma.testStep.create.mockResolvedValueOnce(mockDbTestStep);

      const result = await createTestStep({
        testCaseId: '100',
        actionMd: 'ボタンをクリックする',
        expectedMd: 'ダイアログが表示される',
      });

      expect(mockPrisma.testStep.create).toHaveBeenCalledWith({
        data: {
          testCaseId: BigInt(100),
          stepNo: 1,
          actionMd: 'ボタンをクリックする',
          expectedMd: 'ダイアログが表示される',
        },
        select: expect.any(Object),
      });

      expect(result.id).toBe('1');
      expect(result.actionMd).toBe('ボタンをクリックする');
      expect(result.stepNo).toBe(1);
    });

    it('should create test step with specified stepNo', async () => {
      mockPrisma.testStep.create.mockResolvedValueOnce({
        ...mockDbTestStep,
        stepNo: 5,
      });

      const result = await createTestStep({
        testCaseId: '100',
        stepNo: 5,
        actionMd: 'ボタンをクリックする',
      });

      expect(mockPrisma.testStep.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stepNo: 5,
          }),
        })
      );
      expect(result.stepNo).toBe(5);
    });

    it('should create test step without expected result', async () => {
      mockPrisma.testStep.aggregate.mockResolvedValueOnce({
        _max: { stepNo: null },
        _min: {},
        _avg: {},
        _sum: {},
        _count: 0,
      });
      mockPrisma.testStep.create.mockResolvedValueOnce({
        ...mockDbTestStep,
        expectedMd: null,
      });

      const result = await createTestStep({
        testCaseId: '100',
        actionMd: 'ボタンをクリックする',
      });

      expect(mockPrisma.testStep.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expectedMd: null,
          }),
        })
      );
      expect(result.expectedMd).toBeNull();
    });
  });

  describe('createTestStepsBulk', () => {
    it('should create multiple test steps', async () => {
      mockPrisma.testStep.aggregate.mockResolvedValueOnce({
        _max: { stepNo: null },
        _min: {},
        _avg: {},
        _sum: {},
        _count: 0,
      });
      mockPrisma.testStep.createMany.mockResolvedValueOnce({ count: 2 });
      mockPrisma.testStep.findMany.mockResolvedValueOnce([
        mockDbTestStep,
        { ...mockDbTestStep, id: BigInt(2), stepNo: 2 },
      ]);

      const result = await createTestStepsBulk('100', [
        { actionMd: '手順1' },
        { actionMd: '手順2', expectedMd: '期待結果2' },
      ]);

      expect(mockPrisma.testStep.createMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('getTestStepById', () => {
    it('should return test step by id', async () => {
      mockPrisma.testStep.findUnique.mockResolvedValueOnce(mockDbTestStepDetail);

      const result = await getTestStepById(BigInt(1));

      expect(mockPrisma.testStep.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        select: expect.any(Object),
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
      expect(result?.testCase.title).toBe('Test Case 1');
    });

    it('should return null for non-existent test step', async () => {
      mockPrisma.testStep.findUnique.mockResolvedValueOnce(null);

      const result = await getTestStepById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getTestSteps', () => {
    it('should return test steps for a test case', async () => {
      mockPrisma.testStep.findMany.mockResolvedValueOnce([mockDbTestStep]);

      const result = await getTestSteps({
        testCaseId: '100',
      });

      expect(mockPrisma.testStep.findMany).toHaveBeenCalledWith({
        where: { testCaseId: BigInt(100) },
        select: expect.any(Object),
        orderBy: { stepNo: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should search by query', async () => {
      mockPrisma.testStep.findMany.mockResolvedValueOnce([mockDbTestStep]);

      await getTestSteps({
        testCaseId: '100',
        query: 'ボタン',
      });

      expect(mockPrisma.testStep.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { actionMd: { contains: 'ボタン', mode: 'insensitive' } },
              { expectedMd: { contains: 'ボタン', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });
  });

  describe('updateTestStep', () => {
    it('should update test step', async () => {
      mockPrisma.testStep.findUnique.mockResolvedValueOnce(mockDbTestStep);
      mockPrisma.testStep.update.mockResolvedValueOnce({
        ...mockDbTestStep,
        actionMd: '更新されたアクション',
      });

      const result = await updateTestStep(BigInt(1), {
        actionMd: '更新されたアクション',
      });

      expect(mockPrisma.testStep.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { actionMd: '更新されたアクション' },
        select: expect.any(Object),
      });
      expect(result?.actionMd).toBe('更新されたアクション');
    });

    it('should return null for non-existent test step', async () => {
      mockPrisma.testStep.findUnique.mockResolvedValueOnce(null);

      const result = await updateTestStep(BigInt(999), {
        actionMd: '更新されたアクション',
      });

      expect(result).toBeNull();
    });

    it('should update multiple fields', async () => {
      mockPrisma.testStep.findUnique.mockResolvedValueOnce(mockDbTestStep);
      mockPrisma.testStep.update.mockResolvedValueOnce({
        ...mockDbTestStep,
        actionMd: '更新されたアクション',
        expectedMd: '更新された期待結果',
        stepNo: 3,
      });

      const result = await updateTestStep(BigInt(1), {
        actionMd: '更新されたアクション',
        expectedMd: '更新された期待結果',
        stepNo: 3,
      });

      expect(mockPrisma.testStep.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          actionMd: '更新されたアクション',
          expectedMd: '更新された期待結果',
          stepNo: 3,
        },
        select: expect.any(Object),
      });
      expect(result?.stepNo).toBe(3);
    });
  });

  describe('deleteTestStep', () => {
    it('should delete test step', async () => {
      mockPrisma.testStep.findUnique.mockResolvedValueOnce(mockDbTestStep);
      mockPrisma.testStep.delete.mockResolvedValueOnce(mockDbTestStep);
      mockPrisma.testStep.updateMany.mockResolvedValueOnce({ count: 0 });

      const result = await deleteTestStep(BigInt(1));

      expect(mockPrisma.testStep.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
      expect(result.success).toBe(true);
    });

    it('should return error for non-existent test step', async () => {
      mockPrisma.testStep.findUnique.mockResolvedValueOnce(null);

      const result = await deleteTestStep(BigInt(999));

      expect(result.success).toBe(false);
      expect(result.error).toBe('テスト手順が見つかりません。');
    });

    it('should renumber subsequent steps after deletion', async () => {
      mockPrisma.testStep.findUnique.mockResolvedValueOnce({
        ...mockDbTestStep,
        stepNo: 2,
      });
      mockPrisma.testStep.delete.mockResolvedValueOnce(mockDbTestStep);
      mockPrisma.testStep.updateMany.mockResolvedValueOnce({ count: 1 });

      await deleteTestStep(BigInt(1));

      expect(mockPrisma.testStep.updateMany).toHaveBeenCalledWith({
        where: {
          testCaseId: BigInt(100),
          stepNo: { gt: 2 },
        },
        data: {
          stepNo: { decrement: 1 },
        },
      });
    });
  });

  describe('deleteAllTestSteps', () => {
    it('should delete all test steps for a test case', async () => {
      mockPrisma.testStep.deleteMany.mockResolvedValueOnce({ count: 5 });

      const result = await deleteAllTestSteps(BigInt(100));

      expect(mockPrisma.testStep.deleteMany).toHaveBeenCalledWith({
        where: { testCaseId: BigInt(100) },
      });
      expect(result.deletedCount).toBe(5);
    });
  });

  describe('reorderTestSteps', () => {
    it('should reorder test steps', async () => {
      const reorderedSteps = [
        { ...mockDbTestStep, stepNo: 2 },
        { ...mockDbTestStep, id: BigInt(2), stepNo: 1 },
      ];
      mockPrisma.$transaction.mockResolvedValueOnce(reorderedSteps);

      const result = await reorderTestSteps('100', {
        items: [
          { id: '1', stepNo: 2 },
          { id: '2', stepNo: 1 },
        ],
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('testCaseExists', () => {
    it('should return true for existing test case', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce({ id: BigInt(100) });

      const result = await testCaseExists(BigInt(100));

      expect(result).toBe(true);
    });

    it('should return false for non-existent test case', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce(null);

      const result = await testCaseExists(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('isTestCaseLocked', () => {
    it('should return true for locked test spec', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce({
        testSpec: { isLocked: true },
      });

      const result = await isTestCaseLocked(BigInt(100));

      expect(result).toBe(true);
    });

    it('should return false for unlocked test spec', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce({
        testSpec: { isLocked: false },
      });

      const result = await isTestCaseLocked(BigInt(100));

      expect(result).toBe(false);
    });

    it('should return false for non-existent test case', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce(null);

      const result = await isTestCaseLocked(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('getTestSpecIdByTestCaseId', () => {
    it('should return test spec id', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce({
        testSpecId: BigInt(1000),
      });

      const result = await getTestSpecIdByTestCaseId(BigInt(100));

      expect(result).toBe('1000');
    });

    it('should return null for non-existent test case', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce(null);

      const result = await getTestSpecIdByTestCaseId(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getTestStepCount', () => {
    it('should return count of test steps', async () => {
      mockPrisma.testStep.count.mockResolvedValueOnce(5);

      const result = await getTestStepCount(BigInt(100));

      expect(mockPrisma.testStep.count).toHaveBeenCalledWith({
        where: { testCaseId: BigInt(100) },
      });
      expect(result).toBe(5);
    });
  });

  describe('hasReachedMaxSteps', () => {
    it('should return true when max steps reached', async () => {
      mockPrisma.testStep.count.mockResolvedValueOnce(100);

      const result = await hasReachedMaxSteps(BigInt(100));

      expect(result).toBe(true);
    });

    it('should return false when under max steps', async () => {
      mockPrisma.testStep.count.mockResolvedValueOnce(50);

      const result = await hasReachedMaxSteps(BigInt(100));

      expect(result).toBe(false);
    });
  });

  describe('isStepNoTaken', () => {
    it('should return true for taken step number', async () => {
      mockPrisma.testStep.findFirst.mockResolvedValueOnce({ id: BigInt(2) });

      const result = await isStepNoTaken(BigInt(100), 1);

      expect(result).toBe(true);
    });

    it('should return false for available step number', async () => {
      mockPrisma.testStep.findFirst.mockResolvedValueOnce(null);

      const result = await isStepNoTaken(BigInt(100), 5);

      expect(result).toBe(false);
    });

    it('should exclude specified id', async () => {
      mockPrisma.testStep.findFirst.mockResolvedValueOnce(null);

      await isStepNoTaken(BigInt(100), 1, BigInt(1));

      expect(mockPrisma.testStep.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: BigInt(1) },
          }),
        })
      );
    });
  });

  describe('getNextStepNo', () => {
    it('should return 1 for empty test case', async () => {
      mockPrisma.testStep.aggregate.mockResolvedValueOnce({
        _max: { stepNo: null },
        _min: {},
        _avg: {},
        _sum: {},
        _count: 0,
      });

      const result = await getNextStepNo(BigInt(100));

      expect(result).toBe(1);
    });

    it('should return next step number', async () => {
      mockPrisma.testStep.aggregate.mockResolvedValueOnce({
        _max: { stepNo: 3 },
        _min: {},
        _avg: {},
        _sum: {},
        _count: 3,
      });

      const result = await getNextStepNo(BigInt(100));

      expect(result).toBe(4);
    });
  });
});
