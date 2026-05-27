/**
 * Knowledge Graph Types Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  isValidNodeType,
  isValidCategory,
  isValidRelationshipType,
  getCategoryForNodeType,
  validateCreateNodeInput,
  validateCreateRelationshipInput,
  KNOWLEDGE_CATEGORY_INFO,
  RELATIONSHIP_TYPE_INFO,
  type KnowledgeNodeType,
  type KnowledgeCategory,
  type RelationshipType,
  type CreateKnowledgeNodeInput,
  type CreateRelationshipInput,
} from '../knowledge-graph';

describe('Knowledge Graph Types', () => {
  // ========================================
  // Node Type Validation Tests
  // ========================================
  describe('isValidNodeType', () => {
    it('should return true for valid node types', () => {
      const validTypes: KnowledgeNodeType[] = [
        'TestCase',
        'TestStep',
        'Bug',
        'BestPractice',
        'TestDesignKnowledge',
        'BugCountermeasure',
        'Feature',
        'Module',
        'Tag',
      ];

      validTypes.forEach((type) => {
        expect(isValidNodeType(type)).toBe(true);
      });
    });

    it('should return false for invalid node types', () => {
      expect(isValidNodeType('InvalidType')).toBe(false);
      expect(isValidNodeType('')).toBe(false);
      expect(isValidNodeType('testcase')).toBe(false); // lowercase
      expect(isValidNodeType('TESTCASE')).toBe(false); // uppercase
    });
  });

  // ========================================
  // Category Validation Tests
  // ========================================
  describe('isValidCategory', () => {
    it('should return true for valid categories', () => {
      const validCategories: KnowledgeCategory[] = [
        'TEST_ASSET',
        'DEFECT',
        'BEST_PRACTICE',
        'DESIGN_KNOWLEDGE',
        'COUNTERMEASURE',
        'SYSTEM_COMPONENT',
      ];

      validCategories.forEach((category) => {
        expect(isValidCategory(category)).toBe(true);
      });
    });

    it('should return false for invalid categories', () => {
      expect(isValidCategory('INVALID_CATEGORY')).toBe(false);
      expect(isValidCategory('')).toBe(false);
      expect(isValidCategory('test_asset')).toBe(false); // lowercase
    });
  });

  // ========================================
  // Relationship Type Validation Tests
  // ========================================
  describe('isValidRelationshipType', () => {
    it('should return true for valid relationship types', () => {
      const validTypes: RelationshipType[] = [
        'HAS_STEP',
        'RELATED_TO',
        'TESTS',
        'FOUND_BY',
        'CAUSED_BY',
        'PREVENTED_BY',
        'APPLIES_TO',
        'TAGGED_WITH',
        'DEPENDS_ON',
        'SIMILAR_TO',
        'REFERENCES',
      ];

      validTypes.forEach((type) => {
        expect(isValidRelationshipType(type)).toBe(true);
      });
    });

    it('should return false for invalid relationship types', () => {
      expect(isValidRelationshipType('INVALID_REL')).toBe(false);
      expect(isValidRelationshipType('')).toBe(false);
      expect(isValidRelationshipType('has_step')).toBe(false); // lowercase
    });
  });

  // ========================================
  // Category for Node Type Tests
  // ========================================
  describe('getCategoryForNodeType', () => {
    it('should return TEST_ASSET for TestCase', () => {
      expect(getCategoryForNodeType('TestCase')).toBe('TEST_ASSET');
    });

    it('should return TEST_ASSET for TestStep', () => {
      expect(getCategoryForNodeType('TestStep')).toBe('TEST_ASSET');
    });

    it('should return DEFECT for Bug', () => {
      expect(getCategoryForNodeType('Bug')).toBe('DEFECT');
    });

    it('should return BEST_PRACTICE for BestPractice', () => {
      expect(getCategoryForNodeType('BestPractice')).toBe('BEST_PRACTICE');
    });

    it('should return DESIGN_KNOWLEDGE for TestDesignKnowledge', () => {
      expect(getCategoryForNodeType('TestDesignKnowledge')).toBe('DESIGN_KNOWLEDGE');
    });

    it('should return COUNTERMEASURE for BugCountermeasure', () => {
      expect(getCategoryForNodeType('BugCountermeasure')).toBe('COUNTERMEASURE');
    });

    it('should return SYSTEM_COMPONENT for Feature', () => {
      expect(getCategoryForNodeType('Feature')).toBe('SYSTEM_COMPONENT');
    });

    it('should return SYSTEM_COMPONENT for Module', () => {
      expect(getCategoryForNodeType('Module')).toBe('SYSTEM_COMPONENT');
    });

    it('should return SYSTEM_COMPONENT for Tag', () => {
      expect(getCategoryForNodeType('Tag')).toBe('SYSTEM_COMPONENT');
    });
  });

  // ========================================
  // Create Node Input Validation Tests
  // ========================================
  describe('validateCreateNodeInput', () => {
    const validInput: CreateKnowledgeNodeInput = {
      type: 'TestCase',
      category: 'TEST_ASSET',
      sourceId: 'test-123',
      title: 'テストケース1',
    };

    it('should validate a correct input', () => {
      const result = validateCreateNodeInput(validInput);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with invalid node type', () => {
      const input = { ...validInput, type: 'InvalidType' as KnowledgeNodeType };
      const result = validateCreateNodeInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('有効なノードタイプを指定してください');
    });

    it('should fail with invalid category', () => {
      const input = { ...validInput, category: 'INVALID' as KnowledgeCategory };
      const result = validateCreateNodeInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('有効なカテゴリを指定してください');
    });

    it('should fail with empty sourceId', () => {
      const input = { ...validInput, sourceId: '' };
      const result = validateCreateNodeInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ソースIDは必須です');
    });

    it('should fail with whitespace-only sourceId', () => {
      const input = { ...validInput, sourceId: '   ' };
      const result = validateCreateNodeInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ソースIDは必須です');
    });

    it('should fail with empty title', () => {
      const input = { ...validInput, title: '' };
      const result = validateCreateNodeInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('タイトルは必須です');
    });

    it('should fail with whitespace-only title', () => {
      const input = { ...validInput, title: '   ' };
      const result = validateCreateNodeInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('タイトルは必須です');
    });

    it('should fail with title exceeding 500 characters', () => {
      const input = { ...validInput, title: 'a'.repeat(501) };
      const result = validateCreateNodeInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('タイトルは500文字以内で入力してください');
    });

    it('should pass with title of exactly 500 characters', () => {
      const input = { ...validInput, title: 'a'.repeat(500) };
      const result = validateCreateNodeInput(input);
      expect(result.valid).toBe(true);
    });

    it('should collect multiple errors', () => {
      const input: CreateKnowledgeNodeInput = {
        type: 'Invalid' as KnowledgeNodeType,
        category: 'Invalid' as KnowledgeCategory,
        sourceId: '',
        title: '',
      };
      const result = validateCreateNodeInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should allow optional fields', () => {
      const input: CreateKnowledgeNodeInput = {
        type: 'TestCase',
        category: 'TEST_ASSET',
        sourceId: 'test-123',
        title: 'テストケース1',
        content: 'コンテンツ',
        description: '説明',
        metadata: { key: 'value' },
      };
      const result = validateCreateNodeInput(input);
      expect(result.valid).toBe(true);
    });
  });

  // ========================================
  // Create Relationship Input Validation Tests
  // ========================================
  describe('validateCreateRelationshipInput', () => {
    const validInput: CreateRelationshipInput = {
      type: 'RELATED_TO',
      startNodeId: 1,
      endNodeId: 2,
    };

    it('should validate a correct input', () => {
      const result = validateCreateRelationshipInput(validInput);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with invalid relationship type', () => {
      const input = { ...validInput, type: 'INVALID_TYPE' as RelationshipType };
      const result = validateCreateRelationshipInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('有効なリレーションシップタイプを指定してください');
    });

    it('should fail when startNodeId equals endNodeId', () => {
      const input = { ...validInput, startNodeId: 1, endNodeId: 1 };
      const result = validateCreateRelationshipInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('開始ノードと終了ノードは異なる必要があります');
    });

    it('should fail with negative weight', () => {
      const input = { ...validInput, weight: -0.5 };
      const result = validateCreateRelationshipInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('重みは0から1の範囲で指定してください');
    });

    it('should fail with weight greater than 1', () => {
      const input = { ...validInput, weight: 1.5 };
      const result = validateCreateRelationshipInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('重みは0から1の範囲で指定してください');
    });

    it('should pass with weight of 0', () => {
      const input = { ...validInput, weight: 0 };
      const result = validateCreateRelationshipInput(input);
      expect(result.valid).toBe(true);
    });

    it('should pass with weight of 1', () => {
      const input = { ...validInput, weight: 1 };
      const result = validateCreateRelationshipInput(input);
      expect(result.valid).toBe(true);
    });

    it('should pass with weight of 0.5', () => {
      const input = { ...validInput, weight: 0.5 };
      const result = validateCreateRelationshipInput(input);
      expect(result.valid).toBe(true);
    });

    it('should allow optional properties', () => {
      const input: CreateRelationshipInput = {
        type: 'RELATED_TO',
        startNodeId: 1,
        endNodeId: 2,
        properties: { description: 'test relation' },
        weight: 0.8,
      };
      const result = validateCreateRelationshipInput(input);
      expect(result.valid).toBe(true);
    });

    it('should collect multiple errors', () => {
      const input: CreateRelationshipInput = {
        type: 'INVALID' as RelationshipType,
        startNodeId: 1,
        endNodeId: 1,
        weight: 2,
      };
      const result = validateCreateRelationshipInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ========================================
  // Constants Tests
  // ========================================
  describe('KNOWLEDGE_CATEGORY_INFO', () => {
    it('should have info for all categories', () => {
      const categories: KnowledgeCategory[] = [
        'TEST_ASSET',
        'DEFECT',
        'BEST_PRACTICE',
        'DESIGN_KNOWLEDGE',
        'COUNTERMEASURE',
        'SYSTEM_COMPONENT',
      ];

      categories.forEach((category) => {
        expect(KNOWLEDGE_CATEGORY_INFO[category]).toBeDefined();
        expect(KNOWLEDGE_CATEGORY_INFO[category].label).toBeDefined();
        expect(KNOWLEDGE_CATEGORY_INFO[category].description).toBeDefined();
      });
    });

    it('should have non-empty labels and descriptions', () => {
      Object.values(KNOWLEDGE_CATEGORY_INFO).forEach((info) => {
        expect(info.label.length).toBeGreaterThan(0);
        expect(info.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('RELATIONSHIP_TYPE_INFO', () => {
    it('should have info for all relationship types', () => {
      const types: RelationshipType[] = [
        'HAS_STEP',
        'RELATED_TO',
        'TESTS',
        'FOUND_BY',
        'CAUSED_BY',
        'PREVENTED_BY',
        'APPLIES_TO',
        'TAGGED_WITH',
        'DEPENDS_ON',
        'SIMILAR_TO',
        'REFERENCES',
      ];

      types.forEach((type) => {
        expect(RELATIONSHIP_TYPE_INFO[type]).toBeDefined();
        expect(RELATIONSHIP_TYPE_INFO[type].label).toBeDefined();
        expect(RELATIONSHIP_TYPE_INFO[type].description).toBeDefined();
      });
    });

    it('should have non-empty labels and descriptions', () => {
      Object.values(RELATIONSHIP_TYPE_INFO).forEach((info) => {
        expect(info.label.length).toBeGreaterThan(0);
        expect(info.description.length).toBeGreaterThan(0);
      });
    });

    it('should have inverse defined for directional relationships', () => {
      const directionalTypes: RelationshipType[] = [
        'HAS_STEP',
        'TESTS',
        'FOUND_BY',
        'CAUSED_BY',
        'PREVENTED_BY',
        'APPLIES_TO',
        'TAGGED_WITH',
        'DEPENDS_ON',
        'REFERENCES',
      ];

      directionalTypes.forEach((type) => {
        expect(RELATIONSHIP_TYPE_INFO[type].inverse).toBeDefined();
      });
    });

    it('should not have inverse for bidirectional relationships', () => {
      expect(RELATIONSHIP_TYPE_INFO['RELATED_TO'].inverse).toBeUndefined();
      expect(RELATIONSHIP_TYPE_INFO['SIMILAR_TO'].inverse).toBeUndefined();
    });
  });

  // ========================================
  // Edge Cases Tests
  // ========================================
  describe('Edge Cases', () => {
    describe('Unicode handling', () => {
      it('should handle Japanese characters in title', () => {
        const input: CreateKnowledgeNodeInput = {
          type: 'TestCase',
          category: 'TEST_ASSET',
          sourceId: 'test-日本語',
          title: 'テストケース名：日本語対応テスト',
        };
        const result = validateCreateNodeInput(input);
        expect(result.valid).toBe(true);
      });

      it('should handle emoji in title', () => {
        const input: CreateKnowledgeNodeInput = {
          type: 'TestCase',
          category: 'TEST_ASSET',
          sourceId: 'test-emoji',
          title: 'テスト ✅ 完了',
        };
        const result = validateCreateNodeInput(input);
        expect(result.valid).toBe(true);
      });
    });

    describe('Boundary values', () => {
      it('should handle minimum valid input', () => {
        const input: CreateKnowledgeNodeInput = {
          type: 'Tag',
          category: 'SYSTEM_COMPONENT',
          sourceId: 'a',
          title: 'T',
        };
        const result = validateCreateNodeInput(input);
        expect(result.valid).toBe(true);
      });

      it('should handle node IDs of 0', () => {
        const input: CreateRelationshipInput = {
          type: 'RELATED_TO',
          startNodeId: 0,
          endNodeId: 1,
        };
        const result = validateCreateRelationshipInput(input);
        // 0 is falsy but still a valid number in Neo4j
        expect(result.valid).toBe(false);
      });
    });
  });
});
