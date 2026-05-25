import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createConfiguration,
  getConfigurationById,
  getConfigurations,
  updateConfiguration,
  deleteConfiguration,
  updateConfigurationSortOrders,
  projectExists,
  isConfigurationNameTaken,
  configurationExistsInProject,
  getConfigurationCount,
} from '../configuration-repository';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    configuration: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as unknown as {
  configuration: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  project: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('Configuration Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDbConfiguration = {
    id: BigInt(1),
    projectId: BigInt(100),
    name: 'Windows 11 + Chrome',
    description: 'Test environment',
    configParams: {
      os: 'Windows',
      osVersion: '11',
      browser: 'Chrome',
      browserVersion: '120',
    },
    sortOrder: 0,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  describe('createConfiguration', () => {
    it('should create a configuration', async () => {
      mockPrisma.configuration.aggregate.mockResolvedValue({ _max: { sortOrder: 5 } });
      mockPrisma.configuration.create.mockResolvedValue(mockDbConfiguration);

      const result = await createConfiguration({
        projectId: '100',
        name: 'Windows 11 + Chrome',
        description: 'Test environment',
        configParams: {
          os: 'Windows',
          osVersion: '11',
          browser: 'Chrome',
          browserVersion: '120',
        },
      });

      expect(result.name).toBe('Windows 11 + Chrome');
      expect(result.projectId).toBe('100');
      expect(result.isActive).toBe(true);
      expect(mockPrisma.configuration.create).toHaveBeenCalled();
    });

    it('should calculate sort order if not provided', async () => {
      mockPrisma.configuration.aggregate.mockResolvedValue({ _max: { sortOrder: 3 } });
      mockPrisma.configuration.create.mockResolvedValue({ ...mockDbConfiguration, sortOrder: 4 });

      await createConfiguration({
        projectId: '100',
        name: 'Test Config',
      });

      expect(mockPrisma.configuration.aggregate).toHaveBeenCalled();
      expect(mockPrisma.configuration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 4,
          }),
        })
      );
    });

    it('should use provided sort order', async () => {
      mockPrisma.configuration.create.mockResolvedValue({ ...mockDbConfiguration, sortOrder: 10 });

      await createConfiguration({
        projectId: '100',
        name: 'Test Config',
        sortOrder: 10,
      });

      expect(mockPrisma.configuration.aggregate).not.toHaveBeenCalled();
      expect(mockPrisma.configuration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 10,
          }),
        })
      );
    });

    it('should use provided isActive flag', async () => {
      mockPrisma.configuration.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
      mockPrisma.configuration.create.mockResolvedValue({
        ...mockDbConfiguration,
        isActive: false,
      });

      await createConfiguration({
        projectId: '100',
        name: 'Test Config',
        isActive: false,
      });

      expect(mockPrisma.configuration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
          }),
        })
      );
    });
  });

  describe('getConfigurationById', () => {
    it('should return configuration', async () => {
      mockPrisma.configuration.findUnique.mockResolvedValue(mockDbConfiguration);

      const result = await getConfigurationById(BigInt(1));

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Windows 11 + Chrome');
      expect(result?.configParams).toEqual({
        os: 'Windows',
        osVersion: '11',
        browser: 'Chrome',
        browserVersion: '120',
      });
    });

    it('should return null if not found', async () => {
      mockPrisma.configuration.findUnique.mockResolvedValue(null);

      const result = await getConfigurationById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getConfigurations', () => {
    it('should return configurations for project', async () => {
      mockPrisma.configuration.findMany.mockResolvedValue([mockDbConfiguration]);

      const result = await getConfigurations('100');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Windows 11 + Chrome');
    });

    it('should filter by isActive', async () => {
      mockPrisma.configuration.findMany.mockResolvedValue([]);

      await getConfigurations('100', { isActive: true });

      expect(mockPrisma.configuration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should filter by search', async () => {
      mockPrisma.configuration.findMany.mockResolvedValue([]);

      await getConfigurations('100', { search: 'chrome' });

      expect(mockPrisma.configuration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ name: { contains: 'chrome', mode: 'insensitive' } }],
          }),
        })
      );
    });

    it('should sort by specified field', async () => {
      mockPrisma.configuration.findMany.mockResolvedValue([]);

      await getConfigurations('100', { sortBy: 'name', sortOrder: 'desc' });

      expect(mockPrisma.configuration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'desc' },
        })
      );
    });
  });

  describe('updateConfiguration', () => {
    it('should update configuration', async () => {
      mockPrisma.configuration.findUnique.mockResolvedValue(mockDbConfiguration);
      mockPrisma.configuration.update.mockResolvedValue({
        ...mockDbConfiguration,
        name: 'Updated Config',
        description: 'Updated description',
      });

      const result = await updateConfiguration(BigInt(1), {
        name: 'Updated Config',
        description: 'Updated description',
      });

      expect(result?.name).toBe('Updated Config');
      expect(result?.description).toBe('Updated description');
    });

    it('should return null if configuration not found', async () => {
      mockPrisma.configuration.findUnique.mockResolvedValue(null);

      const result = await updateConfiguration(BigInt(999), { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('should update configParams', async () => {
      mockPrisma.configuration.findUnique.mockResolvedValue(mockDbConfiguration);
      mockPrisma.configuration.update.mockResolvedValue({
        ...mockDbConfiguration,
        configParams: { os: 'macOS', osVersion: '14' },
      });

      await updateConfiguration(BigInt(1), {
        configParams: { os: 'macOS', osVersion: '14' },
      });

      expect(mockPrisma.configuration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            configParams: { os: 'macOS', osVersion: '14' },
          }),
        })
      );
    });

    it('should update isActive', async () => {
      mockPrisma.configuration.findUnique.mockResolvedValue(mockDbConfiguration);
      mockPrisma.configuration.update.mockResolvedValue({
        ...mockDbConfiguration,
        isActive: false,
      });

      await updateConfiguration(BigInt(1), { isActive: false });

      expect(mockPrisma.configuration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
          }),
        })
      );
    });
  });

  describe('deleteConfiguration', () => {
    it('should delete configuration', async () => {
      mockPrisma.configuration.findUnique.mockResolvedValue(mockDbConfiguration);
      mockPrisma.configuration.delete.mockResolvedValue(mockDbConfiguration);

      const result = await deleteConfiguration(BigInt(1));

      expect(result.success).toBe(true);
      expect(mockPrisma.configuration.delete).toHaveBeenCalled();
    });

    it('should return error if configuration not found', async () => {
      mockPrisma.configuration.findUnique.mockResolvedValue(null);

      const result = await deleteConfiguration(BigInt(999));

      expect(result.success).toBe(false);
      expect(result.error).toContain('見つかりません');
    });
  });

  describe('updateConfigurationSortOrders', () => {
    it('should update sort orders', async () => {
      const updates = [
        { id: '1', sortOrder: 0 },
        { id: '2', sortOrder: 1 },
      ];

      mockPrisma.$transaction.mockResolvedValue([
        { ...mockDbConfiguration, id: BigInt(1), sortOrder: 0 },
        { ...mockDbConfiguration, id: BigInt(2), sortOrder: 1 },
      ]);

      const result = await updateConfigurationSortOrders('100', updates);

      expect(result).toHaveLength(2);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('projectExists', () => {
    it('should return true if project exists', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: BigInt(100) });

      const result = await projectExists(BigInt(100));

      expect(result).toBe(true);
    });

    it('should return false if project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const result = await projectExists(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('isConfigurationNameTaken', () => {
    it('should return true if name is taken', async () => {
      mockPrisma.configuration.findFirst.mockResolvedValue(mockDbConfiguration);

      const result = await isConfigurationNameTaken(BigInt(100), 'Windows 11 + Chrome');

      expect(result).toBe(true);
    });

    it('should return false if name is not taken', async () => {
      mockPrisma.configuration.findFirst.mockResolvedValue(null);

      const result = await isConfigurationNameTaken(BigInt(100), 'New Config');

      expect(result).toBe(false);
    });

    it('should exclude specific configuration when checking', async () => {
      mockPrisma.configuration.findFirst.mockResolvedValue(null);

      await isConfigurationNameTaken(BigInt(100), 'Windows 11 + Chrome', BigInt(1));

      expect(mockPrisma.configuration.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: BigInt(1) },
          }),
        })
      );
    });
  });

  describe('configurationExistsInProject', () => {
    it('should return true if configuration exists in project', async () => {
      mockPrisma.configuration.findFirst.mockResolvedValue(mockDbConfiguration);

      const result = await configurationExistsInProject(BigInt(100), BigInt(1));

      expect(result).toBe(true);
    });

    it('should return false if configuration not in project', async () => {
      mockPrisma.configuration.findFirst.mockResolvedValue(null);

      const result = await configurationExistsInProject(BigInt(100), BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('getConfigurationCount', () => {
    it('should return count of configurations', async () => {
      mockPrisma.configuration.count.mockResolvedValue(5);

      const result = await getConfigurationCount(BigInt(100));

      expect(result).toBe(5);
    });

    it('should filter by isActive', async () => {
      mockPrisma.configuration.count.mockResolvedValue(3);

      await getConfigurationCount(BigInt(100), true);

      expect(mockPrisma.configuration.count).toHaveBeenCalledWith({
        where: {
          projectId: BigInt(100),
          isActive: true,
        },
      });
    });
  });
});
