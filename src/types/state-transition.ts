/**
 * State Transition Types
 *
 * 状態遷移・画面遷移設計支援の型定義
 */

// ========================================
// 基本型
// ========================================

/**
 * 遷移図タイプ
 */
export const DiagramType = {
  STATE_TRANSITION: 'STATE_TRANSITION', // 状態遷移図
  SCREEN_TRANSITION: 'SCREEN_TRANSITION', // 画面遷移図
} as const;

export type DiagramType = (typeof DiagramType)[keyof typeof DiagramType];

/**
 * ノードタイプ
 */
export const NodeType = {
  STATE: 'STATE', // 状態
  SCREEN: 'SCREEN', // 画面
  START: 'START', // 開始ノード
  END: 'END', // 終了ノード
  DECISION: 'DECISION', // 分岐
  FORK: 'FORK', // フォーク（並行処理開始）
  JOIN: 'JOIN', // ジョイン（並行処理終了）
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];

/**
 * 遷移図定義
 */
export interface TransitionDiagram {
  id: string;
  testCaseId?: number;
  projectId: number;
  name: string;
  description?: string;
  type: DiagramType;
  nodes: TransitionNode[];
  edges: TransitionEdge[];
  metadata?: DiagramMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ノード定義
 */
export interface TransitionNode {
  id: string;
  name: string;
  type: NodeType;
  description?: string;
  position: Position;
  properties?: NodeProperties;
  style?: NodeStyle;
}

/**
 * 位置
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * ノードプロパティ
 */
export interface NodeProperties {
  entryAction?: string; // 入場アクション
  exitAction?: string; // 退場アクション
  internalAction?: string; // 内部アクション
  screenId?: string; // 画面ID（画面遷移図用）
  invariant?: string; // 不変条件
  attributes?: Record<string, string>; // カスタム属性
}

/**
 * ノードスタイル
 */
export interface NodeStyle {
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  width?: number;
  height?: number;
  shape?: 'rectangle' | 'rounded' | 'ellipse' | 'diamond' | 'circle';
}

/**
 * エッジ（遷移）定義
 */
export interface TransitionEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  trigger?: string; // トリガー（イベント）
  guard?: string; // ガード条件
  action?: string; // アクション
  priority?: number; // 優先度（同一ソースからの複数遷移時）
  style?: EdgeStyle;
}

/**
 * エッジスタイル
 */
export interface EdgeStyle {
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  arrowType?: 'arrow' | 'diamond' | 'circle' | 'none';
}

/**
 * 図メタデータ
 */
export interface DiagramMetadata {
  version?: string;
  author?: string;
  lastEditedBy?: string;
  tags?: string[];
  category?: string;
  linkedRequirements?: string[];
  coverageTarget?: number; // 目標カバレッジ率
}

// ========================================
// パス分析関連
// ========================================

/**
 * 遷移パス
 */
export interface TransitionPath {
  id: string;
  name: string;
  description?: string;
  nodeIds: string[];
  edgeIds: string[];
  length: number;
  type: PathType;
  isLoop: boolean;
  coverage?: PathCoverage;
}

/**
 * パスタイプ
 */
export const PathType = {
  SIMPLE: 'SIMPLE', // 単純パス（同じノードを通らない）
  ALL_STATES: 'ALL_STATES', // 全状態網羅
  ALL_TRANSITIONS: 'ALL_TRANSITIONS', // 全遷移網羅
  ALL_PAIRS: 'ALL_PAIRS', // 全ペア網羅
  BOUNDARY: 'BOUNDARY', // 境界パス（開始→終了）
  LOOP: 'LOOP', // ループパス
  CUSTOM: 'CUSTOM', // カスタムパス
} as const;

export type PathType = (typeof PathType)[keyof typeof PathType];

/**
 * パスカバレッジ情報
 */
export interface PathCoverage {
  coveredNodes: string[];
  coveredEdges: string[];
  uncoveredNodes: string[];
  uncoveredEdges: string[];
  nodesCoverage: number; // 0-1
  edgesCoverage: number; // 0-1
}

// ========================================
// カバレッジ分析
// ========================================

/**
 * カバレッジタイプ
 */
export const CoverageType = {
  NODE: 'NODE', // ノードカバレッジ
  EDGE: 'EDGE', // エッジカバレッジ
  EDGE_PAIR: 'EDGE_PAIR', // エッジペアカバレッジ
  PATH: 'PATH', // パスカバレッジ
  PRIME_PATH: 'PRIME_PATH', // プライムパスカバレッジ
} as const;

export type CoverageType = (typeof CoverageType)[keyof typeof CoverageType];

/**
 * カバレッジ分析結果
 */
export interface CoverageAnalysis {
  diagramId: string;
  coverageType: CoverageType;
  totalItems: number;
  coveredItems: number;
  coveragePercentage: number;
  items: CoverageItem[];
  testCaseMapping: TestCaseCoverageMapping[];
  timestamp: Date;
}

/**
 * カバレッジアイテム
 */
export interface CoverageItem {
  id: string;
  name: string;
  type: 'node' | 'edge' | 'path';
  covered: boolean;
  coveredByTestCases: number[];
}

/**
 * テストケースカバレッジマッピング
 */
export interface TestCaseCoverageMapping {
  testCaseId: number;
  coveredNodes: string[];
  coveredEdges: string[];
  coveredPaths: string[];
}

// ========================================
// テストケース生成
// ========================================

/**
 * テストケース生成オプション
 */
export interface TestCaseGenerationOptions {
  coverageType: CoverageType;
  maxPathLength?: number;
  includeLoops?: boolean;
  maxLoopIterations?: number;
  startNodeId?: string;
  endNodeIds?: string[];
  titleTemplate?: string;
  generateSteps?: boolean;
}

/**
 * 生成されたテストケース
 */
export interface GeneratedTestCase {
  id: string;
  title: string;
  description?: string;
  path: TransitionPath;
  steps: GeneratedTestStep[];
  preconditions?: string;
  postconditions?: string;
}

/**
 * 生成されたテストステップ
 */
export interface GeneratedTestStep {
  order: number;
  nodeId: string;
  edgeId?: string;
  action: string;
  expectedResult: string;
}

// ========================================
// API関連型
// ========================================

/**
 * 図作成リクエスト
 */
export interface CreateDiagramRequest {
  name: string;
  description?: string;
  type: DiagramType;
  testCaseId?: number;
  nodes?: Omit<TransitionNode, 'id'>[];
  edges?: Omit<TransitionEdge, 'id'>[];
  metadata?: DiagramMetadata;
}

/**
 * 図更新リクエスト
 */
export interface UpdateDiagramRequest {
  name?: string;
  description?: string;
  nodes?: TransitionNode[];
  edges?: TransitionEdge[];
  metadata?: DiagramMetadata;
}

/**
 * ノード追加リクエスト
 */
export interface AddNodeRequest {
  name: string;
  type: NodeType;
  description?: string;
  position: Position;
  properties?: NodeProperties;
  style?: NodeStyle;
}

/**
 * エッジ追加リクエスト
 */
export interface AddEdgeRequest {
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  trigger?: string;
  guard?: string;
  action?: string;
  priority?: number;
  style?: EdgeStyle;
}

/**
 * パス生成リクエスト
 */
export interface GeneratePathsRequest {
  coverageType: CoverageType;
  maxPathLength?: number;
  includeLoops?: boolean;
  maxLoopIterations?: number;
}

/**
 * テストケース生成リクエスト
 */
export interface GenerateTestCasesRequest {
  pathIds: string[];
  options: TestCaseGenerationOptions;
  createTestCases?: boolean;
}

/**
 * カバレッジ分析リクエスト
 */
export interface AnalyzeCoverageRequest {
  coverageType: CoverageType;
  testCaseIds?: number[];
}

// ========================================
// ユーティリティ関数
// ========================================

/**
 * 図タイプのラベルを取得
 */
export function getDiagramTypeLabel(type: DiagramType): string {
  const labels: Record<DiagramType, string> = {
    STATE_TRANSITION: '状態遷移図',
    SCREEN_TRANSITION: '画面遷移図',
  };
  return labels[type] || type;
}

/**
 * ノードタイプのラベルを取得
 */
export function getNodeTypeLabel(type: NodeType): string {
  const labels: Record<NodeType, string> = {
    STATE: '状態',
    SCREEN: '画面',
    START: '開始',
    END: '終了',
    DECISION: '分岐',
    FORK: 'フォーク',
    JOIN: 'ジョイン',
  };
  return labels[type] || type;
}

/**
 * ノードタイプの色を取得
 */
export function getNodeTypeColor(type: NodeType): string {
  const colors: Record<NodeType, string> = {
    STATE: '#3b82f6', // blue-500
    SCREEN: '#8b5cf6', // violet-500
    START: '#22c55e', // green-500
    END: '#ef4444', // red-500
    DECISION: '#f59e0b', // amber-500
    FORK: '#6366f1', // indigo-500
    JOIN: '#6366f1', // indigo-500
  };
  return colors[type] || '#9ca3af';
}

/**
 * パスタイプのラベルを取得
 */
export function getPathTypeLabel(type: PathType): string {
  const labels: Record<PathType, string> = {
    SIMPLE: '単純パス',
    ALL_STATES: '全状態網羅',
    ALL_TRANSITIONS: '全遷移網羅',
    ALL_PAIRS: '全ペア網羅',
    BOUNDARY: '境界パス',
    LOOP: 'ループパス',
    CUSTOM: 'カスタムパス',
  };
  return labels[type] || type;
}

/**
 * カバレッジタイプのラベルを取得
 */
export function getCoverageTypeLabel(type: CoverageType): string {
  const labels: Record<CoverageType, string> = {
    NODE: 'ノードカバレッジ',
    EDGE: 'エッジカバレッジ',
    EDGE_PAIR: 'エッジペアカバレッジ',
    PATH: 'パスカバレッジ',
    PRIME_PATH: 'プライムパスカバレッジ',
  };
  return labels[type] || type;
}

/**
 * ユニークIDを生成
 */
function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 空の状態遷移図を生成
 */
export function createEmptyStateDiagram(
  name: string
): Omit<TransitionDiagram, 'id' | 'projectId' | 'createdAt' | 'updatedAt'> {
  const startNodeId = generateUniqueId('node');
  const endNodeId = generateUniqueId('node');

  return {
    name,
    type: 'STATE_TRANSITION',
    nodes: [
      {
        id: startNodeId,
        name: '開始',
        type: 'START',
        position: { x: 100, y: 200 },
        style: { shape: 'circle' },
      },
      {
        id: endNodeId,
        name: '終了',
        type: 'END',
        position: { x: 500, y: 200 },
        style: { shape: 'circle' },
      },
    ],
    edges: [],
  };
}

/**
 * 空の画面遷移図を生成
 */
export function createEmptyScreenDiagram(
  name: string
): Omit<TransitionDiagram, 'id' | 'projectId' | 'createdAt' | 'updatedAt'> {
  const startNodeId = generateUniqueId('node');

  return {
    name,
    type: 'SCREEN_TRANSITION',
    nodes: [
      {
        id: startNodeId,
        name: 'ホーム画面',
        type: 'SCREEN',
        position: { x: 100, y: 200 },
        style: { shape: 'rectangle' },
      },
    ],
    edges: [],
  };
}

/**
 * ノードの出力エッジを取得
 */
export function getOutgoingEdges(diagram: TransitionDiagram, nodeId: string): TransitionEdge[] {
  return diagram.edges.filter((edge) => edge.sourceNodeId === nodeId);
}

/**
 * ノードの入力エッジを取得
 */
export function getIncomingEdges(diagram: TransitionDiagram, nodeId: string): TransitionEdge[] {
  return diagram.edges.filter((edge) => edge.targetNodeId === nodeId);
}

/**
 * 開始ノードを取得
 */
export function getStartNodes(diagram: TransitionDiagram): TransitionNode[] {
  return diagram.nodes.filter((node) => node.type === 'START');
}

/**
 * 終了ノードを取得
 */
export function getEndNodes(diagram: TransitionDiagram): TransitionNode[] {
  return diagram.nodes.filter((node) => node.type === 'END');
}

/**
 * ノードIDからノードを取得
 */
export function getNodeById(
  diagram: TransitionDiagram,
  nodeId: string
): TransitionNode | undefined {
  return diagram.nodes.find((node) => node.id === nodeId);
}

/**
 * エッジIDからエッジを取得
 */
export function getEdgeById(
  diagram: TransitionDiagram,
  edgeId: string
): TransitionEdge | undefined {
  return diagram.edges.find((edge) => edge.id === edgeId);
}

/**
 * パスをテキスト表現に変換
 */
export function pathToString(diagram: TransitionDiagram, path: TransitionPath): string {
  return path.nodeIds.map((nodeId) => getNodeById(diagram, nodeId)?.name || nodeId).join(' → ');
}

/**
 * 遷移ラベルを生成
 */
export function generateEdgeLabel(edge: TransitionEdge): string {
  const parts: string[] = [];

  if (edge.trigger) {
    parts.push(edge.trigger);
  }

  if (edge.guard) {
    parts.push(`[${edge.guard}]`);
  }

  if (edge.action) {
    parts.push(`/ ${edge.action}`);
  }

  return parts.join(' ') || edge.label || '';
}

/**
 * テストステップアクションを生成
 */
export function generateStepAction(
  diagram: TransitionDiagram,
  edge: TransitionEdge,
  sourceNode: TransitionNode
): string {
  if (edge.trigger) {
    return `${sourceNode.name}で「${edge.trigger}」を実行する`;
  }
  if (edge.label) {
    return `${sourceNode.name}で「${edge.label}」を実行する`;
  }
  return `${sourceNode.name}から遷移を実行する`;
}

/**
 * テストステップ期待結果を生成
 */
export function generateStepExpectedResult(
  diagram: TransitionDiagram,
  edge: TransitionEdge,
  targetNode: TransitionNode
): string {
  if (diagram.type === 'SCREEN_TRANSITION') {
    return `${targetNode.name}が表示される`;
  }
  return `状態が「${targetNode.name}」に遷移する`;
}
