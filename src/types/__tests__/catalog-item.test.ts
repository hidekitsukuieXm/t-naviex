import { describe, it, expect } from 'vitest';
import {
  validateCatalogItemName,
  validateCatalogItemDescription,
  validateCatalogItemContent,
  validateCatalogItemType,
  validateCatalogItemStatus,
  validateCatalogItemCategory,
  validateCatalogItemVersion,
  validateCatalogItemSortOrder,
  validateCreateCatalogItemInput,
  validateUpdateCatalogItemInput,
  CATALOG_ITEM_TYPES,
  CATALOG_ITEM_STATUSES,
  CATALOG_ITEM_TYPE_INFO,
  CATALOG_ITEM_STATUS_INFO,
} from '../catalog-item';

describe('catalog-item', () => {
  describe('validateCatalogItemName', () => {
    it('should return valid for normal name', () => {
      const result = validateCatalogItemName('Test Catalog Item');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for empty name', () => {
      const result = validateCatalogItemName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('カタログアイテム名は必須です。');
    });

    it('should return invalid for whitespace only name', () => {
      const result = validateCatalogItemName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('カタログアイテム名は必須です。');
    });

    it('should return invalid for name exceeding 255 characters', () => {
      const longName = 'a'.repeat(256);
      const result = validateCatalogItemName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('カタログアイテム名は255文字以内で入力してください。');
    });

    it('should return valid for name at exactly 255 characters', () => {
      const maxName = 'a'.repeat(255);
      const result = validateCatalogItemName(maxName);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateCatalogItemDescription', () => {
    it('should return valid for null description', () => {
      const result = validateCatalogItemDescription(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined description', () => {
      const result = validateCatalogItemDescription(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for normal description', () => {
      const result = validateCatalogItemDescription('This is a test description');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for description exceeding 10000 characters', () => {
      const longDescription = 'a'.repeat(10001);
      const result = validateCatalogItemDescription(longDescription);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('カタログアイテムの説明は10000文字以内で入力してください。');
    });
  });

  describe('validateCatalogItemContent', () => {
    it('should return valid for normal content', () => {
      const result = validateCatalogItemContent('Test content');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for empty content', () => {
      const result = validateCatalogItemContent('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('カタログアイテムの内容は必須です。');
    });

    it('should return invalid for whitespace only content', () => {
      const result = validateCatalogItemContent('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('カタログアイテムの内容は必須です。');
    });

    it('should return invalid for content exceeding 100000 characters', () => {
      const longContent = 'a'.repeat(100001);
      const result = validateCatalogItemContent(longContent);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('カタログアイテムの内容は100000文字以内で入力してください。');
    });
  });

  describe('validateCatalogItemType', () => {
    it('should return valid for all valid types', () => {
      CATALOG_ITEM_TYPES.forEach((type) => {
        const result = validateCatalogItemType(type);
        expect(result.valid).toBe(true);
      });
    });

    it('should return invalid for invalid type', () => {
      const result = validateCatalogItemType('INVALID_TYPE');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('無効なカタログアイテムタイプです。');
    });
  });

  describe('validateCatalogItemStatus', () => {
    it('should return valid for all valid statuses', () => {
      CATALOG_ITEM_STATUSES.forEach((status) => {
        const result = validateCatalogItemStatus(status);
        expect(result.valid).toBe(true);
      });
    });

    it('should return invalid for invalid status', () => {
      const result = validateCatalogItemStatus('INVALID_STATUS');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('無効なカタログアイテムステータスです。');
    });
  });

  describe('validateCatalogItemCategory', () => {
    it('should return valid for null category', () => {
      const result = validateCatalogItemCategory(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined category', () => {
      const result = validateCatalogItemCategory(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for normal category', () => {
      const result = validateCatalogItemCategory('Test Category');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for category exceeding 100 characters', () => {
      const longCategory = 'a'.repeat(101);
      const result = validateCatalogItemCategory(longCategory);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('カテゴリは100文字以内で入力してください。');
    });
  });

  describe('validateCatalogItemVersion', () => {
    it('should return valid for undefined version', () => {
      const result = validateCatalogItemVersion(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for semantic version', () => {
      const result = validateCatalogItemVersion('1.0.0');
      expect(result.valid).toBe(true);
    });

    it('should return valid for version with prerelease', () => {
      const result = validateCatalogItemVersion('1.0.0-beta.1');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for version exceeding 20 characters', () => {
      const longVersion = 'a'.repeat(21);
      const result = validateCatalogItemVersion(longVersion);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('バージョンは20文字以内で入力してください。');
    });

    it('should return invalid for version with invalid characters', () => {
      const result = validateCatalogItemVersion('1.0.0 beta');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('バージョン形式が無効です。');
    });
  });

  describe('validateCatalogItemSortOrder', () => {
    it('should return valid for undefined sortOrder', () => {
      const result = validateCatalogItemSortOrder(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for 0', () => {
      const result = validateCatalogItemSortOrder(0);
      expect(result.valid).toBe(true);
    });

    it('should return valid for positive integer', () => {
      const result = validateCatalogItemSortOrder(100);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for negative number', () => {
      const result = validateCatalogItemSortOrder(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は0以上の値を指定してください。');
    });

    it('should return invalid for non-integer', () => {
      const result = validateCatalogItemSortOrder(1.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は整数で指定してください。');
    });

    it('should return invalid for sortOrder exceeding 99999', () => {
      const result = validateCatalogItemSortOrder(100000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は99999以下の値を指定してください。');
    });
  });

  describe('validateCreateCatalogItemInput', () => {
    it('should return valid for valid input', () => {
      const input = {
        name: 'Test Item',
        type: 'TEST_CASE' as const,
        content: 'Test content',
      };
      const result = validateCreateCatalogItemInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for input with all fields', () => {
      const input = {
        name: 'Test Item',
        description: 'Test description',
        type: 'TEST_CASE' as const,
        status: 'ACTIVE' as const,
        category: 'Test Category',
        content: 'Test content',
        version: '1.0.0',
        sortOrder: 10,
      };
      const result = validateCreateCatalogItemInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for empty name', () => {
      const input = {
        name: '',
        type: 'TEST_CASE' as const,
        content: 'Test content',
      };
      const result = validateCreateCatalogItemInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('カタログアイテム名は必須です。');
    });

    it('should return invalid for invalid type', () => {
      const input = {
        name: 'Test Item',
        type: 'INVALID' as 'TEST_CASE',
        content: 'Test content',
      };
      const result = validateCreateCatalogItemInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('無効なカタログアイテムタイプです。');
    });

    it('should return invalid for empty content', () => {
      const input = {
        name: 'Test Item',
        type: 'TEST_CASE' as const,
        content: '',
      };
      const result = validateCreateCatalogItemInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('カタログアイテムの内容は必須です。');
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const input = {
        name: '',
        type: 'INVALID' as 'TEST_CASE',
        content: '',
      };
      const result = validateCreateCatalogItemInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateUpdateCatalogItemInput', () => {
    it('should return valid for empty input', () => {
      const input = {};
      const result = validateUpdateCatalogItemInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for valid partial input', () => {
      const input = {
        name: 'Updated Name',
        status: 'ACTIVE' as const,
      };
      const result = validateUpdateCatalogItemInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for invalid name when provided', () => {
      const input = {
        name: '',
      };
      const result = validateUpdateCatalogItemInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('カタログアイテム名は必須です。');
    });

    it('should return invalid for invalid type when provided', () => {
      const input = {
        type: 'INVALID' as 'TEST_CASE',
      };
      const result = validateUpdateCatalogItemInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('無効なカタログアイテムタイプです。');
    });
  });

  describe('constants', () => {
    it('should have all types defined in CATALOG_ITEM_TYPE_INFO', () => {
      CATALOG_ITEM_TYPES.forEach((type) => {
        expect(CATALOG_ITEM_TYPE_INFO[type]).toBeDefined();
        expect(CATALOG_ITEM_TYPE_INFO[type].label).toBeDefined();
        expect(CATALOG_ITEM_TYPE_INFO[type].description).toBeDefined();
      });
    });

    it('should have all statuses defined in CATALOG_ITEM_STATUS_INFO', () => {
      CATALOG_ITEM_STATUSES.forEach((status) => {
        expect(CATALOG_ITEM_STATUS_INFO[status]).toBeDefined();
        expect(CATALOG_ITEM_STATUS_INFO[status].label).toBeDefined();
        expect(CATALOG_ITEM_STATUS_INFO[status].color).toBeDefined();
      });
    });

    it('should have correct number of types', () => {
      expect(CATALOG_ITEM_TYPES).toHaveLength(8);
    });

    it('should have correct number of statuses', () => {
      expect(CATALOG_ITEM_STATUSES).toHaveLength(4);
    });
  });
});
