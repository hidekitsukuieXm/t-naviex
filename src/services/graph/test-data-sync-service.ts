/**
 * Test Data Sync Service
 *
 * PostgreSQLのテストデータをNeo4jグラフにに同期するサービス
 */

import { prisma } from '@/lib/prisma';
import { writeQuery, verifyConnection } from '@/lib/neo4j';

// ========================================
// Types
// ========================================

export interface SyncResult {
  success: boolean;
  syncedNodes: number;
  syncedRelationships: number;
  errors: string[];
  duration: number;
}

export interface SyncOptions {
  projectId?: string;
  testSpecId?: string;
  fullSync?: boolean;
  includeRelationships?: boolean;
  batchSize?: number;
}

// ========================================
// Test Case Sync
// ========================================

/**
 * テストケースをグラフにノード化
 */
export async function syncTestCasesToGraph(options: SyncOptions = {}): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let syncedNodes = 0;
  let syncedRelationships = 0;

  const batchSize = options.batchSize || 100;

  try {
    // Check Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return {
        success: false,
        syncedNodes: 0,
        syncedRelationships: 0,
        errors: ['Neo4j connection failed'],
        duration: Date.now() - startTime,
      };
    }

    // Build query filters
    const whereClause: Record<string, unknown> = {
      deletedAt: null,
    };
    if (options.testSpecId) {
      whereClause.testSpecId = options.testSpecId;
    }
    if (options.projectId) {
      whereClause.testSpec = { projectId: options.projectId };
    }

    // Get total count
    const totalCount = await prisma.testCase.count({ where: whereClause });

    // Process in batches
    let offset = 0;
    while (offset < totalCount) {
      const testCases = await prisma.testCase.findMany({
        where: whereClause,
        include: {
          testSpec: true,
          testSteps: true,
          testCaseTags: { include: { tag: true } },
        },
        skip: offset,
        take: batchSize,
      });

      for (const testCase of testCases) {
        try {
          // Create or update TestCase node
          await writeQuery(
            `
            MERGE (tc:Knowledge:TestCase {sourceId: $sourceId})
            SET tc.type = 'TestCase',
                tc.category = 'TEST_ASSET',
                tc.title = $title,
                tc.description = $description,
                tc.testSpecId = $testSpecId,
                tc.priority = $priority,
                tc.testType = $testType,
                tc.preconditions = $preconditions,
                tc.status = $status,
                tc.tags = $tags,
                tc.updatedAt = datetime()
            ON CREATE SET tc.createdAt = datetime()
            RETURN tc
            `,
            {
              sourceId: testCase.id,
              title: testCase.title,
              description: testCase.description || '',
              testSpecId: testCase.testSpecId,
              priority: testCase.priority,
              testType: testCase.testType,
              preconditions: testCase.preconditions || '',
              status: 'ACTIVE',
              tags: testCase.testCaseTags.map((t) => t.tag.name),
            }
          );
          syncedNodes++;

          // Create TestStep nodes and relationships
          for (const step of testCase.testSteps) {
            await writeQuery(
              `
              MERGE (ts:Knowledge:TestStep {sourceId: $sourceId})
              SET ts.type = 'TestStep',
                  ts.category = 'TEST_ASSET',
                  ts.title = $title,
                  ts.testCaseId = $testCaseId,
                  ts.stepNo = $stepNo,
                  ts.action = $action,
                  ts.expectedResult = $expectedResult,
                  ts.updatedAt = datetime()
              ON CREATE SET ts.createdAt = datetime()
              RETURN ts
              `,
              {
                sourceId: step.id,
                title: `Step ${step.stepNo}: ${step.actionMd?.substring(0, 50) || ''}`,
                testCaseId: testCase.id,
                stepNo: step.stepNo,
                action: step.actionMd || '',
                expectedResult: step.expectedMd || '',
              }
            );
            syncedNodes++;

            // Create HAS_STEP relationship
            if (options.includeRelationships !== false) {
              await writeQuery(
                `
                MATCH (tc:TestCase {sourceId: $testCaseId})
                MATCH (ts:TestStep {sourceId: $stepId})
                MERGE (tc)-[r:HAS_STEP]->(ts)
                SET r.stepNo = $stepNo,
                    r.createdAt = datetime()
                RETURN r
                `,
                {
                  testCaseId: testCase.id,
                  stepId: step.id,
                  stepNo: step.stepNo,
                }
              );
              syncedRelationships++;
            }
          }

          // Create Tag nodes and relationships
          if (options.includeRelationships !== false) {
            for (const tagRelation of testCase.testCaseTags) {
              const tag = tagRelation.tag;
              await writeQuery(
                `
                MERGE (t:Knowledge:Tag {sourceId: $tagId})
                SET t.type = 'Tag',
                    t.category = 'SYSTEM_COMPONENT',
                    t.title = $name,
                    t.name = $name,
                    t.color = $color,
                    t.updatedAt = datetime()
                ON CREATE SET t.createdAt = datetime()
                RETURN t
                `,
                {
                  tagId: tag.id,
                  name: tag.name,
                  color: tag.color || '#000000',
                }
              );

              await writeQuery(
                `
                MATCH (tc:TestCase {sourceId: $testCaseId})
                MATCH (t:Tag {sourceId: $tagId})
                MERGE (tc)-[r:TAGGED_WITH]->(t)
                SET r.createdAt = datetime()
                RETURN r
                `,
                {
                  testCaseId: testCase.id,
                  tagId: tag.id,
                }
              );
              syncedRelationships++;
            }
          }
        } catch (error) {
          errors.push(`Failed to sync test case ${testCase.id}: ${error}`);
        }
      }

      offset += batchSize;
    }

    return {
      success: errors.length === 0,
      syncedNodes,
      syncedRelationships,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      syncedNodes,
      syncedRelationships,
      errors: [...errors, `Sync failed: ${error}`],
      duration: Date.now() - startTime,
    };
  }
}

// ========================================
// Requirements Sync
// ========================================

/**
 * 要件をグラフにノード化
 */
export async function syncRequirementsToGraph(options: SyncOptions = {}): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let syncedNodes = 0;
  let syncedRelationships = 0;

  const batchSize = options.batchSize || 100;

  try {
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return {
        success: false,
        syncedNodes: 0,
        syncedRelationships: 0,
        errors: ['Neo4j connection failed'],
        duration: Date.now() - startTime,
      };
    }

    const whereClause: Record<string, unknown> = {};
    if (options.projectId) {
      whereClause.projectId = options.projectId;
    }

    const totalCount = await prisma.requirement.count({ where: whereClause });

    let offset = 0;
    while (offset < totalCount) {
      const requirements = await prisma.requirement.findMany({
        where: whereClause,
        include: {
          parent: true,
          children: true,
          testCases: { include: { testCase: true } },
        },
        skip: offset,
        take: batchSize,
      });

      for (const req of requirements) {
        try {
          await writeQuery(
            `
            MERGE (r:Knowledge:Requirement {sourceId: $sourceId})
            SET r.type = 'Requirement',
                r.category = 'SYSTEM_COMPONENT',
                r.title = $title,
                r.description = $description,
                r.requirementId = $reqId,
                r.priority = $priority,
                r.status = $status,
                r.reqType = $reqType,
                r.rationale = $rationale,
                r.updatedAt = datetime()
            ON CREATE SET r.createdAt = datetime()
            RETURN r
            `,
            {
              sourceId: req.id,
              title: req.title,
              description: req.description || '',
              reqId: req.id,
              priority: req.priority,
              status: req.status,
              reqType: req.type,
              rationale: req.rationale || '',
            }
          );
          syncedNodes++;

          // Create parent-child relationships
          if (options.includeRelationships !== false && req.parentId) {
            await writeQuery(
              `
              MATCH (child:Requirement {sourceId: $childId})
              MATCH (parent:Requirement {sourceId: $parentId})
              MERGE (child)-[r:PART_OF]->(parent)
              SET r.createdAt = datetime()
              RETURN r
              `,
              {
                childId: req.id,
                parentId: req.parentId,
              }
            );
            syncedRelationships++;
          }

          // Create requirement-testcase relationships
          if (options.includeRelationships !== false) {
            for (const tcRelation of req.testCases) {
              await writeQuery(
                `
                MATCH (r:Requirement {sourceId: $reqId})
                MATCH (tc:TestCase {sourceId: $tcId})
                MERGE (r)-[rel:TESTED_BY]->(tc)
                SET rel.createdAt = datetime()
                RETURN rel
                `,
                {
                  reqId: req.id,
                  tcId: tcRelation.testCaseId,
                }
              );
              syncedRelationships++;
            }
          }
        } catch (error) {
          errors.push(`Failed to sync requirement ${req.id}: ${error}`);
        }
      }

      offset += batchSize;
    }

    return {
      success: errors.length === 0,
      syncedNodes,
      syncedRelationships,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      syncedNodes,
      syncedRelationships,
      errors: [...errors, `Sync failed: ${error}`],
      duration: Date.now() - startTime,
    };
  }
}

// ========================================
// Bugs Sync
// ========================================

/**
 * バグをグラフにノード化
 */
export async function syncBugsToGraph(options: SyncOptions = {}): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let syncedNodes = 0;
  let syncedRelationships = 0;

  const batchSize = options.batchSize || 100;

  try {
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return {
        success: false,
        syncedNodes: 0,
        syncedRelationships: 0,
        errors: ['Neo4j connection failed'],
        duration: Date.now() - startTime,
      };
    }

    const whereClause: Record<string, unknown> = {};
    if (options.projectId) {
      whereClause.projectId = options.projectId;
    }

    const totalCount = await prisma.bug.count({ where: whereClause });

    let offset = 0;
    while (offset < totalCount) {
      const bugs = await prisma.bug.findMany({
        where: whereClause,
        include: {
          testResult: {
            include: {
              testRunCase: {
                include: {
                  testCase: true,
                },
              },
            },
          },
        },
        skip: offset,
        take: batchSize,
      });

      for (const bug of bugs) {
        try {
          await writeQuery(
            `
            MERGE (b:Knowledge:Bug {sourceId: $sourceId})
            SET b.type = 'Bug',
                b.category = 'DEFECT',
                b.title = $title,
                b.description = $description,
                b.bugId = $bugId,
                b.severity = $severity,
                b.priority = $priority,
                b.status = $status,
                b.bugType = $bugType,
                b.rootCause = $rootCause,
                b.stepsToReproduce = $stepsToReproduce,
                b.updatedAt = datetime()
            ON CREATE SET b.createdAt = datetime()
            RETURN b
            `,
            {
              sourceId: bug.id,
              title: bug.title,
              description: bug.description || '',
              bugId: bug.id,
              severity: bug.severity,
              priority: bug.priority,
              status: bug.status,
              bugType: bug.type || 'BUG',
              rootCause: '',
              stepsToReproduce: bug.stepsToReproduce || '',
            }
          );
          syncedNodes++;

          // Create bug-testcase relationship (FOUND_BY)
          if (options.includeRelationships !== false && bug.testResult?.testRunCase?.testCase) {
            await writeQuery(
              `
              MATCH (b:Bug {sourceId: $bugId})
              MATCH (tc:TestCase {sourceId: $tcId})
              MERGE (b)-[r:FOUND_BY]->(tc)
              SET r.createdAt = datetime()
              RETURN r
              `,
              {
                bugId: bug.id,
                tcId: bug.testResult.testRunCase.testCase.id,
              }
            );
            syncedRelationships++;
          }
        } catch (error) {
          errors.push(`Failed to sync bug ${bug.id}: ${error}`);
        }
      }

      offset += batchSize;
    }

    return {
      success: errors.length === 0,
      syncedNodes,
      syncedRelationships,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      syncedNodes,
      syncedRelationships,
      errors: [...errors, `Sync failed: ${error}`],
      duration: Date.now() - startTime,
    };
  }
}

// ========================================
// Similar Test Cases
// ========================================

/**
 * 類似テストケースの関連付け
 * タグやタイトルの類似性に基づいて関連付けを作成
 */
export async function createSimilarTestCaseRelationships(
  options: SyncOptions = {}
): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let syncedRelationships = 0;

  try {
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return {
        success: false,
        syncedNodes: 0,
        syncedRelationships: 0,
        errors: ['Neo4j connection failed'],
        duration: Date.now() - startTime,
      };
    }

    // Create SIMILAR_TO relationships based on shared tags
    const tagSimilarityResult = await writeQuery<{ count: number }>(
      `
      MATCH (tc1:TestCase)-[:TAGGED_WITH]->(tag:Tag)<-[:TAGGED_WITH]-(tc2:TestCase)
      WHERE tc1.sourceId < tc2.sourceId
      ${options.testSpecId ? 'AND tc1.testSpecId = $testSpecId AND tc2.testSpecId = $testSpecId' : ''}
      WITH tc1, tc2, count(tag) as sharedTags
      WHERE sharedTags >= 2
      MERGE (tc1)-[r:SIMILAR_TO]-(tc2)
      SET r.sharedTags = sharedTags,
          r.similarityType = 'TAG_BASED',
          r.createdAt = datetime()
      RETURN count(r) as count
      `,
      {
        testSpecId: options.testSpecId || null,
      }
    );

    if (tagSimilarityResult.length > 0) {
      syncedRelationships += tagSimilarityResult[0].count;
    }

    // Create SIMILAR_TO relationships based on same test type and priority
    const typeSimilarityResult = await writeQuery<{ count: number }>(
      `
      MATCH (tc1:TestCase), (tc2:TestCase)
      WHERE tc1.sourceId < tc2.sourceId
        AND tc1.testType = tc2.testType
        AND tc1.priority = tc2.priority
        AND tc1.testSpecId = tc2.testSpecId
        ${options.testSpecId ? 'AND tc1.testSpecId = $testSpecId' : ''}
        AND NOT (tc1)-[:SIMILAR_TO]-(tc2)
      WITH tc1, tc2
      LIMIT 1000
      MERGE (tc1)-[r:SIMILAR_TO]-(tc2)
      SET r.similarityType = 'TYPE_PRIORITY_BASED',
          r.createdAt = datetime()
      RETURN count(r) as count
      `,
      {
        testSpecId: options.testSpecId || null,
      }
    );

    if (typeSimilarityResult.length > 0) {
      syncedRelationships += typeSimilarityResult[0].count;
    }

    return {
      success: errors.length === 0,
      syncedNodes: 0,
      syncedRelationships,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      syncedNodes: 0,
      syncedRelationships,
      errors: [...errors, `Similarity creation failed: ${error}`],
      duration: Date.now() - startTime,
    };
  }
}

// ========================================
// Full Sync
// ========================================

/**
 * 全データの同期（バッチ処理）
 */
export async function fullSyncToGraph(options: SyncOptions = {}): Promise<{
  testCases: SyncResult;
  requirements: SyncResult;
  bugs: SyncResult;
  similarities: SyncResult;
  totalDuration: number;
}> {
  const startTime = Date.now();

  const syncOptions = { ...options, fullSync: true };

  // Sync in order: TestCases -> Requirements -> Bugs -> Similarities
  const testCasesResult = await syncTestCasesToGraph(syncOptions);
  const requirementsResult = await syncRequirementsToGraph(syncOptions);
  const bugsResult = await syncBugsToGraph(syncOptions);
  const similaritiesResult = await createSimilarTestCaseRelationships(syncOptions);

  return {
    testCases: testCasesResult,
    requirements: requirementsResult,
    bugs: bugsResult,
    similarities: similaritiesResult,
    totalDuration: Date.now() - startTime,
  };
}

// ========================================
// Real-time Sync Handlers
// ========================================

/**
 * 単一テストケースの同期（リアルタイム更新用）
 */
export async function syncSingleTestCase(testCaseId: string): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let syncedNodes = 0;
  let syncedRelationships = 0;

  try {
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return {
        success: false,
        syncedNodes: 0,
        syncedRelationships: 0,
        errors: ['Neo4j connection failed'],
        duration: Date.now() - startTime,
      };
    }

    const testCase = await prisma.testCase.findUnique({
      where: { id: BigInt(testCaseId) },
      include: {
        testSteps: true,
        testCaseTags: { include: { tag: true } },
      },
    });

    if (!testCase) {
      return {
        success: false,
        syncedNodes: 0,
        syncedRelationships: 0,
        errors: ['Test case not found'],
        duration: Date.now() - startTime,
      };
    }

    // Update or create TestCase node
    await writeQuery(
      `
      MERGE (tc:Knowledge:TestCase {sourceId: $sourceId})
      SET tc.type = 'TestCase',
          tc.category = 'TEST_ASSET',
          tc.title = $title,
          tc.description = $description,
          tc.testSpecId = $testSpecId,
          tc.priority = $priority,
          tc.testType = $testType,
          tc.preconditions = $preconditions,
          tc.status = $status,
          tc.tags = $tags,
          tc.updatedAt = datetime()
      ON CREATE SET tc.createdAt = datetime()
      RETURN tc
      `,
      {
        sourceId: testCase.id,
        title: testCase.title,
        description: testCase.description || '',
        testSpecId: testCase.testSpecId,
        priority: testCase.priority,
        testType: testCase.testType,
        preconditions: testCase.preconditions || '',
        status: 'ACTIVE',
        tags: testCase.testCaseTags.map((t) => t.tag.name),
      }
    );
    syncedNodes++;

    // Delete old steps and recreate
    await writeQuery(
      `
      MATCH (tc:TestCase {sourceId: $testCaseId})-[r:HAS_STEP]->(ts:TestStep)
      DETACH DELETE ts
      `,
      { testCaseId: testCase.id }
    );

    // Create TestStep nodes
    for (const step of testCase.testSteps) {
      await writeQuery(
        `
        MERGE (ts:Knowledge:TestStep {sourceId: $sourceId})
        SET ts.type = 'TestStep',
            ts.category = 'TEST_ASSET',
            ts.title = $title,
            ts.testCaseId = $testCaseId,
            ts.stepNo = $stepNo,
            ts.action = $action,
            ts.expectedResult = $expectedResult,
            ts.updatedAt = datetime()
        ON CREATE SET ts.createdAt = datetime()
        RETURN ts
        `,
        {
          sourceId: step.id,
          title: `Step ${step.stepNo}: ${step.actionMd?.substring(0, 50) || ''}`,
          testCaseId: testCase.id,
          stepNo: step.stepNo,
          action: step.actionMd || '',
          expectedResult: step.expectedMd || '',
        }
      );
      syncedNodes++;

      await writeQuery(
        `
        MATCH (tc:TestCase {sourceId: $testCaseId})
        MATCH (ts:TestStep {sourceId: $stepId})
        MERGE (tc)-[r:HAS_STEP]->(ts)
        SET r.stepNo = $stepNo
        RETURN r
        `,
        {
          testCaseId: testCase.id,
          stepId: step.id,
          stepNo: step.stepNo,
        }
      );
      syncedRelationships++;
    }

    return {
      success: true,
      syncedNodes,
      syncedRelationships,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      syncedNodes,
      syncedRelationships,
      errors: [`Failed to sync test case: ${error}`],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 単一バグの同期（リアルタイム更新用）
 */
export async function syncSingleBug(bugId: string): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let syncedNodes = 0;
  let syncedRelationships = 0;

  try {
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return {
        success: false,
        syncedNodes: 0,
        syncedRelationships: 0,
        errors: ['Neo4j connection failed'],
        duration: Date.now() - startTime,
      };
    }

    const bug = await prisma.bug.findUnique({
      where: { id: BigInt(bugId) },
      include: {
        testResult: {
          include: {
            testRunCase: {
              include: { testCase: true },
            },
          },
        },
      },
    });

    if (!bug) {
      return {
        success: false,
        syncedNodes: 0,
        syncedRelationships: 0,
        errors: ['Bug not found'],
        duration: Date.now() - startTime,
      };
    }

    await writeQuery(
      `
      MERGE (b:Knowledge:Bug {sourceId: $sourceId})
      SET b.type = 'Bug',
          b.category = 'DEFECT',
          b.title = $title,
          b.description = $description,
          b.bugId = $bugId,
          b.severity = $severity,
          b.priority = $priority,
          b.status = $status,
          b.bugType = $bugType,
          b.rootCause = $rootCause,
          b.stepsToReproduce = $stepsToReproduce,
          b.updatedAt = datetime()
      ON CREATE SET b.createdAt = datetime()
      RETURN b
      `,
      {
        sourceId: bug.id,
        title: bug.title,
        description: bug.description || '',
        bugId: bug.id,
        severity: bug.severity,
        priority: bug.priority,
        status: bug.status,
        bugType: bug.type || 'BUG',
        rootCause: '',
        stepsToReproduce: bug.stepsToReproduce || '',
      }
    );
    syncedNodes++;

    // Update FOUND_BY relationship
    if (bug.testResult?.testRunCase?.testCase) {
      await writeQuery(
        `
        MATCH (b:Bug {sourceId: $bugId})
        MATCH (tc:TestCase {sourceId: $tcId})
        MERGE (b)-[r:FOUND_BY]->(tc)
        SET r.createdAt = datetime()
        RETURN r
        `,
        {
          bugId: bug.id,
          tcId: bug.testResult.testRunCase.testCase.id,
        }
      );
      syncedRelationships++;
    }

    return {
      success: true,
      syncedNodes,
      syncedRelationships,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      syncedNodes,
      syncedRelationships,
      errors: [`Failed to sync bug: ${error}`],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * ノードの削除（リアルタイム削除用）
 */
export async function deleteNodeFromGraph(
  sourceId: string,
  nodeType: 'TestCase' | 'Bug' | 'Requirement'
): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return {
        success: false,
        syncedNodes: 0,
        syncedRelationships: 0,
        errors: ['Neo4j connection failed'],
        duration: Date.now() - startTime,
      };
    }

    // Delete node and all its relationships
    const result = await writeQuery<{ deleted: number }>(
      `
      MATCH (n:${nodeType} {sourceId: $sourceId})
      OPTIONAL MATCH (n)-[r]-()
      WITH n, count(r) as relCount
      DETACH DELETE n
      RETURN 1 as deleted
      `,
      { sourceId }
    );

    return {
      success: true,
      syncedNodes: result.length > 0 ? -1 : 0,
      syncedRelationships: 0,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      syncedNodes: 0,
      syncedRelationships: 0,
      errors: [`Failed to delete node: ${error}`],
      duration: Date.now() - startTime,
    };
  }
}
