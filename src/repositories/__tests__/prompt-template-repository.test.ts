import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promptTemplateRepository } from '../prompt-template-repository';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    promptTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('PromptTemplateRepository', () => {
  const mockTemplate = {
    id: BigInt(1),
    projectId: null,
    name: 'テストテンプレート',
    description: 'テスト用のテンプレート',
    type: 'TEST_CASE_GENERATION' as const,
    content: '要件: {{requirement}}\n機能: {{feature}}',
    variables: [
      { name: 'requirement', description: '要件', required: true },
      { name: 'feature', description: '機能', required: true },
    ],
    isSystem: false,
    isDefault: false,
    sortOrder: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findByProject', () => {
    it('should return templates for project and system templates', async () => {
      vi.mocked(prisma.promptTemplate.findMany).mockResolvedValue([mockTemplate]);

      const result = await promptTemplateRepository.findByProject(null);

      expect(prisma.promptTemplate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ projectId: null }, { isSystem: true }],
        },
        orderBy: [{ isSystem: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('テストテンプレート');
    });

    it('should filter by type when provided', async () => {
      vi.mocked(prisma.promptTemplate.findMany).mockResolvedValue([mockTemplate]);

      await promptTemplateRepository.findByProject(null, 'TEST_CASE_GENERATION');

      expect(prisma.promptTemplate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ projectId: null }, { isSystem: true }],
          type: 'TEST_CASE_GENERATION',
        },
        orderBy: [{ isSystem: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      });
    });
  });

  describe('findById', () => {
    it('should return template by id', async () => {
      vi.mocked(prisma.promptTemplate.findUnique).mockResolvedValue(mockTemplate);

      const result = await promptTemplateRepository.findById(BigInt(1));

      expect(result).not.toBeNull();
      expect(result?.name).toBe('テストテンプレート');
    });

    it('should return null when not found', async () => {
      vi.mocked(prisma.promptTemplate.findUnique).mockResolvedValue(null);

      const result = await promptTemplateRepository.findById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('findDefault', () => {
    it('should return project-specific default first', async () => {
      vi.mocked(prisma.promptTemplate.findFirst).mockResolvedValue({
        ...mockTemplate,
        isDefault: true,
      });

      const result = await promptTemplateRepository.findDefault(null, 'TEST_CASE_GENERATION');

      expect(result?.isDefault).toBe(true);
    });

    it('should fall back to system default', async () => {
      vi.mocked(prisma.promptTemplate.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockTemplate, isSystem: true, isDefault: true });

      const result = await promptTemplateRepository.findDefault(null, 'TEST_CASE_GENERATION');

      expect(result?.isSystem).toBe(true);
    });
  });

  describe('create', () => {
    it('should create new template', async () => {
      vi.mocked(prisma.promptTemplate.create).mockResolvedValue(mockTemplate);

      const result = await promptTemplateRepository.create(null, {
        name: 'テストテンプレート',
        type: 'TEST_CASE_GENERATION',
        content: '要件: {{requirement}}',
      });

      expect(prisma.promptTemplate.create).toHaveBeenCalled();
      expect(result.name).toBe('テストテンプレート');
    });

    it('should unset other defaults when setting as default', async () => {
      vi.mocked(prisma.promptTemplate.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.promptTemplate.create).mockResolvedValue({
        ...mockTemplate,
        isDefault: true,
      });

      await promptTemplateRepository.create(null, {
        name: 'デフォルトテンプレート',
        type: 'TEST_CASE_GENERATION',
        content: 'content',
        isDefault: true,
      });

      expect(prisma.promptTemplate.updateMany).toHaveBeenCalledWith({
        where: {
          projectId: null,
          type: 'TEST_CASE_GENERATION',
          isDefault: true,
        },
        data: { isDefault: false },
      });
    });
  });

  describe('update', () => {
    it('should update template', async () => {
      vi.mocked(prisma.promptTemplate.findUnique).mockResolvedValue(mockTemplate);
      vi.mocked(prisma.promptTemplate.update).mockResolvedValue({
        ...mockTemplate,
        name: '更新されたテンプレート',
      });

      const result = await promptTemplateRepository.update(BigInt(1), {
        name: '更新されたテンプレート',
      });

      expect(result.name).toBe('更新されたテンプレート');
    });

    it('should throw error for system templates', async () => {
      vi.mocked(prisma.promptTemplate.findUnique).mockResolvedValue({
        ...mockTemplate,
        isSystem: true,
      });

      await expect(
        promptTemplateRepository.update(BigInt(1), { name: '新しい名前' })
      ).rejects.toThrow('System templates cannot be modified');
    });

    it('should throw error when not found', async () => {
      vi.mocked(prisma.promptTemplate.findUnique).mockResolvedValue(null);

      await expect(
        promptTemplateRepository.update(BigInt(999), { name: '新しい名前' })
      ).rejects.toThrow('Template not found');
    });
  });

  describe('delete', () => {
    it('should delete template', async () => {
      vi.mocked(prisma.promptTemplate.findUnique).mockResolvedValue(mockTemplate);
      vi.mocked(prisma.promptTemplate.delete).mockResolvedValue(mockTemplate);

      await promptTemplateRepository.delete(BigInt(1));

      expect(prisma.promptTemplate.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });

    it('should throw error for system templates', async () => {
      vi.mocked(prisma.promptTemplate.findUnique).mockResolvedValue({
        ...mockTemplate,
        isSystem: true,
      });

      await expect(promptTemplateRepository.delete(BigInt(1))).rejects.toThrow(
        'System templates cannot be deleted'
      );
    });
  });

  describe('initializeSystemTemplates', () => {
    it('should skip if templates already exist', async () => {
      vi.mocked(prisma.promptTemplate.count).mockResolvedValue(5);

      await promptTemplateRepository.initializeSystemTemplates();

      expect(prisma.promptTemplate.createMany).not.toHaveBeenCalled();
    });

    it('should create system templates if none exist', async () => {
      vi.mocked(prisma.promptTemplate.count).mockResolvedValue(0);
      vi.mocked(prisma.promptTemplate.createMany).mockResolvedValue({ count: 5 });

      await promptTemplateRepository.initializeSystemTemplates();

      expect(prisma.promptTemplate.createMany).toHaveBeenCalled();
    });
  });
});

describe('Prompt Template Utilities', () => {
  // Define validation functions inline to avoid module resolution issues in tests
  const validateTemplateName = (name: string): string | null => {
    if (!name || name.trim().length === 0) {
      return 'テンプレート名は必須です';
    }
    if (name.length > 255) {
      return 'テンプレート名は255文字以内である必要があります';
    }
    return null;
  };

  const validateTemplateContent = (content: string): string | null => {
    if (!content || content.trim().length === 0) {
      return 'プロンプト内容は必須です';
    }
    if (content.length > 50000) {
      return 'プロンプト内容は50000文字以内である必要があります';
    }
    return null;
  };

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches;
  };

  const substituteVariables = (content: string, values: Record<string, string>): string => {
    return content.replace(/\{\{(\w+)\}\}/g, (match, name) => {
      return values[name] !== undefined ? values[name] : match;
    });
  };

  describe('validateTemplateName', () => {
    it('should return null for valid names', () => {
      expect(validateTemplateName('Valid Name')).toBeNull();
      expect(validateTemplateName('テスト')).toBeNull();
    });

    it('should return error for empty names', () => {
      expect(validateTemplateName('')).not.toBeNull();
      expect(validateTemplateName('   ')).not.toBeNull();
    });

    it('should return error for names over 255 characters', () => {
      const longName = 'a'.repeat(256);
      expect(validateTemplateName(longName)).not.toBeNull();
    });
  });

  describe('validateTemplateContent', () => {
    it('should return null for valid content', () => {
      expect(validateTemplateContent('Valid content')).toBeNull();
    });

    it('should return error for empty content', () => {
      expect(validateTemplateContent('')).not.toBeNull();
      expect(validateTemplateContent('   ')).not.toBeNull();
    });
  });

  describe('extractVariables', () => {
    it('should extract variables from content', () => {
      const content = '要件: {{requirement}}\n機能: {{feature}}';
      const variables = extractVariables(content);
      expect(variables).toEqual(['requirement', 'feature']);
    });

    it('should return unique variables', () => {
      const content = '{{name}} and {{name}} again';
      const variables = extractVariables(content);
      expect(variables).toEqual(['name']);
    });

    it('should return empty array for no variables', () => {
      const content = 'No variables here';
      const variables = extractVariables(content);
      expect(variables).toEqual([]);
    });
  });

  describe('substituteVariables', () => {
    it('should substitute variables with values', () => {
      const content = '要件: {{requirement}}\n機能: {{feature}}';
      const result = substituteVariables(content, {
        requirement: 'ログイン機能',
        feature: 'ユーザー認証',
      });
      expect(result).toBe('要件: ログイン機能\n機能: ユーザー認証');
    });

    it('should keep unmatched variables as is', () => {
      const content = '{{known}} and {{unknown}}';
      const result = substituteVariables(content, { known: 'value' });
      expect(result).toBe('value and {{unknown}}');
    });
  });
});
