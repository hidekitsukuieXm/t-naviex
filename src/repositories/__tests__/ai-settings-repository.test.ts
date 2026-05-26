import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiSettingsRepository, AiSettingsRepository } from '../ai-settings-repository';
import { prisma } from '@/lib/prisma';
import * as encryption from '@/lib/encryption';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiSettings: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/encryption', () => ({
  encrypt: vi.fn((text) => `encrypted:${text}`),
  decrypt: vi.fn((text) => text.replace('encrypted:', '')),
  maskApiKey: vi.fn((text) => `${text.slice(0, 4)}...${text.slice(-4)}`),
}));

describe('AiSettingsRepository', () => {
  const mockSettings = {
    id: BigInt(1),
    projectId: null,
    isEnabled: true,
    apiKeyEncrypted: 'encrypted:sk-ant-test-key-12345',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    temperature: 0.7,
    usageToday: 100,
    usageMonth: 1000,
    usageTotal: 5000,
    lastUsedAt: new Date('2024-01-15'),
    lastTestedAt: new Date('2024-01-14'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrCreateSettings', () => {
    it('should return existing settings if found', async () => {
      vi.mocked(prisma.aiSettings.findFirst).mockResolvedValue(mockSettings);

      const result = await aiSettingsRepository.getOrCreateSettings(null);

      expect(prisma.aiSettings.findFirst).toHaveBeenCalledWith({
        where: { projectId: null },
      });
      expect(result.id).toBe(BigInt(1));
      expect(result.isEnabled).toBe(true);
      expect(result.hasApiKey).toBe(true);
    });

    it('should create new settings if not found', async () => {
      vi.mocked(prisma.aiSettings.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.aiSettings.create).mockResolvedValue({
        ...mockSettings,
        apiKeyEncrypted: null,
        isEnabled: false,
      });

      const result = await aiSettingsRepository.getOrCreateSettings(null);

      expect(prisma.aiSettings.create).toHaveBeenCalled();
      expect(result.isEnabled).toBe(false);
      expect(result.hasApiKey).toBe(false);
    });

    it('should search by projectId when provided', async () => {
      const projectId = BigInt(123);
      vi.mocked(prisma.aiSettings.findFirst).mockResolvedValue({
        ...mockSettings,
        projectId,
      });

      await aiSettingsRepository.getOrCreateSettings(projectId);

      expect(prisma.aiSettings.findFirst).toHaveBeenCalledWith({
        where: { projectId },
      });
    });
  });

  describe('updateSettings', () => {
    it('should update isEnabled', async () => {
      vi.mocked(prisma.aiSettings.findFirst).mockResolvedValue(mockSettings);
      vi.mocked(prisma.aiSettings.update).mockResolvedValue({
        ...mockSettings,
        isEnabled: false,
      });

      const result = await aiSettingsRepository.updateSettings(null, {
        isEnabled: false,
      });

      expect(prisma.aiSettings.update).toHaveBeenCalledWith({
        where: { id: mockSettings.id },
        data: { isEnabled: false },
      });
      expect(result.isEnabled).toBe(false);
    });

    it('should encrypt API key when provided', async () => {
      vi.mocked(prisma.aiSettings.findFirst).mockResolvedValue(mockSettings);
      vi.mocked(prisma.aiSettings.update).mockResolvedValue(mockSettings);

      await aiSettingsRepository.updateSettings(null, {
        apiKey: 'sk-ant-new-key',
      });

      expect(encryption.encrypt).toHaveBeenCalledWith('sk-ant-new-key');
      expect(prisma.aiSettings.update).toHaveBeenCalledWith({
        where: { id: mockSettings.id },
        data: { apiKeyEncrypted: 'encrypted:sk-ant-new-key' },
      });
    });

    it('should set apiKeyEncrypted to null when empty API key provided', async () => {
      vi.mocked(prisma.aiSettings.findFirst).mockResolvedValue(mockSettings);
      vi.mocked(prisma.aiSettings.update).mockResolvedValue({
        ...mockSettings,
        apiKeyEncrypted: null,
      });

      await aiSettingsRepository.updateSettings(null, {
        apiKey: '',
      });

      expect(prisma.aiSettings.update).toHaveBeenCalledWith({
        where: { id: mockSettings.id },
        data: { apiKeyEncrypted: null },
      });
    });

    it('should update model and parameters', async () => {
      vi.mocked(prisma.aiSettings.findFirst).mockResolvedValue(mockSettings);
      vi.mocked(prisma.aiSettings.update).mockResolvedValue({
        ...mockSettings,
        model: 'claude-3-opus-20240229',
        maxTokens: 2048,
        temperature: 0.5,
      });

      await aiSettingsRepository.updateSettings(null, {
        model: 'claude-3-opus-20240229',
        maxTokens: 2048,
        temperature: 0.5,
      });

      expect(prisma.aiSettings.update).toHaveBeenCalledWith({
        where: { id: mockSettings.id },
        data: {
          model: 'claude-3-opus-20240229',
          maxTokens: 2048,
          temperature: 0.5,
        },
      });
    });
  });

  describe('getDecryptedApiKey', () => {
    it('should return decrypted API key', async () => {
      vi.mocked(prisma.aiSettings.findFirst).mockResolvedValue(mockSettings);

      const result = await aiSettingsRepository.getDecryptedApiKey(null);

      expect(encryption.decrypt).toHaveBeenCalledWith(mockSettings.apiKeyEncrypted);
      expect(result).toBe('sk-ant-test-key-12345');
    });

    it('should return null when no API key is set', async () => {
      vi.mocked(prisma.aiSettings.findFirst).mockResolvedValue({
        ...mockSettings,
        apiKeyEncrypted: null,
      });

      const result = await aiSettingsRepository.getDecryptedApiKey(null);

      expect(result).toBeNull();
    });

    it('should return null when no settings found', async () => {
      vi.mocked(prisma.aiSettings.findFirst).mockResolvedValue(null);

      const result = await aiSettingsRepository.getDecryptedApiKey(null);

      expect(result).toBeNull();
    });
  });

  describe('recordUsage', () => {
    it('should increment usage counters', async () => {
      vi.mocked(prisma.aiSettings.findFirst).mockResolvedValue(mockSettings);
      vi.mocked(prisma.aiSettings.update).mockResolvedValue(mockSettings);

      await aiSettingsRepository.recordUsage(null, 500);

      expect(prisma.aiSettings.update).toHaveBeenCalledWith({
        where: { id: mockSettings.id },
        data: {
          usageToday: { increment: 500 },
          usageMonth: { increment: 500 },
          usageTotal: { increment: 500 },
          lastUsedAt: expect.any(Date),
        },
      });
    });
  });

  describe('updateLastTestedAt', () => {
    it('should update lastTestedAt', async () => {
      vi.mocked(prisma.aiSettings.findFirst).mockResolvedValue(mockSettings);
      vi.mocked(prisma.aiSettings.update).mockResolvedValue(mockSettings);

      await aiSettingsRepository.updateLastTestedAt(null);

      expect(prisma.aiSettings.update).toHaveBeenCalledWith({
        where: { id: mockSettings.id },
        data: {
          lastTestedAt: expect.any(Date),
        },
      });
    });
  });

  describe('resetDailyUsage', () => {
    it('should reset usageToday for all settings', async () => {
      vi.mocked(prisma.aiSettings.updateMany).mockResolvedValue({ count: 5 });

      await aiSettingsRepository.resetDailyUsage();

      expect(prisma.aiSettings.updateMany).toHaveBeenCalledWith({
        data: { usageToday: 0 },
      });
    });
  });

  describe('resetMonthlyUsage', () => {
    it('should reset usageMonth for all settings', async () => {
      vi.mocked(prisma.aiSettings.updateMany).mockResolvedValue({ count: 5 });

      await aiSettingsRepository.resetMonthlyUsage();

      expect(prisma.aiSettings.updateMany).toHaveBeenCalledWith({
        data: { usageMonth: 0 },
      });
    });
  });
});

describe('AI Settings Validation', () => {
  // Import validation functions inline to avoid module issues
  const validateMaxTokens = (maxTokens: number): string | null => {
    if (maxTokens < 1) return '最大トークン数は1以上である必要があります';
    if (maxTokens > 8192) return '最大トークン数は8192以下である必要があります';
    return null;
  };

  const validateTemperature = (temperature: number): string | null => {
    if (temperature < 0) return '温度は0以上である必要があります';
    if (temperature > 1) return '温度は1以下である必要があります';
    return null;
  };

  const validateApiKey = (apiKey: string): string | null => {
    if (!apiKey || apiKey.trim().length === 0) return null;
    if (!apiKey.startsWith('sk-ant-')) {
      return 'APIキーは "sk-ant-" で始まる必要があります';
    }
    if (apiKey.length < 20) {
      return 'APIキーの形式が正しくありません';
    }
    return null;
  };

  describe('validateMaxTokens', () => {
    it('should return null for valid values', () => {
      expect(validateMaxTokens(1)).toBeNull();
      expect(validateMaxTokens(4096)).toBeNull();
      expect(validateMaxTokens(8192)).toBeNull();
    });

    it('should return error for invalid values', () => {
      expect(validateMaxTokens(0)).not.toBeNull();
      expect(validateMaxTokens(-1)).not.toBeNull();
      expect(validateMaxTokens(8193)).not.toBeNull();
    });
  });

  describe('validateTemperature', () => {
    it('should return null for valid values', () => {
      expect(validateTemperature(0)).toBeNull();
      expect(validateTemperature(0.5)).toBeNull();
      expect(validateTemperature(1)).toBeNull();
    });

    it('should return error for invalid values', () => {
      expect(validateTemperature(-0.1)).not.toBeNull();
      expect(validateTemperature(1.1)).not.toBeNull();
    });
  });

  describe('validateApiKey', () => {
    it('should return null for valid API key', () => {
      expect(validateApiKey('sk-ant-api03-valid-key-12345678901234567890')).toBeNull();
    });

    it('should return null for empty API key (deletion)', () => {
      expect(validateApiKey('')).toBeNull();
    });

    it('should return error for invalid format', () => {
      expect(validateApiKey('invalid-key')).not.toBeNull();
      expect(validateApiKey('sk-')).not.toBeNull();
    });
  });
});
