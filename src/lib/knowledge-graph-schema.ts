/**
 * Knowledge Graph Schema Definition
 *
 * Neo4jナレッジグラフのスキーマ定義とインデックス・制約の管理
 */

import { getSession } from './neo4j';

// ========================================
// Node Labels (ノードラベル定義)
// ========================================

/**
 * ナレッジグラフのノードラベル
 */
export const NODE_LABELS = {
  // Base label for all knowledge nodes
  Knowledge: 'Knowledge',

  // Test assets
  TestCase: 'TestCase',
  TestStep: 'TestStep',
  TestSpec: 'TestSpec',
  TestSet: 'TestSet',
  Baseline: 'Baseline',

  // Defects
  Bug: 'Bug',
  BugPattern: 'BugPattern',

  // Knowledge types
  BestPractice: 'BestPractice',
  TestDesignKnowledge: 'TestDesignKnowledge',
  BugCountermeasure: 'BugCountermeasure',
  TestTechnique: 'TestTechnique',

  // System components
  Feature: 'Feature',
  Module: 'Module',
  Requirement: 'Requirement',

  // Organization
  Tag: 'Tag',
  Category: 'Category',
  Project: 'Project',
} as const;

export type NodeLabel = (typeof NODE_LABELS)[keyof typeof NODE_LABELS];

// ========================================
// Relationship Types (リレーションシップタイプ定義)
// ========================================

/**
 * ナレッジグラフのリレーションシップタイプ
 */
export const RELATIONSHIP_TYPES = {
  // Structural relationships
  HAS_STEP: 'HAS_STEP',
  BELONGS_TO: 'BELONGS_TO',
  CONTAINS: 'CONTAINS',
  PART_OF: 'PART_OF',

  // Test relationships
  TESTS: 'TESTS',
  TESTED_BY: 'TESTED_BY',
  COVERS: 'COVERS',
  COVERED_BY: 'COVERED_BY',
  VERIFIES: 'VERIFIES',

  // Bug relationships
  FOUND_BY: 'FOUND_BY',
  FOUND_IN: 'FOUND_IN',
  CAUSED_BY: 'CAUSED_BY',
  CAUSES: 'CAUSES',
  FIXED_BY: 'FIXED_BY',
  PREVENTS: 'PREVENTS',
  PREVENTED_BY: 'PREVENTED_BY',

  // Knowledge relationships
  APPLIES_TO: 'APPLIES_TO',
  SUGGESTS: 'SUGGESTS',
  SIMILAR_TO: 'SIMILAR_TO',
  RELATED_TO: 'RELATED_TO',
  REFERENCES: 'REFERENCES',
  REFERENCED_BY: 'REFERENCED_BY',

  // Dependency relationships
  DEPENDS_ON: 'DEPENDS_ON',
  DEPENDED_BY: 'DEPENDED_BY',
  BLOCKS: 'BLOCKS',
  BLOCKED_BY: 'BLOCKED_BY',
  REQUIRES: 'REQUIRES',
  REQUIRED_BY: 'REQUIRED_BY',

  // Organization relationships
  TAGGED_WITH: 'TAGGED_WITH',
  CATEGORIZED_AS: 'CATEGORIZED_AS',
  OWNED_BY: 'OWNED_BY',
} as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[keyof typeof RELATIONSHIP_TYPES];

// ========================================
// Node Property Schemas (プロパティスキーマ定義)
// ========================================

/**
 * 共通プロパティスキーマ
 */
export interface BaseNodeProperties {
  sourceId: string;
  title: string;
  description?: string;
  content?: string;
  metadata?: string; // JSON string
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * テストケースノードプロパティ
 */
export interface TestCaseNodeProperties extends BaseNodeProperties {
  testSpecId: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  testType: string;
  preconditions?: string;
  status: string;
  tags: string[];
}

/**
 * テストステップノードプロパティ
 */
export interface TestStepNodeProperties extends BaseNodeProperties {
  testCaseId: string;
  stepNo: number;
  action: string;
  expectedResult?: string;
}

/**
 * バグノードプロパティ
 */
export interface BugNodeProperties extends BaseNodeProperties {
  bugId: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'TRIVIAL';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  bugType?: string;
  rootCause?: string;
  resolution?: string;
  stepsToReproduce?: string;
  environment?: string;
}

/**
 * ベストプラクティスノードプロパティ
 */
export interface BestPracticeNodeProperties extends BaseNodeProperties {
  category: string;
  applicability: string[];
  examples: string[];
  benefits?: string[];
  risks?: string[];
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * テスト設計知識ノードプロパティ
 */
export interface TestDesignKnowledgeNodeProperties extends BaseNodeProperties {
  technique: string;
  applicableScenarios: string[];
  considerations: string[];
  examples: string[];
  tools?: string[];
  references?: string[];
}

/**
 * バグ対策ノードプロパティ
 */
export interface BugCountermeasureNodeProperties extends BaseNodeProperties {
  targetBugPattern: string;
  preventionMethods: string[];
  detectionMethods: string[];
  testingStrategies?: string[];
  automationPossibility: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

/**
 * 要求ノードプロパティ
 */
export interface RequirementNodeProperties extends BaseNodeProperties {
  requirementId: string;
  priority: 'MUST' | 'SHOULD' | 'COULD' | 'WONT';
  status: string;
  type: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'CONSTRAINT' | 'INTERFACE';
  rationale?: string;
  acceptanceCriteria?: string[];
}

/**
 * テスト技法ノードプロパティ
 */
export interface TestTechniqueNodeProperties extends BaseNodeProperties {
  code: string;
  category: 'BLACK_BOX' | 'WHITE_BOX' | 'EXPERIENCE_BASED' | 'STRUCTURE_BASED';
  applicability: string[];
  strengths: string[];
  weaknesses: string[];
  inputTypes: string[];
  outputTypes: string[];
}

// ========================================
// Relationship Property Schemas
// ========================================

/**
 * 共通リレーションシッププロパティ
 */
export interface BaseRelationshipProperties {
  weight?: number;
  confidence?: number;
  createdAt: Date;
  metadata?: string; // JSON string
}

/**
 * 類似度リレーションシッププロパティ
 */
export interface SimilarityRelationshipProperties extends BaseRelationshipProperties {
  similarityScore: number;
  comparedFields: string[];
}

/**
 * 原因-結果リレーションシッププロパティ
 */
export interface CausalRelationshipProperties extends BaseRelationshipProperties {
  causalStrength: 'STRONG' | 'MODERATE' | 'WEAK';
  evidence?: string;
}

// ========================================
// Schema Initialization (スキーマ初期化)
// ========================================

/**
 * ノードの制約を作成
 */
export async function createNodeConstraints(): Promise<void> {
  const constraints = [
    // Unique constraints for primary identifiers
    `CREATE CONSTRAINT knowledge_source_id IF NOT EXISTS
     FOR (n:Knowledge) REQUIRE n.sourceId IS UNIQUE`,

    `CREATE CONSTRAINT test_case_source_id IF NOT EXISTS
     FOR (n:TestCase) REQUIRE n.sourceId IS UNIQUE`,

    `CREATE CONSTRAINT bug_source_id IF NOT EXISTS
     FOR (n:Bug) REQUIRE n.sourceId IS UNIQUE`,

    `CREATE CONSTRAINT requirement_source_id IF NOT EXISTS
     FOR (n:Requirement) REQUIRE n.sourceId IS UNIQUE`,

    `CREATE CONSTRAINT tag_source_id IF NOT EXISTS
     FOR (n:Tag) REQUIRE n.sourceId IS UNIQUE`,
  ];

  const session = getSession();
  try {
    for (const constraint of constraints) {
      try {
        await session.run(constraint);
      } catch {
        // Constraint may already exist
        console.log(`Constraint creation skipped: ${constraint.substring(0, 50)}...`);
      }
    }
  } finally {
    await session.close();
  }
}

/**
 * ノードのインデックスを作成
 */
export async function createNodeIndexes(): Promise<void> {
  const indexes = [
    // Type and category indexes
    `CREATE INDEX knowledge_type IF NOT EXISTS FOR (n:Knowledge) ON (n.type)`,
    `CREATE INDEX knowledge_category IF NOT EXISTS FOR (n:Knowledge) ON (n.category)`,

    // Test case indexes
    `CREATE INDEX test_case_spec IF NOT EXISTS FOR (n:TestCase) ON (n.testSpecId)`,
    `CREATE INDEX test_case_priority IF NOT EXISTS FOR (n:TestCase) ON (n.priority)`,
    `CREATE INDEX test_case_status IF NOT EXISTS FOR (n:TestCase) ON (n.status)`,

    // Bug indexes
    `CREATE INDEX bug_severity IF NOT EXISTS FOR (n:Bug) ON (n.severity)`,
    `CREATE INDEX bug_status IF NOT EXISTS FOR (n:Bug) ON (n.status)`,
    `CREATE INDEX bug_type IF NOT EXISTS FOR (n:Bug) ON (n.bugType)`,

    // Best practice indexes
    `CREATE INDEX best_practice_category IF NOT EXISTS FOR (n:BestPractice) ON (n.category)`,
    `CREATE INDEX best_practice_complexity IF NOT EXISTS FOR (n:BestPractice) ON (n.complexity)`,

    // Test technique indexes
    `CREATE INDEX test_technique_code IF NOT EXISTS FOR (n:TestTechnique) ON (n.code)`,
    `CREATE INDEX test_technique_category IF NOT EXISTS FOR (n:TestTechnique) ON (n.category)`,

    // Requirement indexes
    `CREATE INDEX requirement_priority IF NOT EXISTS FOR (n:Requirement) ON (n.priority)`,
    `CREATE INDEX requirement_type IF NOT EXISTS FOR (n:Requirement) ON (n.type)`,

    // Timestamp indexes for ordering
    `CREATE INDEX knowledge_created IF NOT EXISTS FOR (n:Knowledge) ON (n.createdAt)`,
    `CREATE INDEX knowledge_updated IF NOT EXISTS FOR (n:Knowledge) ON (n.updatedAt)`,
  ];

  const session = getSession();
  try {
    for (const index of indexes) {
      try {
        await session.run(index);
      } catch {
        // Index may already exist
        console.log(`Index creation skipped: ${index.substring(0, 50)}...`);
      }
    }
  } finally {
    await session.close();
  }
}

/**
 * フルテキストインデックスを作成
 */
export async function createFulltextIndexes(): Promise<void> {
  const fulltextIndexes = [
    // General knowledge search
    `CREATE FULLTEXT INDEX knowledge_fulltext IF NOT EXISTS
     FOR (n:Knowledge)
     ON EACH [n.title, n.description, n.content]`,

    // Test case specific search
    `CREATE FULLTEXT INDEX test_case_fulltext IF NOT EXISTS
     FOR (n:TestCase)
     ON EACH [n.title, n.description, n.preconditions]`,

    // Bug specific search
    `CREATE FULLTEXT INDEX bug_fulltext IF NOT EXISTS
     FOR (n:Bug)
     ON EACH [n.title, n.description, n.stepsToReproduce, n.rootCause]`,

    // Best practice search
    `CREATE FULLTEXT INDEX best_practice_fulltext IF NOT EXISTS
     FOR (n:BestPractice)
     ON EACH [n.title, n.description, n.content]`,

    // Requirement search
    `CREATE FULLTEXT INDEX requirement_fulltext IF NOT EXISTS
     FOR (n:Requirement)
     ON EACH [n.title, n.description, n.rationale]`,
  ];

  const session = getSession();
  try {
    for (const index of fulltextIndexes) {
      try {
        await session.run(index);
      } catch {
        // Index may already exist
        console.log(`Fulltext index creation skipped: ${index.substring(0, 50)}...`);
      }
    }
  } finally {
    await session.close();
  }
}

/**
 * ベクトルインデックスを作成（embedding検索用）
 */
export async function createVectorIndexes(): Promise<void> {
  const vectorIndexes = [
    // Vector similarity search for embeddings
    `CREATE VECTOR INDEX knowledge_embedding IF NOT EXISTS
     FOR (n:Knowledge)
     ON n.embedding
     OPTIONS {indexConfig: {
       \`vector.dimensions\`: 1536,
       \`vector.similarity_function\`: 'cosine'
     }}`,
  ];

  const session = getSession();
  try {
    for (const index of vectorIndexes) {
      try {
        await session.run(index);
      } catch {
        // Vector index may not be supported or already exist
        console.log(`Vector index creation skipped: ${index.substring(0, 50)}...`);
      }
    }
  } finally {
    await session.close();
  }
}

/**
 * 全スキーマを初期化
 */
export async function initializeSchema(): Promise<void> {
  console.log('Initializing knowledge graph schema...');

  // Create constraints first (they implicitly create indexes)
  console.log('Creating node constraints...');
  await createNodeConstraints();

  // Create additional indexes
  console.log('Creating node indexes...');
  await createNodeIndexes();

  // Create fulltext indexes
  console.log('Creating fulltext indexes...');
  await createFulltextIndexes();

  // Create vector indexes (optional, may not be supported)
  console.log('Creating vector indexes...');
  await createVectorIndexes();

  console.log('Knowledge graph schema initialization complete.');
}

// ========================================
// Query Patterns (クエリパターン)
// ========================================

/**
 * 一般的なクエリパターン
 */
export const QUERY_PATTERNS = {
  // Find test cases for a requirement
  TEST_CASES_FOR_REQUIREMENT: `
    MATCH (req:Requirement {sourceId: $requirementId})
    -[:TESTED_BY|COVERED_BY]->(tc:TestCase)
    RETURN tc
    ORDER BY tc.priority DESC
  `,

  // Find bugs related to a test case
  BUGS_FOR_TEST_CASE: `
    MATCH (tc:TestCase {sourceId: $testCaseId})
    <-[:FOUND_BY]-(bug:Bug)
    RETURN bug
    ORDER BY bug.severity DESC, bug.createdAt DESC
  `,

  // Find similar test cases
  SIMILAR_TEST_CASES: `
    MATCH (tc:TestCase {sourceId: $testCaseId})
    -[:SIMILAR_TO]-(similar:TestCase)
    WHERE similar.sourceId <> $testCaseId
    RETURN similar, 1 as score
    ORDER BY score DESC
    LIMIT $limit
  `,

  // Find best practices for a test technique
  BEST_PRACTICES_FOR_TECHNIQUE: `
    MATCH (technique:TestTechnique {code: $techniqueCode})
    <-[:APPLIES_TO]-(bp:BestPractice)
    RETURN bp
    ORDER BY bp.complexity
  `,

  // Find countermeasures for a bug pattern
  COUNTERMEASURES_FOR_BUG_PATTERN: `
    MATCH (bug:Bug {sourceId: $bugId})
    -[:SIMILAR_TO]->(pattern:BugPattern)
    <-[:PREVENTS]-(cm:BugCountermeasure)
    RETURN cm
    LIMIT $limit
  `,

  // Trace test coverage path
  TEST_COVERAGE_PATH: `
    MATCH path = (req:Requirement {sourceId: $requirementId})
    -[:TESTED_BY*1..3]->(tc:TestCase)
    RETURN path
  `,

  // Find knowledge subgraph
  KNOWLEDGE_SUBGRAPH: `
    MATCH path = (n:Knowledge {sourceId: $sourceId})
    -[r*1..$depth]-(connected:Knowledge)
    WHERE connected.sourceId <> $sourceId
    RETURN path
    LIMIT $limit
  `,

  // Search with fulltext
  FULLTEXT_SEARCH: `
    CALL db.index.fulltext.queryNodes('knowledge_fulltext', $query)
    YIELD node, score
    WHERE score >= $minScore
    RETURN node, score
    ORDER BY score DESC
    LIMIT $limit
  `,

  // Find related items by tags
  RELATED_BY_TAGS: `
    MATCH (n:Knowledge {sourceId: $sourceId})
    -[:TAGGED_WITH]->(tag:Tag)
    <-[:TAGGED_WITH]-(related:Knowledge)
    WHERE related.sourceId <> $sourceId
    RETURN related, count(tag) as sharedTags
    ORDER BY sharedTags DESC
    LIMIT $limit
  `,

  // Get statistics
  GRAPH_STATISTICS: `
    MATCH (n:Knowledge)
    WITH labels(n) as nodeLabels, count(n) as nodeCount
    RETURN nodeLabels, nodeCount
    ORDER BY nodeCount DESC
  `,
} as const;

/**
 * RAGコンテキスト構築用クエリパターン
 */
export const RAG_QUERY_PATTERNS = {
  // Build context from test case
  CONTEXT_FROM_TEST_CASE: `
    MATCH (tc:TestCase {sourceId: $testCaseId})
    OPTIONAL MATCH (tc)-[:HAS_STEP]->(step:TestStep)
    OPTIONAL MATCH (tc)-[:TESTS]->(feat:Feature)
    OPTIONAL MATCH (tc)<-[:FOUND_BY]-(bug:Bug)
    OPTIONAL MATCH (tc)-[:TAGGED_WITH]->(tag:Tag)
    RETURN tc, collect(DISTINCT step) as steps,
           collect(DISTINCT feat) as features,
           collect(DISTINCT bug) as bugs,
           collect(DISTINCT tag) as tags
  `,

  // Build context from requirement
  CONTEXT_FROM_REQUIREMENT: `
    MATCH (req:Requirement {sourceId: $requirementId})
    OPTIONAL MATCH (req)-[:TESTED_BY]->(tc:TestCase)
    OPTIONAL MATCH (req)-[:PART_OF]->(parent:Requirement)
    OPTIONAL MATCH (req)<-[:PART_OF]-(child:Requirement)
    RETURN req, collect(DISTINCT tc) as testCases,
           parent, collect(DISTINCT child) as children
  `,

  // Build context from bug
  CONTEXT_FROM_BUG: `
    MATCH (bug:Bug {sourceId: $bugId})
    OPTIONAL MATCH (bug)-[:FOUND_BY]->(tc:TestCase)
    OPTIONAL MATCH (bug)-[:CAUSED_BY]->(cause)
    OPTIONAL MATCH (bug)<-[:PREVENTS]-(cm:BugCountermeasure)
    OPTIONAL MATCH (bug)-[:SIMILAR_TO]->(similar:Bug)
    RETURN bug, collect(DISTINCT tc) as testCases,
           collect(DISTINCT cause) as causes,
           collect(DISTINCT cm) as countermeasures,
           collect(DISTINCT similar) as similarBugs
  `,

  // Find relevant best practices
  RELEVANT_BEST_PRACTICES: `
    MATCH (bp:BestPractice)
    WHERE any(app IN bp.applicability WHERE app IN $contexts)
       OR bp.category IN $categories
    RETURN bp
    ORDER BY bp.complexity
    LIMIT $limit
  `,

  // Find relevant test techniques
  RELEVANT_TEST_TECHNIQUES: `
    MATCH (tt:TestTechnique)
    WHERE any(app IN tt.applicability WHERE app IN $contexts)
       OR tt.category IN $categories
    RETURN tt
    LIMIT $limit
  `,
} as const;
