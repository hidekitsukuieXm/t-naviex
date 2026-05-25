/**
 * テスト結果リポジトリのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTestResult,
  getTestResultDetail,
  getTestResultsByTestRunCase,
  createTestResult,
  deleteTestResult,
  getTestResultCount,
  getLatestTestResult,
  testResultExists,
  testRunCaseExists,
} from '../test-result-repository';
import { prisma } from '@/lib/prisma';

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    testResult: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    testRunCase: {
      count: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma);

describe('TestResult Repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockTestResult = {
    id: BigInt(1),
    testRunCaseId: BigInt(100),
    executedById: BigInt(10),
    status: 'PASSED',
    executedAt: new Date('2024-01-01T10:00:00Z'),
    executionTime: 120,
    actualResult: 'Test passed successfully',
    defects: null,
    comment: 'Good test',
    environment: 'Chrome 120',
    browserInfo: 'Windows 11',
    version: 1,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    executedBy: {
      id: BigInt(10),
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  describe('getTestResult', () => {
    it('should return test result with relations', async () => {
      mockPrisma.testResult.findUnique.mockResolvedValue(mockTestResult);

      const result = await getTestResult(BigInt(1));

      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
      expect(result?.status).toBe('PASSED');
      expect(result?.executedBy?.name).toBe('Test User');
    });

    it('should return null if result not found', async () => {
      mockPrisma.testResult.findUnique.mockResolvedValue(null);

      const result = await getTestResult(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getTestResultDetail', () => {
    it('should return test result with full details', async () => {
      const mockDetail = {
        ...mockTestResult,
        testRunCase: {
          id: BigInt(100),
          testCase: {
            id: BigInt(50),
            title: 'Test Case Title',
            priority: 'HIGH',
          },
          testRun: {
            id: BigInt(5),
            name: 'Test Run 1',
          },
        },
      };

      mockPrisma.testResult.findUnique.mockResolvedValue(mockDetail);

      const result = await getTestResultDetail(BigInt(1));

      expect(result).not.toBeNull();
      expect(result?.testRunCase.testCase.title).toBe('Test Case Title');
      expect(result?.testRunCase.testRun.name).toBe('Test Run 1');
    });
  });

  describe('getTestResultsByTestRunCase', () => {
    it('should return results for test run case', async () => {
      mockPrisma.testResult.findMany.mockResolvedValue([mockTestResult]);

      const results = await getTestResultsByTestRunCase(BigInt(100));

      expect(results).toHaveLength(1);
      expect(results[0].testRunCaseId).toBe('100');
    });

    it('should apply pagination', async () => {
      mockPrisma.testResult.findMany.mockResolvedValue([]);

      await getTestResultsByTestRunCase(BigInt(100), { limit: 10, offset: 20 });

      expect(mockPrisma.testResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });
  });

  describe('createTestResult', () => {
    it('should create test result with incremented version', async () => {
      mockPrisma.testResult.findFirst.mockResolvedValue({ version: 2 });
      mockPrisma.testResult.create.mockResolvedValue({
        ...mockTestResult,
        version: 3,
      });

      const result = await createTestResult({
        testRunCaseId: '100',
        executedById: '10',
        status: 'PASSED',
        executionTime: 120,
        actualResult: 'Test passed',
      });

      expect(result.version).toBe(3);
      expect(mockPrisma.testResult.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            version: 3,
          }),
        })
      );
    });

    it('should start at version 1 for first result', async () => {
      mockPrisma.testResult.findFirst.mockResolvedValue(null);
      mockPrisma.testResult.create.mockResolvedValue({
        ...mockTestResult,
        version: 1,
      });

      const result = await createTestResult({
        testRunCaseId: '100',
        status: 'PASSED',
      });

      expect(result.version).toBe(1);
    });
  });

  describe('deleteTestResult', () => {
    it('should delete test result', async () => {
      mockPrisma.testResult.findUnique.mockResolvedValue(mockTestResult);
      mockPrisma.testResult.delete.mockResolvedValue(mockTestResult);

      const result = await deleteTestResult(BigInt(1));

      expect(result).toBe(true);
      expect(mockPrisma.testResult.delete).toHaveBeenCalled();
    });

    it('should return false if result not found', async () => {
      mockPrisma.testResult.findUnique.mockResolvedValue(null);

      const result = await deleteTestResult(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('getTestResultCount', () => {
    it('should return count of results', async () => {
      mockPrisma.testResult.count.mockResolvedValue(5);

      const count = await getTestResultCount(BigInt(100));

      expect(count).toBe(5);
    });
  });

  describe('getLatestTestResult', () => {
    it('should return latest result', async () => {
      mockPrisma.testResult.findFirst.mockResolvedValue(mockTestResult);

      const result = await getLatestTestResult(BigInt(100));

      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
    });

    it('should return null if no results', async () => {
      mockPrisma.testResult.findFirst.mockResolvedValue(null);

      const result = await getLatestTestResult(BigInt(100));

      expect(result).toBeNull();
    });
  });

  describe('testResultExists', () => {
    it('should return true if result exists', async () => {
      mockPrisma.testResult.count.mockResolvedValue(1);

      const exists = await testResultExists(BigInt(1));

      expect(exists).toBe(true);
    });

    it('should return false if result not found', async () => {
      mockPrisma.testResult.count.mockResolvedValue(0);

      const exists = await testResultExists(BigInt(999));

      expect(exists).toBe(false);
    });
  });

  describe('testRunCaseExists', () => {
    it('should return true if test run case exists', async () => {
      mockPrisma.testRunCase.count.mockResolvedValue(1);

      const exists = await testRunCaseExists(BigInt(100));

      expect(exists).toBe(true);
    });

    it('should return false if test run case not found', async () => {
      mockPrisma.testRunCase.count.mockResolvedValue(0);

      const exists = await testRunCaseExists(BigInt(999));

      expect(exists).toBe(false);
    });
  });
});
