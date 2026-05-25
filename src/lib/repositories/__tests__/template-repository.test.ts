import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTemplates,
  getTemplate,
  getTemplateDetail,
  getTemplateByName,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  hasTemplates,
  getDefaultTemplate,
  setDefaultTemplate,
  updateTemplateSortOrders,
} from '../template-repository';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    testCaseTemplate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    testCaseTemplateStep: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = vi.mocked(prisma);

describe('template-repository', () => {
  const mockTemplate = {
    id: BigInt(1),
    projectId: BigInt(100),
    name: 'テンプレート1',
    description: 'テンプレートの説明',
    title: 'タイトルテンプレート',
    templateDescription: '説明テンプレート',
    preconditions: '前提条件',
    expectedResult: '期待結果',
    checkpoint: '確認ポイント',
    scenario: 'シナリオ',
    testEnvironment: 'テスト環境',
    notes: '備考',
    tags: ['tag1', 'tag2'],
    classification: '分類',
    priority: 'MEDIUM',
    testType: 'FUNCTIONAL',
    testTechnique: 'OTHER',
    isDefault: false,
    sortOrder: 1,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockTemplateStep = {
    id: BigInt(1),
    templateId: BigInt(1),
    stepNo: 1,
    actionMd: '操作1',
    expectedMd: '期待結果1',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockTemplateWithSteps = {
    ...mockTemplate,
    templateSteps: [mockTemplateStep],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTemplates', () => {
    it('should return all templates for a project', async () => {
      mockPrisma.testCaseTemplate.findMany.mockResolvedValue([mockTemplate]);
      mockPrisma.testCaseTemplate.count.mockResolvedValue(1);

      const result = await getTemplates('100');

      expect(result.templates).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.templates[0].name).toBe('テンプレート1');
    });

    it('should filter default templates only', async () => {
      mockPrisma.testCaseTemplate.findMany.mockResolvedValue([mockTemplate]);
      mockPrisma.testCaseTemplate.count.mockResolvedValue(1);

      await getTemplates('100', { defaultOnly: true });

      expect(mockPrisma.testCaseTemplate.findMany).toHaveBeenCalledWith({
        where: { projectId: BigInt(100), isDefault: true },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('getTemplate', () => {
    it('should return a template by id', async () => {
      mockPrisma.testCaseTemplate.findFirst.mockResolvedValue(mockTemplate);

      const result = await getTemplate('100', '1');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('テンプレート1');
    });

    it('should return null if not found', async () => {
      mockPrisma.testCaseTemplate.findFirst.mockResolvedValue(null);

      const result = await getTemplate('100', '999');

      expect(result).toBeNull();
    });
  });

  describe('getTemplateDetail', () => {
    it('should return a template with steps', async () => {
      mockPrisma.testCaseTemplate.findFirst.mockResolvedValue(mockTemplateWithSteps);

      const result = await getTemplateDetail('100', '1');

      expect(result).not.toBeNull();
      expect(result?.templateSteps).toHaveLength(1);
      expect(result?.templateSteps[0].actionMd).toBe('操作1');
    });
  });

  describe('getTemplateByName', () => {
    it('should return a template by name', async () => {
      mockPrisma.testCaseTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await getTemplateByName('100', 'テンプレート1');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('テンプレート1');
    });
  });

  describe('createTemplate', () => {
    it('should create a template', async () => {
      mockPrisma.testCaseTemplate.create.mockResolvedValue(mockTemplateWithSteps);

      const result = await createTemplate('100', {
        name: 'テンプレート1',
        description: 'テンプレートの説明',
        templateSteps: [{ stepNo: 1, actionMd: '操作1', expectedMd: '期待結果1' }],
      });

      expect(result.name).toBe('テンプレート1');
      expect(result.templateSteps).toHaveLength(1);
      expect(mockPrisma.testCaseTemplate.create).toHaveBeenCalled();
    });
  });

  describe('updateTemplate', () => {
    it('should update a template', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return callback({
            testCaseTemplateStep: { deleteMany: vi.fn() },
            testCaseTemplate: {
              update: vi.fn().mockResolvedValue({
                ...mockTemplateWithSteps,
                name: '更新後のテンプレート',
              }),
            },
          });
        }
        return mockTemplateWithSteps;
      });

      const result = await updateTemplate('100', '1', { name: '更新後のテンプレート' });

      expect(result.name).toBe('更新後のテンプレート');
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', async () => {
      mockPrisma.testCaseTemplate.delete.mockResolvedValue(mockTemplate);

      await deleteTemplate('100', '1');

      expect(mockPrisma.testCaseTemplate.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1), projectId: BigInt(100) },
      });
    });
  });

  describe('duplicateTemplate', () => {
    it('should duplicate a template', async () => {
      mockPrisma.testCaseTemplate.findFirst.mockResolvedValue(mockTemplateWithSteps);
      mockPrisma.testCaseTemplate.create.mockResolvedValue({
        ...mockTemplateWithSteps,
        id: BigInt(2),
        name: 'テンプレート1 (コピー)',
        isDefault: false,
      });

      const result = await duplicateTemplate('100', '1', 'テンプレート1 (コピー)');

      expect(result.name).toBe('テンプレート1 (コピー)');
      expect(result.isDefault).toBe(false);
    });

    it('should throw error if original not found', async () => {
      mockPrisma.testCaseTemplate.findFirst.mockResolvedValue(null);

      await expect(duplicateTemplate('100', '999', 'コピー')).rejects.toThrow('Template not found');
    });
  });

  describe('hasTemplates', () => {
    it('should return true if templates exist', async () => {
      mockPrisma.testCaseTemplate.count.mockResolvedValue(3);

      const result = await hasTemplates('100');

      expect(result).toBe(true);
    });

    it('should return false if no templates exist', async () => {
      mockPrisma.testCaseTemplate.count.mockResolvedValue(0);

      const result = await hasTemplates('100');

      expect(result).toBe(false);
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return the default template', async () => {
      mockPrisma.testCaseTemplate.findFirst.mockResolvedValue({
        ...mockTemplateWithSteps,
        isDefault: true,
      });

      const result = await getDefaultTemplate('100');

      expect(result).not.toBeNull();
      expect(result?.isDefault).toBe(true);
    });

    it('should return null if no default template', async () => {
      mockPrisma.testCaseTemplate.findFirst.mockResolvedValue(null);

      const result = await getDefaultTemplate('100');

      expect(result).toBeNull();
    });
  });

  describe('setDefaultTemplate', () => {
    it('should set a template as default', async () => {
      mockPrisma.$transaction.mockResolvedValue([{ count: 1 }, mockTemplate]);

      await setDefaultTemplate('100', '1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('updateTemplateSortOrders', () => {
    it('should update sort orders', async () => {
      mockPrisma.$transaction.mockResolvedValue([mockTemplate, mockTemplate]);

      await updateTemplateSortOrders('100', [
        { id: '1', sortOrder: 10 },
        { id: '2', sortOrder: 20 },
      ]);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
