import { describe, it, expect } from 'vitest';
import {
  validateTestSectionName,
  validateSortOrder,
  validateCreateTestSectionInput,
  validateUpdateTestSectionInput,
  validateBulkSortOrderUpdate,
  buildSectionTree,
  flattenSectionTree,
  getSectionDepth,
  getDescendantIds,
  getAncestorIds,
  hasCircularReference,
  getNextSortOrder,
  recalculateSortOrders,
  type TestSection,
} from '../test-section';

describe('Test Section Types', () => {
  // テスト用のセクションデータ
  const mockSections: TestSection[] = [
    {
      id: '1',
      testSpecId: '100',
      parentId: null,
      name: 'Section 1',
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      testSpecId: '100',
      parentId: null,
      name: 'Section 2',
      sortOrder: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      testSpecId: '100',
      parentId: '1',
      name: 'Section 1-1',
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '4',
      testSpecId: '100',
      parentId: '1',
      name: 'Section 1-2',
      sortOrder: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '5',
      testSpecId: '100',
      parentId: '3',
      name: 'Section 1-1-1',
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  describe('validateTestSectionName', () => {
    it('should return valid for non-empty name', () => {
      const result = validateTestSectionName('テストセクション');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for empty name', () => {
      const result = validateTestSectionName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('セクション名は必須です。');
    });

    it('should return invalid for whitespace-only name', () => {
      const result = validateTestSectionName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('セクション名は必須です。');
    });

    it('should return invalid for name exceeding 255 characters', () => {
      const longName = 'a'.repeat(256);
      const result = validateTestSectionName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('セクション名は255文字以内で入力してください。');
    });

    it('should return valid for name at max length', () => {
      const maxName = 'a'.repeat(255);
      const result = validateTestSectionName(maxName);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateSortOrder', () => {
    it('should return valid for valid sort order', () => {
      expect(validateSortOrder(0).valid).toBe(true);
      expect(validateSortOrder(100).valid).toBe(true);
      expect(validateSortOrder(999999).valid).toBe(true);
    });

    it('should return invalid for non-integer', () => {
      const result = validateSortOrder(1.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は整数で指定してください。');
    });

    it('should return invalid for negative number', () => {
      const result = validateSortOrder(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は0以上の値を指定してください。');
    });

    it('should return invalid for too large number', () => {
      const result = validateSortOrder(1000000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は999999以下の値を指定してください。');
    });
  });

  describe('validateCreateTestSectionInput', () => {
    it('should return valid for valid input', () => {
      const result = validateCreateTestSectionInput({
        testSpecId: '1',
        name: 'テストセクション',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing testSpecId', () => {
      const result = validateCreateTestSectionInput({
        testSpecId: '',
        name: 'テストセクション',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('テスト仕様書IDは必須です。');
    });

    it('should return errors for missing name', () => {
      const result = validateCreateTestSectionInput({
        testSpecId: '1',
        name: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('セクション名は必須です。');
    });

    it('should return errors for invalid sort order', () => {
      const result = validateCreateTestSectionInput({
        testSpecId: '1',
        name: 'テストセクション',
        sortOrder: -1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('並び順は0以上の値を指定してください。');
    });

    it('should accumulate multiple errors', () => {
      const result = validateCreateTestSectionInput({
        testSpecId: '',
        name: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateUpdateTestSectionInput', () => {
    it('should return valid for valid input', () => {
      const result = validateUpdateTestSectionInput({
        name: 'Updated Name',
        sortOrder: 5,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for empty input', () => {
      const result = validateUpdateTestSectionInput({});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid name', () => {
      const result = validateUpdateTestSectionInput({
        name: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('セクション名は必須です。');
    });

    it('should return errors for invalid sort order', () => {
      const result = validateUpdateTestSectionInput({
        sortOrder: -1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('並び順は0以上の値を指定してください。');
    });
  });

  describe('validateBulkSortOrderUpdate', () => {
    it('should return valid for valid items', () => {
      const result = validateBulkSortOrderUpdate([
        { id: '1', sortOrder: 0 },
        { id: '2', sortOrder: 1 },
      ]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for non-array input', () => {
      // @ts-expect-error Testing invalid input
      const result = validateBulkSortOrderUpdate('not an array');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('並び順更新データは配列で指定してください。');
    });

    it('should return invalid for empty array', () => {
      const result = validateBulkSortOrderUpdate([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('並び順更新データが空です。');
    });

    it('should return invalid for duplicate IDs', () => {
      const result = validateBulkSortOrderUpdate([
        { id: '1', sortOrder: 0 },
        { id: '1', sortOrder: 1 },
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('重複したIDが含まれています。');
    });

    it('should return errors for invalid items', () => {
      const result = validateBulkSortOrderUpdate([
        { id: '', sortOrder: 0 },
        { id: '2', sortOrder: -1 },
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('buildSectionTree', () => {
    it('should build tree from flat sections', () => {
      const tree = buildSectionTree(mockSections);
      expect(tree).toHaveLength(2); // 2 root sections
      expect(tree[0].id).toBe('1');
      expect(tree[0].children).toHaveLength(2); // Section 1-1 and Section 1-2
      expect(tree[0].children[0].id).toBe('3');
      expect(tree[0].children[0].children).toHaveLength(1); // Section 1-1-1
      expect(tree[1].id).toBe('2');
      expect(tree[1].children).toHaveLength(0);
    });

    it('should sort by sort order', () => {
      const tree = buildSectionTree(mockSections);
      expect(tree[0].sortOrder).toBeLessThan(tree[1].sortOrder);
      expect(tree[0].children[0].sortOrder).toBeLessThan(tree[0].children[1].sortOrder);
    });

    it('should handle empty array', () => {
      const tree = buildSectionTree([]);
      expect(tree).toHaveLength(0);
    });

    it('should handle orphan sections (parent not found)', () => {
      const orphanSection: TestSection = {
        id: '10',
        testSpecId: '100',
        parentId: '999', // non-existent parent
        name: 'Orphan',
        sortOrder: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      const tree = buildSectionTree([orphanSection]);
      expect(tree).toHaveLength(1); // Should be added to root
      expect(tree[0].id).toBe('10');
    });
  });

  describe('flattenSectionTree', () => {
    it('should flatten tree to list', () => {
      const tree = buildSectionTree(mockSections);
      const flattened = flattenSectionTree(tree);
      expect(flattened).toHaveLength(5);
    });

    it('should handle empty tree', () => {
      const flattened = flattenSectionTree([]);
      expect(flattened).toHaveLength(0);
    });
  });

  describe('getSectionDepth', () => {
    it('should return 0 for root section', () => {
      const depth = getSectionDepth('1', mockSections);
      expect(depth).toBe(0);
    });

    it('should return 1 for first level child', () => {
      const depth = getSectionDepth('3', mockSections);
      expect(depth).toBe(1);
    });

    it('should return 2 for second level child', () => {
      const depth = getSectionDepth('5', mockSections);
      expect(depth).toBe(2);
    });

    it('should return 0 for non-existent section', () => {
      const depth = getSectionDepth('999', mockSections);
      expect(depth).toBe(0);
    });
  });

  describe('getDescendantIds', () => {
    it('should return all descendant IDs', () => {
      const descendants = getDescendantIds('1', mockSections);
      expect(descendants).toHaveLength(3); // 3, 4, 5
      expect(descendants).toContain('3');
      expect(descendants).toContain('4');
      expect(descendants).toContain('5');
    });

    it('should return direct children only for leaf section', () => {
      const descendants = getDescendantIds('5', mockSections);
      expect(descendants).toHaveLength(0);
    });

    it('should return empty for non-existent section', () => {
      const descendants = getDescendantIds('999', mockSections);
      expect(descendants).toHaveLength(0);
    });
  });

  describe('getAncestorIds', () => {
    it('should return empty for root section', () => {
      const ancestors = getAncestorIds('1', mockSections);
      expect(ancestors).toHaveLength(0);
    });

    it('should return parent for first level child', () => {
      const ancestors = getAncestorIds('3', mockSections);
      expect(ancestors).toHaveLength(1);
      expect(ancestors[0]).toBe('1');
    });

    it('should return all ancestors in order', () => {
      const ancestors = getAncestorIds('5', mockSections);
      expect(ancestors).toHaveLength(2);
      expect(ancestors[0]).toBe('1');
      expect(ancestors[1]).toBe('3');
    });

    it('should return empty for non-existent section', () => {
      const ancestors = getAncestorIds('999', mockSections);
      expect(ancestors).toHaveLength(0);
    });
  });

  describe('hasCircularReference', () => {
    it('should return false when moving to null parent', () => {
      const result = hasCircularReference('3', null, mockSections);
      expect(result).toBe(false);
    });

    it('should return true when moving to self', () => {
      const result = hasCircularReference('1', '1', mockSections);
      expect(result).toBe(true);
    });

    it('should return true when moving to descendant', () => {
      const result = hasCircularReference('1', '3', mockSections);
      expect(result).toBe(true);
    });

    it('should return true when moving to deep descendant', () => {
      const result = hasCircularReference('1', '5', mockSections);
      expect(result).toBe(true);
    });

    it('should return false when moving to sibling', () => {
      const result = hasCircularReference('3', '4', mockSections);
      expect(result).toBe(false);
    });

    it('should return false when moving to valid parent', () => {
      const result = hasCircularReference('4', '2', mockSections);
      expect(result).toBe(false);
    });
  });

  describe('getNextSortOrder', () => {
    it('should return 0 for empty parent', () => {
      const next = getNextSortOrder([], null);
      expect(next).toBe(0);
    });

    it('should return max + 1 for root level', () => {
      const next = getNextSortOrder(mockSections, null);
      expect(next).toBe(2); // max is 1
    });

    it('should return max + 1 for specific parent', () => {
      const next = getNextSortOrder(mockSections, '1');
      expect(next).toBe(2); // Section 1-1 (0) and Section 1-2 (1)
    });

    it('should return 0 for parent with no children', () => {
      const next = getNextSortOrder(mockSections, '2');
      expect(next).toBe(0);
    });
  });

  describe('recalculateSortOrders', () => {
    it('should recalculate sort orders as consecutive numbers', () => {
      const sectionsWithGaps: TestSection[] = [
        { ...mockSections[0], sortOrder: 5 },
        { ...mockSections[1], sortOrder: 10 },
      ];
      const result = recalculateSortOrders(sectionsWithGaps, null);
      expect(result).toHaveLength(2);
      expect(result[0].sortOrder).toBe(0);
      expect(result[1].sortOrder).toBe(1);
    });

    it('should return empty for parent with no children', () => {
      const result = recalculateSortOrders(mockSections, '2');
      expect(result).toHaveLength(0);
    });

    it('should recalculate for specific parent', () => {
      const result = recalculateSortOrders(mockSections, '1');
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toContain('3');
      expect(result.map((r) => r.id)).toContain('4');
    });
  });
});
