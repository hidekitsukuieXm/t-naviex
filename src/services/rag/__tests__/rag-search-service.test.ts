/**
 * RAG Search Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  convertSubGraphToVisualization,
  getNodeTypeColor,
  getCategoryInfo,
  getRelationshipInfo,
} from '../rag-search-service';
import {
  KnowledgeNode,
  KnowledgeRelationship,
  SubGraph,
  KnowledgeNodeType,
  KnowledgeCategory,
  RelationshipType,
} from '@/types/knowledge-graph';

// Mock repository functions
vi.mock('@/repositories/knowledge-graph-repository', () => ({
  searchNodes: vi.fn(),
  buildRAGContext: vi.fn(),
  findSimilarNodes: vi.fn(),
  getSubGraph: vi.fn(),
  getNodeById: vi.fn(),
  getNodesByType: vi.fn(),
}));

describe('RAG Search Service', () => {
  describe('convertSubGraphToVisualization', () => {
    it('空のサブグラフを変換できる', () => {
      const subgraph: SubGraph = {
        nodes: [],
        relationships: [],
      };

      const result = convertSubGraphToVisualization(subgraph);

      expect(result.nodes).toEqual([]);
      expect(result.links).toEqual([]);
    });

    it('ノードを可視化形式に変換できる', () => {
      const nodes: KnowledgeNode[] = [
        {
          id: 1,
          type: 'TestCase',
          category: 'TEST_ASSET',
          sourceId: 'tc-1',
          title: 'テストケース1',
          description: '説明',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          type: 'BestPractice',
          category: 'BEST_PRACTICE',
          sourceId: 'bp-1',
          title: 'ベストプラクティス1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const subgraph: SubGraph = {
        nodes,
        relationships: [],
      };

      const result = convertSubGraphToVisualization(subgraph);

      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0]).toMatchObject({
        id: '1',
        label: 'テストケース1',
        type: 'TestCase',
        category: 'TEST_ASSET',
      });
      expect(result.nodes[1]).toMatchObject({
        id: '2',
        label: 'ベストプラクティス1',
        type: 'BestPractice',
        category: 'BEST_PRACTICE',
      });
    });

    it('リレーションシップを可視化形式に変換できる', () => {
      const nodes: KnowledgeNode[] = [
        {
          id: 1,
          type: 'TestCase',
          category: 'TEST_ASSET',
          sourceId: 'tc-1',
          title: 'テストケース1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          type: 'TestStep',
          category: 'TEST_ASSET',
          sourceId: 'ts-1',
          title: 'テストステップ1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const relationships: KnowledgeRelationship[] = [
        {
          id: 1,
          type: 'HAS_STEP',
          startNodeId: 1,
          endNodeId: 2,
          weight: 1,
          createdAt: new Date(),
        },
      ];

      const subgraph: SubGraph = {
        nodes,
        relationships,
      };

      const result = convertSubGraphToVisualization(subgraph);

      expect(result.links).toHaveLength(1);
      expect(result.links[0]).toMatchObject({
        source: '1',
        target: '2',
        type: 'HAS_STEP',
        weight: 1,
      });
    });
  });

  describe('getNodeTypeColor', () => {
    it('TestCaseの色を返す', () => {
      const color = getNodeTypeColor('TestCase');
      expect(color).toBe('#3b82f6');
    });

    it('Bugの色を返す', () => {
      const color = getNodeTypeColor('Bug');
      expect(color).toBe('#ef4444');
    });

    it('BestPracticeの色を返す', () => {
      const color = getNodeTypeColor('BestPractice');
      expect(color).toBe('#22c55e');
    });

    it('TestDesignKnowledgeの色を返す', () => {
      const color = getNodeTypeColor('TestDesignKnowledge');
      expect(color).toBe('#a855f7');
    });

    it('BugCountermeasureの色を返す', () => {
      const color = getNodeTypeColor('BugCountermeasure');
      expect(color).toBe('#f59e0b');
    });

    it.each([
      ['TestStep', '#60a5fa'],
      ['Feature', '#06b6d4'],
      ['Module', '#8b5cf6'],
      ['Tag', '#6b7280'],
    ] as [KnowledgeNodeType, string][])('%sの色を返す', (type, expectedColor) => {
      const color = getNodeTypeColor(type);
      expect(color).toBe(expectedColor);
    });
  });

  describe('getCategoryInfo', () => {
    it('TEST_ASSETの情報を返す', () => {
      const info = getCategoryInfo('TEST_ASSET');
      expect(info.label).toBe('テスト資産');
      expect(info.description).toContain('テストケース');
    });

    it('DEFECTの情報を返す', () => {
      const info = getCategoryInfo('DEFECT');
      expect(info.label).toBe('欠陥');
    });

    it('BEST_PRACTICEの情報を返す', () => {
      const info = getCategoryInfo('BEST_PRACTICE');
      expect(info.label).toBe('ベストプラクティス');
    });

    it('DESIGN_KNOWLEDGEの情報を返す', () => {
      const info = getCategoryInfo('DESIGN_KNOWLEDGE');
      expect(info.label).toBe('設計知識');
    });

    it('COUNTERMEASUREの情報を返す', () => {
      const info = getCategoryInfo('COUNTERMEASURE');
      expect(info.label).toBe('対策知識');
    });

    it('SYSTEM_COMPONENTの情報を返す', () => {
      const info = getCategoryInfo('SYSTEM_COMPONENT');
      expect(info.label).toBe('システム構成');
    });
  });

  describe('getRelationshipInfo', () => {
    it('HAS_STEPの情報を返す', () => {
      const info = getRelationshipInfo('HAS_STEP');
      expect(info.label).toBe('ステップを持つ');
    });

    it('RELATED_TOの情報を返す', () => {
      const info = getRelationshipInfo('RELATED_TO');
      expect(info.label).toBe('関連');
    });

    it('TESTSの情報を返す', () => {
      const info = getRelationshipInfo('TESTS');
      expect(info.label).toBe('テスト対象');
    });

    it('FOUND_BYの情報を返す', () => {
      const info = getRelationshipInfo('FOUND_BY');
      expect(info.label).toBe('発見元');
    });

    it('CAUSED_BYの情報を返す', () => {
      const info = getRelationshipInfo('CAUSED_BY');
      expect(info.label).toBe('原因');
    });

    it('PREVENTED_BYの情報を返す', () => {
      const info = getRelationshipInfo('PREVENTED_BY');
      expect(info.label).toBe('防止策');
    });

    it('APPLIES_TOの情報を返す', () => {
      const info = getRelationshipInfo('APPLIES_TO');
      expect(info.label).toBe('適用対象');
    });

    it('TAGGED_WITHの情報を返す', () => {
      const info = getRelationshipInfo('TAGGED_WITH');
      expect(info.label).toBe('タグ付け');
    });

    it('DEPENDS_ONの情報を返す', () => {
      const info = getRelationshipInfo('DEPENDS_ON');
      expect(info.label).toBe('依存');
    });

    it('SIMILAR_TOの情報を返す', () => {
      const info = getRelationshipInfo('SIMILAR_TO');
      expect(info.label).toBe('類似');
    });

    it('REFERENCESの情報を返す', () => {
      const info = getRelationshipInfo('REFERENCES');
      expect(info.label).toBe('参照');
    });
  });
});
