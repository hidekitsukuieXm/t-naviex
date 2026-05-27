/**
 * Knowledge Graph Types
 *
 * Graph RAGのためのナレッジグラフ型定義
 */

// ========================================
// Node Types
// ========================================

/**
 * ナレッジノードの種類
 */
export type KnowledgeNodeType =
  | 'TestCase'
  | 'TestStep'
  | 'Bug'
  | 'BestPractice'
  | 'TestDesignKnowledge'
  | 'BugCountermeasure'
  | 'Feature'
  | 'Module'
  | 'Tag';

/**
 * ナレッジノードのカテゴリ
 */
export type KnowledgeCategory =
  | 'TEST_ASSET'
  | 'DEFECT'
  | 'BEST_PRACTICE'
  | 'DESIGN_KNOWLEDGE'
  | 'COUNTERMEASURE'
  | 'SYSTEM_COMPONENT';

/**
 * ナレッジノードカテゴリ情報
 */
export const KNOWLEDGE_CATEGORY_INFO: Record<
  KnowledgeCategory,
  { label: string; description: string }
> = {
  TEST_ASSET: {
    label: 'テスト資産',
    description: 'テストケース、テストステップなどのテスト資産',
  },
  DEFECT: {
    label: '欠陥',
    description: 'バグ、不具合情報',
  },
  BEST_PRACTICE: {
    label: 'ベストプラクティス',
    description: 'テスト設計・実行のベストプラクティス',
  },
  DESIGN_KNOWLEDGE: {
    label: '設計知識',
    description: 'テスト設計に関する知識・ノウハウ',
  },
  COUNTERMEASURE: {
    label: '対策知識',
    description: 'バグ対策、回避策の知識',
  },
  SYSTEM_COMPONENT: {
    label: 'システム構成',
    description: '機能、モジュール、タグなどのシステム構成要素',
  },
};

/**
 * 基本ナレッジノード
 */
export interface KnowledgeNode {
  id: number;
  type: KnowledgeNodeType;
  category: KnowledgeCategory;
  sourceId: string;
  title: string;
  content?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * テストケースノード
 */
export interface TestCaseNode extends Omit<KnowledgeNode, 'type' | 'category'> {
  type: 'TestCase';
  category: 'TEST_ASSET';
  testSpecId: string;
  priority: string;
  testType: string;
  preconditions?: string;
  tags: string[];
}

/**
 * テストステップノード
 */
export interface TestStepNode extends Omit<KnowledgeNode, 'type' | 'category'> {
  type: 'TestStep';
  category: 'TEST_ASSET';
  testCaseId: string;
  stepNo: number;
  action: string;
  expectedResult?: string;
}

/**
 * バグノード
 */
export interface BugNode extends Omit<KnowledgeNode, 'type' | 'category'> {
  type: 'Bug';
  category: 'DEFECT';
  bugId: string;
  severity: string;
  status: string;
  rootCause?: string;
  resolution?: string;
}

/**
 * ベストプラクティスノード
 */
export interface BestPracticeNode extends Omit<KnowledgeNode, 'type' | 'category'> {
  type: 'BestPractice';
  category: 'BEST_PRACTICE';
  practiceCategory: string;
  applicability: string[];
  examples?: string[];
}

/**
 * テスト設計知識ノード
 */
export interface TestDesignKnowledgeNode extends Omit<KnowledgeNode, 'type' | 'category'> {
  type: 'TestDesignKnowledge';
  category: 'DESIGN_KNOWLEDGE';
  technique: string;
  applicableScenarios: string[];
  considerations?: string[];
}

/**
 * バグ対策ノード
 */
export interface BugCountermeasureNode extends Omit<KnowledgeNode, 'type' | 'category'> {
  type: 'BugCountermeasure';
  category: 'COUNTERMEASURE';
  targetBugPattern: string;
  preventionMethods: string[];
  detectionMethods?: string[];
}

// ========================================
// Relationship Types
// ========================================

/**
 * リレーションシップの種類
 */
export type RelationshipType =
  | 'HAS_STEP'
  | 'RELATED_TO'
  | 'TESTS'
  | 'FOUND_BY'
  | 'CAUSED_BY'
  | 'PREVENTED_BY'
  | 'APPLIES_TO'
  | 'TAGGED_WITH'
  | 'DEPENDS_ON'
  | 'SIMILAR_TO'
  | 'REFERENCES';

/**
 * リレーションシップ情報
 */
export const RELATIONSHIP_TYPE_INFO: Record<
  RelationshipType,
  { label: string; description: string; inverse?: string }
> = {
  HAS_STEP: {
    label: 'ステップを持つ',
    description: 'テストケースがテストステップを持つ',
    inverse: 'BELONGS_TO',
  },
  RELATED_TO: {
    label: '関連',
    description: '一般的な関連性',
  },
  TESTS: {
    label: 'テスト対象',
    description: 'テストケースが機能をテストする',
    inverse: 'TESTED_BY',
  },
  FOUND_BY: {
    label: '発見元',
    description: 'バグがテストケースによって発見された',
    inverse: 'FOUND',
  },
  CAUSED_BY: {
    label: '原因',
    description: 'バグの原因となる要素',
    inverse: 'CAUSES',
  },
  PREVENTED_BY: {
    label: '防止策',
    description: 'バグが対策によって防止される',
    inverse: 'PREVENTS',
  },
  APPLIES_TO: {
    label: '適用対象',
    description: 'ベストプラクティスやナレッジの適用対象',
    inverse: 'HAS_APPLICABLE',
  },
  TAGGED_WITH: {
    label: 'タグ付け',
    description: 'ノードにタグが付けられている',
    inverse: 'TAGS',
  },
  DEPENDS_ON: {
    label: '依存',
    description: '別のノードに依存している',
    inverse: 'DEPENDED_BY',
  },
  SIMILAR_TO: {
    label: '類似',
    description: '内容が類似している',
  },
  REFERENCES: {
    label: '参照',
    description: '別のノードを参照している',
    inverse: 'REFERENCED_BY',
  },
};

/**
 * リレーションシップ
 */
export interface KnowledgeRelationship {
  id: number;
  type: RelationshipType;
  startNodeId: number;
  endNodeId: number;
  properties?: Record<string, unknown>;
  weight?: number;
  createdAt: Date;
}

// ========================================
// Graph Query Types
// ========================================

/**
 * グラフ検索パラメータ
 */
export interface GraphSearchParams {
  query: string;
  nodeTypes?: KnowledgeNodeType[];
  categories?: KnowledgeCategory[];
  limit?: number;
  minScore?: number;
  includeRelated?: boolean;
  relatedDepth?: number;
}

/**
 * グラフ検索結果
 */
export interface GraphSearchResult {
  node: KnowledgeNode;
  score: number;
  relatedNodes?: KnowledgeNode[];
  relationships?: KnowledgeRelationship[];
  path?: GraphPath;
}

/**
 * グラフパス
 */
export interface GraphPath {
  nodes: KnowledgeNode[];
  relationships: KnowledgeRelationship[];
  length: number;
}

/**
 * サブグラフ
 */
export interface SubGraph {
  nodes: KnowledgeNode[];
  relationships: KnowledgeRelationship[];
  centerNodeId?: number;
}

// ========================================
// RAG Types
// ========================================

/**
 * RAGコンテキスト
 */
export interface RAGContext {
  relevantNodes: KnowledgeNode[];
  relationships: KnowledgeRelationship[];
  totalScore: number;
  contextSummary?: string;
}

/**
 * RAGクエリ結果
 */
export interface RAGQueryResult {
  query: string;
  context: RAGContext;
  suggestedActions?: string[];
  relatedKnowledge?: {
    bestPractices: BestPracticeNode[];
    designKnowledge: TestDesignKnowledgeNode[];
    countermeasures: BugCountermeasureNode[];
  };
}

// ========================================
// Input Types for Creating/Updating
// ========================================

/**
 * ナレッジノード作成入力
 */
export interface CreateKnowledgeNodeInput {
  type: KnowledgeNodeType;
  category: KnowledgeCategory;
  sourceId: string;
  title: string;
  content?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * テストケースノード作成入力
 */
export interface CreateTestCaseNodeInput extends Omit<
  CreateKnowledgeNodeInput,
  'type' | 'category'
> {
  testSpecId: string;
  priority: string;
  testType: string;
  preconditions?: string;
  tags?: string[];
}

/**
 * テストステップノード作成入力
 */
export interface CreateTestStepNodeInput extends Omit<
  CreateKnowledgeNodeInput,
  'type' | 'category'
> {
  testCaseId: string;
  stepNo: number;
  action: string;
  expectedResult?: string;
}

/**
 * バグノード作成入力
 */
export interface CreateBugNodeInput extends Omit<CreateKnowledgeNodeInput, 'type' | 'category'> {
  bugId: string;
  severity: string;
  status: string;
  rootCause?: string;
  resolution?: string;
}

/**
 * ベストプラクティスノード作成入力
 */
export interface CreateBestPracticeNodeInput extends Omit<
  CreateKnowledgeNodeInput,
  'type' | 'category'
> {
  practiceCategory: string;
  applicability?: string[];
  examples?: string[];
}

/**
 * テスト設計知識ノード作成入力
 */
export interface CreateTestDesignKnowledgeNodeInput extends Omit<
  CreateKnowledgeNodeInput,
  'type' | 'category'
> {
  technique: string;
  applicableScenarios?: string[];
  considerations?: string[];
}

/**
 * バグ対策ノード作成入力
 */
export interface CreateBugCountermeasureNodeInput extends Omit<
  CreateKnowledgeNodeInput,
  'type' | 'category'
> {
  targetBugPattern: string;
  preventionMethods?: string[];
  detectionMethods?: string[];
}

/**
 * リレーションシップ作成入力
 */
export interface CreateRelationshipInput {
  type: RelationshipType;
  startNodeId: number;
  endNodeId: number;
  properties?: Record<string, unknown>;
  weight?: number;
}

// ========================================
// Validation Functions
// ========================================

/**
 * ナレッジノードタイプの検証
 */
export function isValidNodeType(type: string): type is KnowledgeNodeType {
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
  return validTypes.includes(type as KnowledgeNodeType);
}

/**
 * ナレッジカテゴリの検証
 */
export function isValidCategory(category: string): category is KnowledgeCategory {
  const validCategories: KnowledgeCategory[] = [
    'TEST_ASSET',
    'DEFECT',
    'BEST_PRACTICE',
    'DESIGN_KNOWLEDGE',
    'COUNTERMEASURE',
    'SYSTEM_COMPONENT',
  ];
  return validCategories.includes(category as KnowledgeCategory);
}

/**
 * リレーションシップタイプの検証
 */
export function isValidRelationshipType(type: string): type is RelationshipType {
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
  return validTypes.includes(type as RelationshipType);
}

/**
 * ノードタイプに対応するカテゴリを取得
 */
export function getCategoryForNodeType(type: KnowledgeNodeType): KnowledgeCategory {
  const typeToCategory: Record<KnowledgeNodeType, KnowledgeCategory> = {
    TestCase: 'TEST_ASSET',
    TestStep: 'TEST_ASSET',
    Bug: 'DEFECT',
    BestPractice: 'BEST_PRACTICE',
    TestDesignKnowledge: 'DESIGN_KNOWLEDGE',
    BugCountermeasure: 'COUNTERMEASURE',
    Feature: 'SYSTEM_COMPONENT',
    Module: 'SYSTEM_COMPONENT',
    Tag: 'SYSTEM_COMPONENT',
  };
  return typeToCategory[type];
}

/**
 * ナレッジノード作成入力の検証
 */
export function validateCreateNodeInput(input: CreateKnowledgeNodeInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.type || !isValidNodeType(input.type)) {
    errors.push('有効なノードタイプを指定してください');
  }

  if (!input.category || !isValidCategory(input.category)) {
    errors.push('有効なカテゴリを指定してください');
  }

  if (!input.sourceId || input.sourceId.trim().length === 0) {
    errors.push('ソースIDは必須です');
  }

  if (!input.title || input.title.trim().length === 0) {
    errors.push('タイトルは必須です');
  }

  if (input.title && input.title.length > 500) {
    errors.push('タイトルは500文字以内で入力してください');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * リレーションシップ作成入力の検証
 */
export function validateCreateRelationshipInput(input: CreateRelationshipInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.type || !isValidRelationshipType(input.type)) {
    errors.push('有効なリレーションシップタイプを指定してください');
  }

  if (!input.startNodeId || typeof input.startNodeId !== 'number') {
    errors.push('開始ノードIDは必須です');
  }

  if (!input.endNodeId || typeof input.endNodeId !== 'number') {
    errors.push('終了ノードIDは必須です');
  }

  if (input.startNodeId === input.endNodeId) {
    errors.push('開始ノードと終了ノードは異なる必要があります');
  }

  if (input.weight !== undefined && (input.weight < 0 || input.weight > 1)) {
    errors.push('重みは0から1の範囲で指定してください');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
