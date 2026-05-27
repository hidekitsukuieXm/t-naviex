/**
 * Test Data Sync Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    testCase: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    requirement: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    bug: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/neo4j', () => ({
  writeQuery: vi.fn(),
  readQuery: vi.fn(),
  runInTransaction: vi.fn(),
  verifyConnection: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { writeQuery, verifyConnection } from '@/lib/neo4j';
import {
  syncTestCasesToGraph,
  syncRequirementsToGraph,
  syncBugsToGraph,
  createSimilarTestCaseRelationships,
  fullSyncToGraph,
  syncSingleTestCase,
  syncSingleBug,
  deleteNodeFromGraph,
} from '../test-data-sync-service';

describe('Test Data Sync Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // Connection Tests
  // ========================================
  describe('Connection Handling', () => {
    it('should return error when Neo4j is not connected', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(false);

      const result = await syncTestCasesToGraph();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Neo4j connection failed');
    });

    it('should proceed when Neo4j is connected', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.testCase.count).mockResolvedValue(0);

      const result = await syncTestCasesToGraph();

      expect(result.success).toBe(true);
      expect(result.syncedNodes).toBe(0);
    });
  });

  // ========================================
  // Test Case Sync Tests
  // ========================================
  describe('syncTestCasesToGraph', () => {
    it('should sync test cases to graph', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.testCase.count).mockResolvedValue(1);
      vi.mocked(prisma.testCase.findMany).mockResolvedValue([
        {
          id: 'tc-1',
          title: 'Test Case 1',
          description: 'Description',
          testSpecId: 'spec-1',
          priority: 'HIGH',
          testType: 'FUNCTIONAL',
          preconditions: 'Preconditions',
          status: 'ACTIVE',
          steps: [
            {
              id: 'step-1',
              stepNo: 1,
              actionMd: 'Action 1',
              expectedMd: 'Expected 1',
            },
          ],
          tags: [
            {
              tag: { id: 'tag-1', name: 'smoke', color: '#ff0000' },
            },
          ],
          testSpec: { id: 'spec-1', name: 'Spec 1' },
        },
      ] as never);
      vi.mocked(writeQuery).mockResolvedValue([]);

      const result = await syncTestCasesToGraph();

      expect(result.success).toBe(true);
      expect(result.syncedNodes).toBeGreaterThan(0);
      expect(writeQuery).toHaveBeenCalled();
    });

    it('should filter by projectId when provided', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.testCase.count).mockResolvedValue(0);
      vi.mocked(prisma.testCase.findMany).mockResolvedValue([]);

      await syncTestCasesToGraph({ projectId: 'project-1' });

      expect(prisma.testCase.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            testSpec: { projectId: 'project-1' },
          }),
        })
      );
    });

    it('should filter by testSpecId when provided', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.testCase.count).mockResolvedValue(0);
      vi.mocked(prisma.testCase.findMany).mockResolvedValue([]);

      await syncTestCasesToGraph({ testSpecId: 'spec-1' });

      expect(prisma.testCase.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            testSpecId: 'spec-1',
          }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.testCase.count).mockResolvedValue(1);
      vi.mocked(prisma.testCase.findMany).mockResolvedValue([
        {
          id: 'tc-1',
          title: 'Test Case 1',
          steps: [],
          tags: [],
        },
      ] as never);
      vi.mocked(writeQuery).mockRejectedValue(new Error('Neo4j error'));

      const result = await syncTestCasesToGraph();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ========================================
  // Requirements Sync Tests
  // ========================================
  describe('syncRequirementsToGraph', () => {
    it('should sync requirements to graph', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.requirement.count).mockResolvedValue(1);
      vi.mocked(prisma.requirement.findMany).mockResolvedValue([
        {
          id: 'req-1',
          title: 'Requirement 1',
          description: 'Description',
          requirementId: 'REQ-001',
          priority: 'MUST',
          status: 'APPROVED',
          type: 'FUNCTIONAL',
          rationale: 'Rationale',
          parentId: null,
          parent: null,
          children: [],
          testCases: [],
        },
      ] as never);
      vi.mocked(writeQuery).mockResolvedValue([]);

      const result = await syncRequirementsToGraph();

      expect(result.success).toBe(true);
      expect(result.syncedNodes).toBeGreaterThan(0);
    });

    it('should create parent-child relationships', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.requirement.count).mockResolvedValue(1);
      vi.mocked(prisma.requirement.findMany).mockResolvedValue([
        {
          id: 'req-2',
          title: 'Child Requirement',
          parentId: 'req-1',
          parent: { id: 'req-1' },
          children: [],
          testCases: [],
        },
      ] as never);
      vi.mocked(writeQuery).mockResolvedValue([]);

      const result = await syncRequirementsToGraph();

      expect(result.success).toBe(true);
      expect(result.syncedRelationships).toBeGreaterThan(0);
    });
  });

  // ========================================
  // Bugs Sync Tests
  // ========================================
  describe('syncBugsToGraph', () => {
    it('should sync bugs to graph', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.bug.count).mockResolvedValue(1);
      vi.mocked(prisma.bug.findMany).mockResolvedValue([
        {
          id: 'bug-1',
          title: 'Bug 1',
          description: 'Description',
          bugId: 'BUG-001',
          severity: 'MAJOR',
          priority: 'HIGH',
          status: 'OPEN',
          type: 'BUG',
          rootCause: 'Root cause',
          stepsToReproduce: 'Steps',
          testRunCase: null,
        },
      ] as never);
      vi.mocked(writeQuery).mockResolvedValue([]);

      const result = await syncBugsToGraph();

      expect(result.success).toBe(true);
      expect(result.syncedNodes).toBeGreaterThan(0);
    });

    it('should create FOUND_BY relationship when testRunCase exists', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.bug.count).mockResolvedValue(1);
      vi.mocked(prisma.bug.findMany).mockResolvedValue([
        {
          id: 'bug-1',
          title: 'Bug 1',
          testRunCase: {
            testCase: { id: 'tc-1' },
          },
        },
      ] as never);
      vi.mocked(writeQuery).mockResolvedValue([]);

      const result = await syncBugsToGraph();

      expect(result.success).toBe(true);
      expect(result.syncedRelationships).toBeGreaterThan(0);
    });
  });

  // ========================================
  // Similarity Tests
  // ========================================
  describe('createSimilarTestCaseRelationships', () => {
    it('should create similarity relationships', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(writeQuery).mockResolvedValue([{ count: 5 }] as never);

      const result = await createSimilarTestCaseRelationships();

      expect(result.success).toBe(true);
      expect(result.syncedRelationships).toBeGreaterThan(0);
    });

    it('should filter by testSpecId when provided', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(writeQuery).mockResolvedValue([{ count: 3 }] as never);

      await createSimilarTestCaseRelationships({ testSpecId: 'spec-1' });

      expect(writeQuery).toHaveBeenCalledWith(
        expect.stringContaining('testSpecId'),
        expect.objectContaining({ testSpecId: 'spec-1' })
      );
    });
  });

  // ========================================
  // Full Sync Tests
  // ========================================
  describe('fullSyncToGraph', () => {
    it('should sync all data types', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.testCase.count).mockResolvedValue(0);
      vi.mocked(prisma.testCase.findMany).mockResolvedValue([]);
      vi.mocked(prisma.requirement.count).mockResolvedValue(0);
      vi.mocked(prisma.requirement.findMany).mockResolvedValue([]);
      vi.mocked(prisma.bug.count).mockResolvedValue(0);
      vi.mocked(prisma.bug.findMany).mockResolvedValue([]);
      vi.mocked(writeQuery).mockResolvedValue([{ count: 0 }] as never);

      const result = await fullSyncToGraph();

      expect(result.testCases).toBeDefined();
      expect(result.requirements).toBeDefined();
      expect(result.bugs).toBeDefined();
      expect(result.similarities).toBeDefined();
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('should pass options to all sync functions', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.testCase.count).mockResolvedValue(0);
      vi.mocked(prisma.testCase.findMany).mockResolvedValue([]);
      vi.mocked(prisma.requirement.count).mockResolvedValue(0);
      vi.mocked(prisma.requirement.findMany).mockResolvedValue([]);
      vi.mocked(prisma.bug.count).mockResolvedValue(0);
      vi.mocked(prisma.bug.findMany).mockResolvedValue([]);
      vi.mocked(writeQuery).mockResolvedValue([{ count: 0 }] as never);

      await fullSyncToGraph({ projectId: 'project-1' });

      expect(prisma.testCase.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            testSpec: { projectId: 'project-1' },
          }),
        })
      );
    });
  });

  // ========================================
  // Single Entity Sync Tests
  // ========================================
  describe('syncSingleTestCase', () => {
    it('should sync a single test case', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.testCase.findUnique).mockResolvedValue({
        id: 'tc-1',
        title: 'Test Case 1',
        description: 'Description',
        testSpecId: 'spec-1',
        priority: 'HIGH',
        testType: 'FUNCTIONAL',
        preconditions: 'Preconditions',
        status: 'ACTIVE',
        steps: [],
        tags: [],
      } as never);
      vi.mocked(writeQuery).mockResolvedValue([]);

      const result = await syncSingleTestCase('tc-1');

      expect(result.success).toBe(true);
      expect(result.syncedNodes).toBeGreaterThan(0);
    });

    it('should return error when test case not found', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.testCase.findUnique).mockResolvedValue(null);

      const result = await syncSingleTestCase('tc-nonexistent');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Test case not found');
    });
  });

  describe('syncSingleBug', () => {
    it('should sync a single bug', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.bug.findUnique).mockResolvedValue({
        id: 'bug-1',
        title: 'Bug 1',
        description: 'Description',
        bugId: 'BUG-001',
        severity: 'MAJOR',
        priority: 'HIGH',
        status: 'OPEN',
        testRunCase: null,
      } as never);
      vi.mocked(writeQuery).mockResolvedValue([]);

      const result = await syncSingleBug('bug-1');

      expect(result.success).toBe(true);
      expect(result.syncedNodes).toBeGreaterThan(0);
    });

    it('should return error when bug not found', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.bug.findUnique).mockResolvedValue(null);

      const result = await syncSingleBug('bug-nonexistent');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Bug not found');
    });
  });

  // ========================================
  // Delete Node Tests
  // ========================================
  describe('deleteNodeFromGraph', () => {
    it('should delete a TestCase node', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(writeQuery).mockResolvedValue([{ deleted: 1 }] as never);

      const result = await deleteNodeFromGraph('tc-1', 'TestCase');

      expect(result.success).toBe(true);
      expect(writeQuery).toHaveBeenCalledWith(
        expect.stringContaining('TestCase'),
        expect.objectContaining({ sourceId: 'tc-1' })
      );
    });

    it('should delete a Bug node', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(writeQuery).mockResolvedValue([{ deleted: 1 }] as never);

      const result = await deleteNodeFromGraph('bug-1', 'Bug');

      expect(result.success).toBe(true);
      expect(writeQuery).toHaveBeenCalledWith(
        expect.stringContaining('Bug'),
        expect.objectContaining({ sourceId: 'bug-1' })
      );
    });

    it('should delete a Requirement node', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(writeQuery).mockResolvedValue([{ deleted: 1 }] as never);

      const result = await deleteNodeFromGraph('req-1', 'Requirement');

      expect(result.success).toBe(true);
      expect(writeQuery).toHaveBeenCalledWith(
        expect.stringContaining('Requirement'),
        expect.objectContaining({ sourceId: 'req-1' })
      );
    });

    it('should handle connection failure', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(false);

      const result = await deleteNodeFromGraph('tc-1', 'TestCase');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Neo4j connection failed');
    });
  });

  // ========================================
  // Batch Processing Tests
  // ========================================
  describe('Batch Processing', () => {
    it('should process data in batches', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.testCase.count).mockResolvedValue(150);
      vi.mocked(prisma.testCase.findMany).mockResolvedValue([]);
      vi.mocked(writeQuery).mockResolvedValue([]);

      await syncTestCasesToGraph({ batchSize: 50 });

      // Should be called 3 times (150 / 50 = 3 batches)
      expect(prisma.testCase.findMany).toHaveBeenCalledTimes(3);
    });

    it('should use custom batch size', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.testCase.count).mockResolvedValue(100);
      vi.mocked(prisma.testCase.findMany).mockResolvedValue([]);
      vi.mocked(writeQuery).mockResolvedValue([]);

      await syncTestCasesToGraph({ batchSize: 25 });

      // Should be called 4 times (100 / 25 = 4 batches)
      expect(prisma.testCase.findMany).toHaveBeenCalledTimes(4);
    });
  });

  // ========================================
  // Result Structure Tests
  // ========================================
  describe('SyncResult Structure', () => {
    it('should return correct result structure', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.testCase.count).mockResolvedValue(0);
      vi.mocked(prisma.testCase.findMany).mockResolvedValue([]);

      const result = await syncTestCasesToGraph();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('syncedNodes');
      expect(result).toHaveProperty('syncedRelationships');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('duration');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.syncedNodes).toBe('number');
      expect(typeof result.syncedRelationships).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.duration).toBe('number');
    });

    it('should track duration correctly', async () => {
      vi.mocked(verifyConnection).mockResolvedValue(true);
      vi.mocked(prisma.testCase.count).mockResolvedValue(0);
      vi.mocked(prisma.testCase.findMany).mockResolvedValue([]);

      const result = await syncTestCasesToGraph();

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
