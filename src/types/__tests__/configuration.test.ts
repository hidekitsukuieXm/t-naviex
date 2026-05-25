import { describe, it, expect } from 'vitest';
import {
  validateConfigurationName,
  validateConfigurationDescription,
  validateConfigParams,
  validateCreateConfigurationInput,
  validateUpdateConfigurationInput,
  CONFIGURATION_NAME_MAX_LENGTH,
  CONFIGURATION_DESCRIPTION_MAX_LENGTH,
} from '../configuration';

describe('configuration types', () => {
  describe('validateConfigurationName', () => {
    it('should accept valid name', () => {
      const result = validateConfigurationName('Windows 11 + Chrome');
      expect(result.valid).toBe(true);
    });

    it('should reject empty name', () => {
      const result = validateConfigurationName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('必須');
    });

    it('should reject whitespace only name', () => {
      const result = validateConfigurationName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('空白のみ');
    });

    it('should reject name exceeding max length', () => {
      const longName = 'a'.repeat(CONFIGURATION_NAME_MAX_LENGTH + 1);
      const result = validateConfigurationName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${CONFIGURATION_NAME_MAX_LENGTH}文字以内`);
    });

    it('should accept name at max length', () => {
      const maxName = 'a'.repeat(CONFIGURATION_NAME_MAX_LENGTH);
      const result = validateConfigurationName(maxName);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateConfigurationDescription', () => {
    it('should accept valid description', () => {
      const result = validateConfigurationDescription('Windows 11 Pro with Chrome 120');
      expect(result.valid).toBe(true);
    });

    it('should accept null description', () => {
      const result = validateConfigurationDescription(null);
      expect(result.valid).toBe(true);
    });

    it('should accept empty description', () => {
      const result = validateConfigurationDescription('');
      expect(result.valid).toBe(true);
    });

    it('should reject description exceeding max length', () => {
      const longDesc = 'a'.repeat(CONFIGURATION_DESCRIPTION_MAX_LENGTH + 1);
      const result = validateConfigurationDescription(longDesc);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${CONFIGURATION_DESCRIPTION_MAX_LENGTH}文字以内`);
    });
  });

  describe('validateConfigParams', () => {
    it('should accept valid config params', () => {
      const result = validateConfigParams({
        os: 'Windows',
        osVersion: '11',
        browser: 'Chrome',
        browserVersion: '120',
      });
      expect(result.valid).toBe(true);
    });

    it('should accept empty config params', () => {
      const result = validateConfigParams({});
      expect(result.valid).toBe(true);
    });

    it('should accept config params with custom fields', () => {
      const result = validateConfigParams({
        os: 'Windows',
        custom: {
          network: 'LAN',
          proxy: 'none',
        },
      });
      expect(result.valid).toBe(true);
    });

    it('should accept config params with device settings', () => {
      const result = validateConfigParams({
        device: 'iPhone 15',
        deviceType: 'mobile',
        resolution: '1170x2532',
      });
      expect(result.valid).toBe(true);
    });

    it('should accept config params with locale settings', () => {
      const result = validateConfigParams({
        locale: 'ja-JP',
        timezone: 'Asia/Tokyo',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateCreateConfigurationInput', () => {
    it('should accept valid input', () => {
      const result = validateCreateConfigurationInput({
        projectId: '1',
        name: 'Windows 11 + Chrome',
        description: 'Test environment',
        configParams: {
          os: 'Windows',
          osVersion: '11',
          browser: 'Chrome',
        },
      });
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should accept minimal input', () => {
      const result = validateCreateConfigurationInput({
        projectId: '1',
        name: 'Default Config',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject missing projectId', () => {
      const result = validateCreateConfigurationInput({
        name: 'Test Config',
      });
      expect(result.valid).toBe(false);
      expect(result.errors?.projectId).toBeDefined();
    });

    it('should reject missing name', () => {
      const result = validateCreateConfigurationInput({
        projectId: '1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors?.name).toBeDefined();
    });

    it('should accept input with sortOrder', () => {
      const result = validateCreateConfigurationInput({
        projectId: '1',
        name: 'Test Config',
        sortOrder: 5,
      });
      expect(result.valid).toBe(true);
      expect(result.data?.sortOrder).toBe(5);
    });

    it('should accept input with isActive flag', () => {
      const result = validateCreateConfigurationInput({
        projectId: '1',
        name: 'Test Config',
        isActive: false,
      });
      expect(result.valid).toBe(true);
      expect(result.data?.isActive).toBe(false);
    });
  });

  describe('validateUpdateConfigurationInput', () => {
    it('should accept valid input', () => {
      const result = validateUpdateConfigurationInput({
        name: 'Updated Config',
        description: 'Updated description',
      });
      expect(result.valid).toBe(true);
    });

    it('should accept empty input', () => {
      const result = validateUpdateConfigurationInput({});
      expect(result.valid).toBe(true);
    });

    it('should accept configParams update', () => {
      const result = validateUpdateConfigurationInput({
        configParams: {
          os: 'macOS',
          osVersion: '14',
          browser: 'Safari',
        },
      });
      expect(result.valid).toBe(true);
    });

    it('should accept sortOrder update', () => {
      const result = validateUpdateConfigurationInput({
        sortOrder: 10,
      });
      expect(result.valid).toBe(true);
    });

    it('should accept isActive update', () => {
      const result = validateUpdateConfigurationInput({
        isActive: false,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid name', () => {
      const result = validateUpdateConfigurationInput({
        name: '',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject negative sortOrder', () => {
      const result = validateUpdateConfigurationInput({
        sortOrder: -1,
      });
      expect(result.valid).toBe(false);
    });
  });
});
