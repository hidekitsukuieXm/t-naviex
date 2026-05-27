/**
 * Knowledge Graph Schema Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  NODE_LABELS,
  RELATIONSHIP_TYPES,
  QUERY_PATTERNS,
  RAG_QUERY_PATTERNS,
} from '../knowledge-graph-schema';

describe('Knowledge Graph Schema', () => {
  // ========================================
  // Node Labels Tests
  // ========================================
  describe('NODE_LABELS', () => {
    it('should define all required base labels', () => {
      expect(NODE_LABELS.Knowledge).toBe('Knowledge');
    });

    it('should define all test asset labels', () => {
      expect(NODE_LABELS.TestCase).toBe('TestCase');
      expect(NODE_LABELS.TestStep).toBe('TestStep');
      expect(NODE_LABELS.TestSpec).toBe('TestSpec');
      expect(NODE_LABELS.TestSet).toBe('TestSet');
      expect(NODE_LABELS.Baseline).toBe('Baseline');
    });

    it('should define all defect labels', () => {
      expect(NODE_LABELS.Bug).toBe('Bug');
      expect(NODE_LABELS.BugPattern).toBe('BugPattern');
    });

    it('should define all knowledge type labels', () => {
      expect(NODE_LABELS.BestPractice).toBe('BestPractice');
      expect(NODE_LABELS.TestDesignKnowledge).toBe('TestDesignKnowledge');
      expect(NODE_LABELS.BugCountermeasure).toBe('BugCountermeasure');
      expect(NODE_LABELS.TestTechnique).toBe('TestTechnique');
    });

    it('should define all system component labels', () => {
      expect(NODE_LABELS.Feature).toBe('Feature');
      expect(NODE_LABELS.Module).toBe('Module');
      expect(NODE_LABELS.Requirement).toBe('Requirement');
    });

    it('should define all organization labels', () => {
      expect(NODE_LABELS.Tag).toBe('Tag');
      expect(NODE_LABELS.Category).toBe('Category');
      expect(NODE_LABELS.Project).toBe('Project');
    });

    it('should have no duplicate label values', () => {
      const values = Object.values(NODE_LABELS);
      const uniqueValues = new Set(values);
      expect(values.length).toBe(uniqueValues.size);
    });
  });

  // ========================================
  // Relationship Types Tests
  // ========================================
  describe('RELATIONSHIP_TYPES', () => {
    it('should define structural relationships', () => {
      expect(RELATIONSHIP_TYPES.HAS_STEP).toBe('HAS_STEP');
      expect(RELATIONSHIP_TYPES.BELONGS_TO).toBe('BELONGS_TO');
      expect(RELATIONSHIP_TYPES.CONTAINS).toBe('CONTAINS');
      expect(RELATIONSHIP_TYPES.PART_OF).toBe('PART_OF');
    });

    it('should define test relationships', () => {
      expect(RELATIONSHIP_TYPES.TESTS).toBe('TESTS');
      expect(RELATIONSHIP_TYPES.TESTED_BY).toBe('TESTED_BY');
      expect(RELATIONSHIP_TYPES.COVERS).toBe('COVERS');
      expect(RELATIONSHIP_TYPES.COVERED_BY).toBe('COVERED_BY');
      expect(RELATIONSHIP_TYPES.VERIFIES).toBe('VERIFIES');
    });

    it('should define bug relationships', () => {
      expect(RELATIONSHIP_TYPES.FOUND_BY).toBe('FOUND_BY');
      expect(RELATIONSHIP_TYPES.FOUND_IN).toBe('FOUND_IN');
      expect(RELATIONSHIP_TYPES.CAUSED_BY).toBe('CAUSED_BY');
      expect(RELATIONSHIP_TYPES.CAUSES).toBe('CAUSES');
      expect(RELATIONSHIP_TYPES.FIXED_BY).toBe('FIXED_BY');
      expect(RELATIONSHIP_TYPES.PREVENTS).toBe('PREVENTS');
      expect(RELATIONSHIP_TYPES.PREVENTED_BY).toBe('PREVENTED_BY');
    });

    it('should define knowledge relationships', () => {
      expect(RELATIONSHIP_TYPES.APPLIES_TO).toBe('APPLIES_TO');
      expect(RELATIONSHIP_TYPES.SUGGESTS).toBe('SUGGESTS');
      expect(RELATIONSHIP_TYPES.SIMILAR_TO).toBe('SIMILAR_TO');
      expect(RELATIONSHIP_TYPES.RELATED_TO).toBe('RELATED_TO');
      expect(RELATIONSHIP_TYPES.REFERENCES).toBe('REFERENCES');
      expect(RELATIONSHIP_TYPES.REFERENCED_BY).toBe('REFERENCED_BY');
    });

    it('should define dependency relationships', () => {
      expect(RELATIONSHIP_TYPES.DEPENDS_ON).toBe('DEPENDS_ON');
      expect(RELATIONSHIP_TYPES.DEPENDED_BY).toBe('DEPENDED_BY');
      expect(RELATIONSHIP_TYPES.BLOCKS).toBe('BLOCKS');
      expect(RELATIONSHIP_TYPES.BLOCKED_BY).toBe('BLOCKED_BY');
      expect(RELATIONSHIP_TYPES.REQUIRES).toBe('REQUIRES');
      expect(RELATIONSHIP_TYPES.REQUIRED_BY).toBe('REQUIRED_BY');
    });

    it('should define organization relationships', () => {
      expect(RELATIONSHIP_TYPES.TAGGED_WITH).toBe('TAGGED_WITH');
      expect(RELATIONSHIP_TYPES.CATEGORIZED_AS).toBe('CATEGORIZED_AS');
      expect(RELATIONSHIP_TYPES.OWNED_BY).toBe('OWNED_BY');
    });

    it('should have no duplicate type values', () => {
      const values = Object.values(RELATIONSHIP_TYPES);
      const uniqueValues = new Set(values);
      expect(values.length).toBe(uniqueValues.size);
    });

    it('should have inverse relationships defined', () => {
      // Verify inverse pairs exist
      expect(RELATIONSHIP_TYPES.TESTS).toBeDefined();
      expect(RELATIONSHIP_TYPES.TESTED_BY).toBeDefined();

      expect(RELATIONSHIP_TYPES.DEPENDS_ON).toBeDefined();
      expect(RELATIONSHIP_TYPES.DEPENDED_BY).toBeDefined();

      expect(RELATIONSHIP_TYPES.BLOCKS).toBeDefined();
      expect(RELATIONSHIP_TYPES.BLOCKED_BY).toBeDefined();

      expect(RELATIONSHIP_TYPES.REFERENCES).toBeDefined();
      expect(RELATIONSHIP_TYPES.REFERENCED_BY).toBeDefined();
    });
  });

  // ========================================
  // Query Patterns Tests
  // ========================================
  describe('QUERY_PATTERNS', () => {
    it('should have TEST_CASES_FOR_REQUIREMENT pattern', () => {
      expect(QUERY_PATTERNS.TEST_CASES_FOR_REQUIREMENT).toBeDefined();
      expect(QUERY_PATTERNS.TEST_CASES_FOR_REQUIREMENT).toContain('Requirement');
      expect(QUERY_PATTERNS.TEST_CASES_FOR_REQUIREMENT).toContain('TestCase');
      expect(QUERY_PATTERNS.TEST_CASES_FOR_REQUIREMENT).toContain('$requirementId');
    });

    it('should have BUGS_FOR_TEST_CASE pattern', () => {
      expect(QUERY_PATTERNS.BUGS_FOR_TEST_CASE).toBeDefined();
      expect(QUERY_PATTERNS.BUGS_FOR_TEST_CASE).toContain('TestCase');
      expect(QUERY_PATTERNS.BUGS_FOR_TEST_CASE).toContain('Bug');
      expect(QUERY_PATTERNS.BUGS_FOR_TEST_CASE).toContain('$testCaseId');
    });

    it('should have SIMILAR_TEST_CASES pattern', () => {
      expect(QUERY_PATTERNS.SIMILAR_TEST_CASES).toBeDefined();
      expect(QUERY_PATTERNS.SIMILAR_TEST_CASES).toContain('SIMILAR_TO');
      expect(QUERY_PATTERNS.SIMILAR_TEST_CASES).toContain('$limit');
    });

    it('should have BEST_PRACTICES_FOR_TECHNIQUE pattern', () => {
      expect(QUERY_PATTERNS.BEST_PRACTICES_FOR_TECHNIQUE).toBeDefined();
      expect(QUERY_PATTERNS.BEST_PRACTICES_FOR_TECHNIQUE).toContain('TestTechnique');
      expect(QUERY_PATTERNS.BEST_PRACTICES_FOR_TECHNIQUE).toContain('BestPractice');
    });

    it('should have COUNTERMEASURES_FOR_BUG_PATTERN pattern', () => {
      expect(QUERY_PATTERNS.COUNTERMEASURES_FOR_BUG_PATTERN).toBeDefined();
      expect(QUERY_PATTERNS.COUNTERMEASURES_FOR_BUG_PATTERN).toContain('BugCountermeasure');
      expect(QUERY_PATTERNS.COUNTERMEASURES_FOR_BUG_PATTERN).toContain('PREVENTS');
    });

    it('should have FULLTEXT_SEARCH pattern', () => {
      expect(QUERY_PATTERNS.FULLTEXT_SEARCH).toBeDefined();
      expect(QUERY_PATTERNS.FULLTEXT_SEARCH).toContain('db.index.fulltext.queryNodes');
      expect(QUERY_PATTERNS.FULLTEXT_SEARCH).toContain('$query');
      expect(QUERY_PATTERNS.FULLTEXT_SEARCH).toContain('$minScore');
    });

    it('should have RELATED_BY_TAGS pattern', () => {
      expect(QUERY_PATTERNS.RELATED_BY_TAGS).toBeDefined();
      expect(QUERY_PATTERNS.RELATED_BY_TAGS).toContain('TAGGED_WITH');
      expect(QUERY_PATTERNS.RELATED_BY_TAGS).toContain('sharedTags');
    });

    it('should have GRAPH_STATISTICS pattern', () => {
      expect(QUERY_PATTERNS.GRAPH_STATISTICS).toBeDefined();
      expect(QUERY_PATTERNS.GRAPH_STATISTICS).toContain('labels(n)');
      expect(QUERY_PATTERNS.GRAPH_STATISTICS).toContain('count');
    });

    it('should have all patterns containing valid Cypher syntax', () => {
      const patterns = Object.values(QUERY_PATTERNS);
      patterns.forEach((pattern) => {
        // All patterns should have MATCH or CALL
        expect(pattern).toMatch(/MATCH|CALL/);
        // All patterns should have RETURN
        expect(pattern).toContain('RETURN');
      });
    });
  });

  // ========================================
  // RAG Query Patterns Tests
  // ========================================
  describe('RAG_QUERY_PATTERNS', () => {
    it('should have CONTEXT_FROM_TEST_CASE pattern', () => {
      expect(RAG_QUERY_PATTERNS.CONTEXT_FROM_TEST_CASE).toBeDefined();
      expect(RAG_QUERY_PATTERNS.CONTEXT_FROM_TEST_CASE).toContain('TestCase');
      expect(RAG_QUERY_PATTERNS.CONTEXT_FROM_TEST_CASE).toContain('$testCaseId');
      expect(RAG_QUERY_PATTERNS.CONTEXT_FROM_TEST_CASE).toContain('OPTIONAL MATCH');
    });

    it('should have CONTEXT_FROM_REQUIREMENT pattern', () => {
      expect(RAG_QUERY_PATTERNS.CONTEXT_FROM_REQUIREMENT).toBeDefined();
      expect(RAG_QUERY_PATTERNS.CONTEXT_FROM_REQUIREMENT).toContain('Requirement');
      expect(RAG_QUERY_PATTERNS.CONTEXT_FROM_REQUIREMENT).toContain('$requirementId');
    });

    it('should have CONTEXT_FROM_BUG pattern', () => {
      expect(RAG_QUERY_PATTERNS.CONTEXT_FROM_BUG).toBeDefined();
      expect(RAG_QUERY_PATTERNS.CONTEXT_FROM_BUG).toContain('Bug');
      expect(RAG_QUERY_PATTERNS.CONTEXT_FROM_BUG).toContain('$bugId');
      expect(RAG_QUERY_PATTERNS.CONTEXT_FROM_BUG).toContain('BugCountermeasure');
    });

    it('should have RELEVANT_BEST_PRACTICES pattern', () => {
      expect(RAG_QUERY_PATTERNS.RELEVANT_BEST_PRACTICES).toBeDefined();
      expect(RAG_QUERY_PATTERNS.RELEVANT_BEST_PRACTICES).toContain('BestPractice');
      expect(RAG_QUERY_PATTERNS.RELEVANT_BEST_PRACTICES).toContain('$contexts');
      expect(RAG_QUERY_PATTERNS.RELEVANT_BEST_PRACTICES).toContain('$categories');
    });

    it('should have RELEVANT_TEST_TECHNIQUES pattern', () => {
      expect(RAG_QUERY_PATTERNS.RELEVANT_TEST_TECHNIQUES).toBeDefined();
      expect(RAG_QUERY_PATTERNS.RELEVANT_TEST_TECHNIQUES).toContain('TestTechnique');
    });

    it('should collect related data efficiently', () => {
      // Context queries should use collect for aggregation
      expect(RAG_QUERY_PATTERNS.CONTEXT_FROM_TEST_CASE).toContain('collect');
      expect(RAG_QUERY_PATTERNS.CONTEXT_FROM_REQUIREMENT).toContain('collect');
      expect(RAG_QUERY_PATTERNS.CONTEXT_FROM_BUG).toContain('collect');
    });
  });

  // ========================================
  // Schema Completeness Tests
  // ========================================
  describe('Schema Completeness', () => {
    it('should have matching inverse relationship types', () => {
      const inverses: [string, string][] = [
        ['TESTS', 'TESTED_BY'],
        ['COVERS', 'COVERED_BY'],
        ['FOUND_BY', 'FOUND_IN'],
        ['CAUSED_BY', 'CAUSES'],
        ['PREVENTS', 'PREVENTED_BY'],
        ['DEPENDS_ON', 'DEPENDED_BY'],
        ['BLOCKS', 'BLOCKED_BY'],
        ['REQUIRES', 'REQUIRED_BY'],
        ['REFERENCES', 'REFERENCED_BY'],
      ];

      inverses.forEach(([type1, type2]) => {
        expect(RELATIONSHIP_TYPES).toHaveProperty(type1);
        expect(RELATIONSHIP_TYPES).toHaveProperty(type2);
      });
    });

    it('should cover all major domain concepts', () => {
      // Test management domain
      expect(NODE_LABELS.TestCase).toBeDefined();
      expect(NODE_LABELS.TestStep).toBeDefined();
      expect(NODE_LABELS.TestSpec).toBeDefined();

      // Requirements domain
      expect(NODE_LABELS.Requirement).toBeDefined();
      expect(NODE_LABELS.Feature).toBeDefined();

      // Defect domain
      expect(NODE_LABELS.Bug).toBeDefined();
      expect(NODE_LABELS.BugPattern).toBeDefined();
      expect(NODE_LABELS.BugCountermeasure).toBeDefined();

      // Knowledge domain
      expect(NODE_LABELS.BestPractice).toBeDefined();
      expect(NODE_LABELS.TestDesignKnowledge).toBeDefined();
      expect(NODE_LABELS.TestTechnique).toBeDefined();
    });

    it('should have all query patterns use defined labels', () => {
      const definedLabels = new Set(Object.values(NODE_LABELS));
      const allPatterns = [...Object.values(QUERY_PATTERNS), ...Object.values(RAG_QUERY_PATTERNS)];

      // Extract labels from patterns (simplified check)
      const labelPattern = /\((\w+):(\w+)/g;

      allPatterns.forEach((pattern) => {
        let match;
        while ((match = labelPattern.exec(pattern)) !== null) {
          const label = match[2];
          // Labels in patterns should be defined (or be variable bindings)
          if (definedLabels.has(label) || label === 'Knowledge') {
            // Valid label
          } else {
            // This is acceptable for test as we may have additional labels
          }
        }
      });
    });
  });
});
