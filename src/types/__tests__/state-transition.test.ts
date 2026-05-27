/**
 * State Transition Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  DiagramType,
  NodeType,
  PathType,
  CoverageType,
  getDiagramTypeLabel,
  getNodeTypeLabel,
  getNodeTypeColor,
  getPathTypeLabel,
  getCoverageTypeLabel,
  createEmptyStateDiagram,
  createEmptyScreenDiagram,
  getOutgoingEdges,
  getIncomingEdges,
  getStartNodes,
  getEndNodes,
  getNodeById,
  getEdgeById,
  pathToString,
  generateEdgeLabel,
  generateStepAction,
  generateStepExpectedResult,
  TransitionDiagram,
  TransitionNode,
  TransitionEdge,
  TransitionPath,
} from '../state-transition';

describe('State Transition Types', () => {
  describe('Constants', () => {
    it('DiagramType should have all expected values', () => {
      expect(DiagramType.STATE_TRANSITION).toBe('STATE_TRANSITION');
      expect(DiagramType.SCREEN_TRANSITION).toBe('SCREEN_TRANSITION');
    });

    it('NodeType should have all expected values', () => {
      expect(NodeType.STATE).toBe('STATE');
      expect(NodeType.SCREEN).toBe('SCREEN');
      expect(NodeType.START).toBe('START');
      expect(NodeType.END).toBe('END');
      expect(NodeType.DECISION).toBe('DECISION');
      expect(NodeType.FORK).toBe('FORK');
      expect(NodeType.JOIN).toBe('JOIN');
    });

    it('PathType should have all expected values', () => {
      expect(PathType.SIMPLE).toBe('SIMPLE');
      expect(PathType.ALL_STATES).toBe('ALL_STATES');
      expect(PathType.ALL_TRANSITIONS).toBe('ALL_TRANSITIONS');
      expect(PathType.ALL_PAIRS).toBe('ALL_PAIRS');
      expect(PathType.BOUNDARY).toBe('BOUNDARY');
      expect(PathType.LOOP).toBe('LOOP');
      expect(PathType.CUSTOM).toBe('CUSTOM');
    });

    it('CoverageType should have all expected values', () => {
      expect(CoverageType.NODE).toBe('NODE');
      expect(CoverageType.EDGE).toBe('EDGE');
      expect(CoverageType.EDGE_PAIR).toBe('EDGE_PAIR');
      expect(CoverageType.PATH).toBe('PATH');
      expect(CoverageType.PRIME_PATH).toBe('PRIME_PATH');
    });
  });

  describe('getDiagramTypeLabel', () => {
    it('should return correct Japanese labels', () => {
      expect(getDiagramTypeLabel('STATE_TRANSITION')).toBe('状態遷移図');
      expect(getDiagramTypeLabel('SCREEN_TRANSITION')).toBe('画面遷移図');
    });

    it('should return value itself for unknown types', () => {
      expect(getDiagramTypeLabel('UNKNOWN' as DiagramType)).toBe('UNKNOWN');
    });
  });

  describe('getNodeTypeLabel', () => {
    it('should return correct Japanese labels', () => {
      expect(getNodeTypeLabel('STATE')).toBe('状態');
      expect(getNodeTypeLabel('SCREEN')).toBe('画面');
      expect(getNodeTypeLabel('START')).toBe('開始');
      expect(getNodeTypeLabel('END')).toBe('終了');
      expect(getNodeTypeLabel('DECISION')).toBe('分岐');
      expect(getNodeTypeLabel('FORK')).toBe('フォーク');
      expect(getNodeTypeLabel('JOIN')).toBe('ジョイン');
    });
  });

  describe('getNodeTypeColor', () => {
    it('should return correct colors', () => {
      expect(getNodeTypeColor('STATE')).toBe('#3b82f6');
      expect(getNodeTypeColor('SCREEN')).toBe('#8b5cf6');
      expect(getNodeTypeColor('START')).toBe('#22c55e');
      expect(getNodeTypeColor('END')).toBe('#ef4444');
      expect(getNodeTypeColor('DECISION')).toBe('#f59e0b');
    });

    it('should return default color for unknown types', () => {
      expect(getNodeTypeColor('UNKNOWN' as NodeType)).toBe('#9ca3af');
    });
  });

  describe('getPathTypeLabel', () => {
    it('should return correct Japanese labels', () => {
      expect(getPathTypeLabel('SIMPLE')).toBe('単純パス');
      expect(getPathTypeLabel('ALL_STATES')).toBe('全状態網羅');
      expect(getPathTypeLabel('ALL_TRANSITIONS')).toBe('全遷移網羅');
      expect(getPathTypeLabel('ALL_PAIRS')).toBe('全ペア網羅');
      expect(getPathTypeLabel('BOUNDARY')).toBe('境界パス');
      expect(getPathTypeLabel('LOOP')).toBe('ループパス');
      expect(getPathTypeLabel('CUSTOM')).toBe('カスタムパス');
    });
  });

  describe('getCoverageTypeLabel', () => {
    it('should return correct Japanese labels', () => {
      expect(getCoverageTypeLabel('NODE')).toBe('ノードカバレッジ');
      expect(getCoverageTypeLabel('EDGE')).toBe('エッジカバレッジ');
      expect(getCoverageTypeLabel('EDGE_PAIR')).toBe('エッジペアカバレッジ');
      expect(getCoverageTypeLabel('PATH')).toBe('パスカバレッジ');
      expect(getCoverageTypeLabel('PRIME_PATH')).toBe('プライムパスカバレッジ');
    });
  });

  describe('createEmptyStateDiagram', () => {
    it('should create a state transition diagram with start and end nodes', () => {
      const diagram = createEmptyStateDiagram('Test Diagram');

      expect(diagram.name).toBe('Test Diagram');
      expect(diagram.type).toBe('STATE_TRANSITION');
      expect(diagram.nodes).toHaveLength(2);
      expect(diagram.edges).toHaveLength(0);
    });

    it('should have a start node', () => {
      const diagram = createEmptyStateDiagram('Test');
      const startNode = diagram.nodes.find((n) => n.type === 'START');

      expect(startNode).toBeDefined();
      expect(startNode?.name).toBe('開始');
    });

    it('should have an end node', () => {
      const diagram = createEmptyStateDiagram('Test');
      const endNode = diagram.nodes.find((n) => n.type === 'END');

      expect(endNode).toBeDefined();
      expect(endNode?.name).toBe('終了');
    });

    it('should generate unique node IDs', () => {
      const diagram1 = createEmptyStateDiagram('Test 1');
      const diagram2 = createEmptyStateDiagram('Test 2');

      expect(diagram1.nodes[0].id).not.toBe(diagram2.nodes[0].id);
    });
  });

  describe('createEmptyScreenDiagram', () => {
    it('should create a screen transition diagram with a home screen', () => {
      const diagram = createEmptyScreenDiagram('Screen Diagram');

      expect(diagram.name).toBe('Screen Diagram');
      expect(diagram.type).toBe('SCREEN_TRANSITION');
      expect(diagram.nodes).toHaveLength(1);
      expect(diagram.edges).toHaveLength(0);
    });

    it('should have a screen node', () => {
      const diagram = createEmptyScreenDiagram('Test');
      const screenNode = diagram.nodes.find((n) => n.type === 'SCREEN');

      expect(screenNode).toBeDefined();
      expect(screenNode?.name).toBe('ホーム画面');
    });
  });

  describe('getOutgoingEdges', () => {
    it('should return edges that originate from the specified node', () => {
      const diagram: TransitionDiagram = {
        id: 'test',
        projectId: 1,
        name: 'Test',
        type: 'STATE_TRANSITION',
        nodes: [
          { id: 'n1', name: 'A', type: 'STATE', position: { x: 0, y: 0 } },
          { id: 'n2', name: 'B', type: 'STATE', position: { x: 100, y: 0 } },
          { id: 'n3', name: 'C', type: 'STATE', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2' },
          { id: 'e2', sourceNodeId: 'n1', targetNodeId: 'n3' },
          { id: 'e3', sourceNodeId: 'n2', targetNodeId: 'n3' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const outgoing = getOutgoingEdges(diagram, 'n1');
      expect(outgoing).toHaveLength(2);
      expect(outgoing.map((e) => e.id)).toContain('e1');
      expect(outgoing.map((e) => e.id)).toContain('e2');
    });

    it('should return empty array for node with no outgoing edges', () => {
      const diagram: TransitionDiagram = {
        id: 'test',
        projectId: 1,
        name: 'Test',
        type: 'STATE_TRANSITION',
        nodes: [{ id: 'n1', name: 'A', type: 'END', position: { x: 0, y: 0 } }],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const outgoing = getOutgoingEdges(diagram, 'n1');
      expect(outgoing).toHaveLength(0);
    });
  });

  describe('getIncomingEdges', () => {
    it('should return edges that target the specified node', () => {
      const diagram: TransitionDiagram = {
        id: 'test',
        projectId: 1,
        name: 'Test',
        type: 'STATE_TRANSITION',
        nodes: [
          { id: 'n1', name: 'A', type: 'STATE', position: { x: 0, y: 0 } },
          { id: 'n2', name: 'B', type: 'STATE', position: { x: 100, y: 0 } },
        ],
        edges: [
          { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2' },
          { id: 'e2', sourceNodeId: 'n1', targetNodeId: 'n2' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const incoming = getIncomingEdges(diagram, 'n2');
      expect(incoming).toHaveLength(2);
    });
  });

  describe('getStartNodes', () => {
    it('should return all START type nodes', () => {
      const diagram: TransitionDiagram = {
        id: 'test',
        projectId: 1,
        name: 'Test',
        type: 'STATE_TRANSITION',
        nodes: [
          { id: 'n1', name: 'Start', type: 'START', position: { x: 0, y: 0 } },
          { id: 'n2', name: 'State', type: 'STATE', position: { x: 100, y: 0 } },
          { id: 'n3', name: 'End', type: 'END', position: { x: 200, y: 0 } },
        ],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const startNodes = getStartNodes(diagram);
      expect(startNodes).toHaveLength(1);
      expect(startNodes[0].type).toBe('START');
    });
  });

  describe('getEndNodes', () => {
    it('should return all END type nodes', () => {
      const diagram: TransitionDiagram = {
        id: 'test',
        projectId: 1,
        name: 'Test',
        type: 'STATE_TRANSITION',
        nodes: [
          { id: 'n1', name: 'Start', type: 'START', position: { x: 0, y: 0 } },
          { id: 'n2', name: 'End1', type: 'END', position: { x: 100, y: 0 } },
          { id: 'n3', name: 'End2', type: 'END', position: { x: 200, y: 0 } },
        ],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const endNodes = getEndNodes(diagram);
      expect(endNodes).toHaveLength(2);
      expect(endNodes.every((n) => n.type === 'END')).toBe(true);
    });
  });

  describe('getNodeById', () => {
    it('should return the node with the specified ID', () => {
      const diagram: TransitionDiagram = {
        id: 'test',
        projectId: 1,
        name: 'Test',
        type: 'STATE_TRANSITION',
        nodes: [
          { id: 'n1', name: 'A', type: 'STATE', position: { x: 0, y: 0 } },
          { id: 'n2', name: 'B', type: 'STATE', position: { x: 100, y: 0 } },
        ],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const node = getNodeById(diagram, 'n2');
      expect(node?.name).toBe('B');
    });

    it('should return undefined for non-existent ID', () => {
      const diagram: TransitionDiagram = {
        id: 'test',
        projectId: 1,
        name: 'Test',
        type: 'STATE_TRANSITION',
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const node = getNodeById(diagram, 'nonexistent');
      expect(node).toBeUndefined();
    });
  });

  describe('getEdgeById', () => {
    it('should return the edge with the specified ID', () => {
      const diagram: TransitionDiagram = {
        id: 'test',
        projectId: 1,
        name: 'Test',
        type: 'STATE_TRANSITION',
        nodes: [],
        edges: [
          { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', label: 'Edge 1' },
          { id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n3', label: 'Edge 2' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const edge = getEdgeById(diagram, 'e1');
      expect(edge?.label).toBe('Edge 1');
    });
  });

  describe('pathToString', () => {
    it('should convert path to readable string', () => {
      const diagram: TransitionDiagram = {
        id: 'test',
        projectId: 1,
        name: 'Test',
        type: 'STATE_TRANSITION',
        nodes: [
          { id: 'n1', name: 'A', type: 'STATE', position: { x: 0, y: 0 } },
          { id: 'n2', name: 'B', type: 'STATE', position: { x: 100, y: 0 } },
          { id: 'n3', name: 'C', type: 'STATE', position: { x: 200, y: 0 } },
        ],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const path: TransitionPath = {
        id: 'p1',
        name: 'Test Path',
        nodeIds: ['n1', 'n2', 'n3'],
        edgeIds: [],
        length: 3,
        type: 'SIMPLE',
        isLoop: false,
      };

      const result = pathToString(diagram, path);
      expect(result).toBe('A → B → C');
    });
  });

  describe('generateEdgeLabel', () => {
    it('should generate label from trigger', () => {
      const edge: TransitionEdge = {
        id: 'e1',
        sourceNodeId: 'n1',
        targetNodeId: 'n2',
        trigger: 'Click',
      };

      expect(generateEdgeLabel(edge)).toBe('Click');
    });

    it('should generate label with guard', () => {
      const edge: TransitionEdge = {
        id: 'e1',
        sourceNodeId: 'n1',
        targetNodeId: 'n2',
        trigger: 'Submit',
        guard: 'isValid',
      };

      expect(generateEdgeLabel(edge)).toBe('Submit [isValid]');
    });

    it('should generate label with action', () => {
      const edge: TransitionEdge = {
        id: 'e1',
        sourceNodeId: 'n1',
        targetNodeId: 'n2',
        trigger: 'Save',
        action: 'saveData',
      };

      expect(generateEdgeLabel(edge)).toBe('Save / saveData');
    });

    it('should generate full label', () => {
      const edge: TransitionEdge = {
        id: 'e1',
        sourceNodeId: 'n1',
        targetNodeId: 'n2',
        trigger: 'Submit',
        guard: 'isValid',
        action: 'process',
      };

      expect(generateEdgeLabel(edge)).toBe('Submit [isValid] / process');
    });

    it('should use label field as fallback', () => {
      const edge: TransitionEdge = {
        id: 'e1',
        sourceNodeId: 'n1',
        targetNodeId: 'n2',
        label: 'Custom Label',
      };

      expect(generateEdgeLabel(edge)).toBe('Custom Label');
    });
  });

  describe('generateStepAction', () => {
    it('should generate action text with trigger', () => {
      const diagram: TransitionDiagram = {
        id: 'test',
        projectId: 1,
        name: 'Test',
        type: 'STATE_TRANSITION',
        nodes: [{ id: 'n1', name: 'ログイン画面', type: 'SCREEN', position: { x: 0, y: 0 } }],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const edge: TransitionEdge = {
        id: 'e1',
        sourceNodeId: 'n1',
        targetNodeId: 'n2',
        trigger: 'ログインボタン押下',
      };

      const sourceNode: TransitionNode = {
        id: 'n1',
        name: 'ログイン画面',
        type: 'SCREEN',
        position: { x: 0, y: 0 },
      };

      const result = generateStepAction(diagram, edge, sourceNode);
      expect(result).toBe('ログイン画面で「ログインボタン押下」を実行する');
    });
  });

  describe('generateStepExpectedResult', () => {
    it('should generate expected result for screen transition', () => {
      const diagram: TransitionDiagram = {
        id: 'test',
        projectId: 1,
        name: 'Test',
        type: 'SCREEN_TRANSITION',
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const edge: TransitionEdge = {
        id: 'e1',
        sourceNodeId: 'n1',
        targetNodeId: 'n2',
      };

      const targetNode: TransitionNode = {
        id: 'n2',
        name: 'ホーム画面',
        type: 'SCREEN',
        position: { x: 0, y: 0 },
      };

      const result = generateStepExpectedResult(diagram, edge, targetNode);
      expect(result).toBe('ホーム画面が表示される');
    });

    it('should generate expected result for state transition', () => {
      const diagram: TransitionDiagram = {
        id: 'test',
        projectId: 1,
        name: 'Test',
        type: 'STATE_TRANSITION',
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const edge: TransitionEdge = {
        id: 'e1',
        sourceNodeId: 'n1',
        targetNodeId: 'n2',
      };

      const targetNode: TransitionNode = {
        id: 'n2',
        name: '実行中',
        type: 'STATE',
        position: { x: 0, y: 0 },
      };

      const result = generateStepExpectedResult(diagram, edge, targetNode);
      expect(result).toBe('状態が「実行中」に遷移する');
    });
  });
});
