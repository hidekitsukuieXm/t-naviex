import { describe, it, expect, vi, beforeEach } from 'vitest';

// SmtpClientのモック
vi.mock('../smtp-client', () => ({
  SmtpClient: {
    fromSettings: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' }),
      testConnection: vi.fn().mockResolvedValue({ success: true }),
      close: vi.fn(),
    })),
  },
}));

// モックの設定
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userNotificationSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    emailTemplate: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    emailQueue: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      fields: {
        maxAttempts: {},
      },
    },
    emailSendLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/repositories/smtp-settings-repository', () => ({
  getSmtpSettingsWithPassword: vi.fn(),
}));

vi.mock('@/lib/repositories/email-template-repository', () => ({
  getEmailTemplateByType: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getSmtpSettingsWithPassword } from '@/lib/repositories/smtp-settings-repository';
import { getEmailTemplateByType } from '@/lib/repositories/email-template-repository';
import {
  NotificationService,
  getNotificationService,
  resetNotificationService,
} from '../notification-service';

const mockPrisma = vi.mocked(prisma);
const mockGetSmtpSettingsWithPassword = vi.mocked(getSmtpSettingsWithPassword);
const mockGetEmailTemplateByType = vi.mocked(getEmailTemplateByType);

describe('NotificationService', () => {
  const mockSmtpSettings = {
    id: '1',
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    authEnabled: true,
    username: 'user@example.com',
    password: '********',
    fromEmail: 'noreply@example.com',
    fromName: 'T-NaviEx',
    isEnabled: true,
    lastTestedAt: '2024-01-01T00:00:00.000Z',
    lastTestSuccess: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    decryptedPassword: 'password123',
  };

  const mockUser = {
    email: 'user@example.com',
    name: 'Test User',
  };

  const mockTemplate = {
    id: '1',
    name: 'test-assigned-default',
    type: 'TEST_ASSIGNED' as const,
    subject: '【{{projectName}}】テストケースが割り当てられました',
    body: '<p>{{userName}}様、テストケースが割り当てられました。</p>',
    variables: ['userName', 'projectName'],
    description: 'テスト割当通知',
    isActive: true,
    isDefault: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetNotificationService();
  });

  describe('getUserNotificationSettings', () => {
    it('should return default settings when no settings exist', async () => {
      mockPrisma.userNotificationSettings.findUnique.mockResolvedValueOnce(null);

      const service = new NotificationService();
      const settings = await service.getUserNotificationSettings('1', 'TEST_ASSIGNED');

      expect(settings.emailEnabled).toBe(true);
      expect(settings.inAppEnabled).toBe(true);
    });

    it('should return user settings when they exist', async () => {
      mockPrisma.userNotificationSettings.findUnique.mockResolvedValueOnce({
        id: BigInt(1),
        userId: BigInt(1),
        notificationType: 'TEST_ASSIGNED',
        emailEnabled: false,
        inAppEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const service = new NotificationService();
      const settings = await service.getUserNotificationSettings('1', 'TEST_ASSIGNED');

      expect(settings.emailEnabled).toBe(false);
      expect(settings.inAppEnabled).toBe(true);
    });
  });

  describe('updateUserNotificationSettings', () => {
    it('should update notification settings', async () => {
      mockPrisma.userNotificationSettings.upsert.mockResolvedValueOnce({
        id: BigInt(1),
        userId: BigInt(1),
        notificationType: 'TEST_ASSIGNED',
        emailEnabled: false,
        inAppEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const service = new NotificationService();
      await service.updateUserNotificationSettings('1', 'TEST_ASSIGNED', false, true);

      expect(mockPrisma.userNotificationSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_notificationType: {
              userId: BigInt(1),
              notificationType: 'TEST_ASSIGNED',
            },
          },
        })
      );
    });
  });

  describe('sendNotification', () => {
    it('should return error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const service = new NotificationService();
      const result = await service.sendNotification({
        type: 'TEST_ASSIGNED',
        userId: '999',
        variables: {},
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('ユーザーが見つかりません');
    });

    it('should send notification when user exists and settings allow it', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.userNotificationSettings.findUnique.mockResolvedValueOnce(null);
      mockGetEmailTemplateByType.mockResolvedValueOnce(mockTemplate);
      mockGetSmtpSettingsWithPassword.mockResolvedValueOnce({
        ...mockSmtpSettings,
        isEnabled: false, // SMTPが無効なのでキューに追加される
      });
      mockPrisma.emailQueue.create.mockResolvedValueOnce({
        id: BigInt(1),
        templateId: BigInt(1),
        toEmail: mockUser.email,
        toName: mockUser.name,
        subject: '【Test Project】テストケースが割り当てられました',
        body: '<p>Test User様、テストケースが割り当てられました。</p>',
        variables: null,
        status: 'PENDING',
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        errorMessage: null,
        scheduledAt: null,
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const service = new NotificationService();
      const result = await service.sendNotification({
        type: 'TEST_ASSIGNED',
        userId: '1',
        variables: { projectName: 'Test Project' },
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(true);
    });

    it('should not send email when email notification is disabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.userNotificationSettings.findUnique.mockResolvedValueOnce({
        id: BigInt(1),
        userId: BigInt(1),
        notificationType: 'TEST_ASSIGNED',
        emailEnabled: false,
        inAppEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const service = new NotificationService();
      const result = await service.sendNotification({
        type: 'TEST_ASSIGNED',
        userId: '1',
        variables: {},
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
      expect(result.inAppSent).toBe(true);
    });
  });

  describe('sendEmail', () => {
    it('should queue email when SMTP is disabled', async () => {
      mockGetSmtpSettingsWithPassword.mockResolvedValueOnce({
        ...mockSmtpSettings,
        isEnabled: false,
      });
      mockPrisma.emailQueue.create.mockResolvedValueOnce({
        id: BigInt(1),
        templateId: null,
        toEmail: 'test@example.com',
        toName: null,
        subject: 'Test Subject',
        body: '<p>Test Body</p>',
        variables: null,
        status: 'PENDING',
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        errorMessage: null,
        scheduledAt: null,
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const service = new NotificationService();
      const result = await service.sendEmail({
        toEmail: 'test@example.com',
        subject: 'Test Subject',
        body: '<p>Test Body</p>',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('キュー');
    });
  });

  describe('sendBatchEmail', () => {
    it('should queue batch emails', async () => {
      mockGetSmtpSettingsWithPassword.mockResolvedValue({
        ...mockSmtpSettings,
        isEnabled: false,
      });
      mockPrisma.emailQueue.create
        .mockResolvedValueOnce({
          id: BigInt(1),
          templateId: null,
          toEmail: 'user1@example.com',
          toName: 'User 1',
          subject: 'Test Subject',
          body: '<p>Test Body</p>',
          variables: null,
          status: 'PENDING',
          priority: 0,
          attempts: 0,
          maxAttempts: 3,
          errorMessage: null,
          scheduledAt: null,
          sentAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: BigInt(2),
          templateId: null,
          toEmail: 'user2@example.com',
          toName: 'User 2',
          subject: 'Test Subject',
          body: '<p>Test Body</p>',
          variables: null,
          status: 'PENDING',
          priority: 0,
          attempts: 0,
          maxAttempts: 3,
          errorMessage: null,
          scheduledAt: null,
          sentAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const service = new NotificationService();
      const result = await service.sendBatchEmail({
        recipients: [
          { toEmail: 'user1@example.com', toName: 'User 1' },
          { toEmail: 'user2@example.com', toName: 'User 2' },
        ],
        subject: 'Test Subject',
        body: '<p>Test Body</p>',
      });

      expect(result.success).toBe(true);
      expect(result.queued).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.queueIds).toHaveLength(2);
    });
  });

  describe('getNotificationService', () => {
    it('should return singleton instance', () => {
      const service1 = getNotificationService();
      const service2 = getNotificationService();

      expect(service1).toBe(service2);
    });
  });

  describe('resetNotificationService', () => {
    it('should reset singleton instance', () => {
      const service1 = getNotificationService();
      resetNotificationService();
      const service2 = getNotificationService();

      expect(service1).not.toBe(service2);
    });
  });
});
