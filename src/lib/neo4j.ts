/**
 * Neo4j Graph Database Client
 *
 * Graph RAGのためのNeo4j接続クライアント
 */

import neo4j, { Driver, Session, Transaction, Result, Integer } from 'neo4j-driver';

// Environment variables for Neo4j connection
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'neo4j_password';

// Singleton driver instance
let driver: Driver | null = null;

/**
 * Get or create Neo4j driver instance
 */
export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 30000,
      maxTransactionRetryTime: 30000,
      logging: {
        level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
        logger: (level, message) => {
          const logFn =
            level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
          logFn(`[Neo4j ${level}] ${message}`);
        },
      },
    });
  }
  return driver;
}

/**
 * Close the Neo4j driver connection
 */
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

/**
 * Get a new session
 */
export function getSession(database?: string): Session {
  return getDriver().session({
    database: database || process.env.NEO4J_DATABASE || 'neo4j',
  });
}

/**
 * Execute a read query
 */
export async function readQuery<T>(cypher: string, params?: Record<string, unknown>): Promise<T[]> {
  const session = getSession();
  try {
    const result = await session.executeRead((tx: Transaction) => tx.run(cypher, params));
    return result.records.map((record) => recordToObject<T>(record));
  } finally {
    await session.close();
  }
}

/**
 * Execute a write query
 */
export async function writeQuery<T>(
  cypher: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const session = getSession();
  try {
    const result = await session.executeWrite((tx: Transaction) => tx.run(cypher, params));
    return result.records.map((record) => recordToObject<T>(record));
  } finally {
    await session.close();
  }
}

/**
 * Execute multiple queries in a transaction
 */
export async function runInTransaction<T>(
  queries: Array<{ cypher: string; params?: Record<string, unknown> }>
): Promise<T[][]> {
  const session = getSession();
  try {
    return await session.executeWrite(async (tx: Transaction) => {
      const results: T[][] = [];
      for (const query of queries) {
        const result = await tx.run(query.cypher, query.params);
        results.push(result.records.map((record) => recordToObject<T>(record)));
      }
      return results;
    });
  } finally {
    await session.close();
  }
}

/**
 * Convert a Neo4j record to a plain JavaScript object
 */
function recordToObject<T>(record: { keys: string[]; get: (key: string) => unknown }): T {
  const obj: Record<string, unknown> = {};
  for (const key of record.keys) {
    obj[key] = convertNeo4jValue(record.get(key));
  }
  return obj as T;
}

/**
 * Convert Neo4j values to JavaScript values
 */
function convertNeo4jValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle Neo4j Integer
  if (neo4j.isInt(value)) {
    return (value as Integer).toNumber();
  }

  // Handle Neo4j Date/DateTime/Time
  if (neo4j.isDate(value) || neo4j.isDateTime(value) || neo4j.isLocalDateTime(value)) {
    return new Date((value as { toString: () => string }).toString());
  }

  // Handle Neo4j Node
  if (isNode(value)) {
    return {
      id: (value.identity as Integer).toNumber(),
      labels: value.labels,
      properties: convertProperties(value.properties),
    };
  }

  // Handle Neo4j Relationship
  if (isRelationship(value)) {
    return {
      id: (value.identity as Integer).toNumber(),
      type: value.type,
      startNodeId: (value.start as Integer).toNumber(),
      endNodeId: (value.end as Integer).toNumber(),
      properties: convertProperties(value.properties),
    };
  }

  // Handle Neo4j Path
  if (isPath(value)) {
    return {
      start: convertNeo4jValue(value.start),
      end: convertNeo4jValue(value.end),
      segments: value.segments.map((segment) => ({
        start: convertNeo4jValue(segment.start),
        relationship: convertNeo4jValue(segment.relationship),
        end: convertNeo4jValue(segment.end),
      })),
    };
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(convertNeo4jValue);
  }

  // Handle plain objects
  if (typeof value === 'object') {
    return convertProperties(value as Record<string, unknown>);
  }

  return value;
}

/**
 * Convert Neo4j properties object
 */
function convertProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    result[key] = convertNeo4jValue(value);
  }
  return result;
}

/**
 * Type guard for Neo4j Node
 */
function isNode(value: unknown): value is {
  identity: Integer;
  labels: string[];
  properties: Record<string, unknown>;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'identity' in value &&
    'labels' in value &&
    'properties' in value
  );
}

/**
 * Type guard for Neo4j Relationship
 */
function isRelationship(value: unknown): value is {
  identity: Integer;
  type: string;
  start: Integer;
  end: Integer;
  properties: Record<string, unknown>;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'identity' in value &&
    'type' in value &&
    'start' in value &&
    'end' in value &&
    'properties' in value
  );
}

/**
 * Type guard for Neo4j Path
 */
function isPath(value: unknown): value is {
  start: unknown;
  end: unknown;
  segments: Array<{
    start: unknown;
    relationship: unknown;
    end: unknown;
  }>;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'start' in value &&
    'end' in value &&
    'segments' in value
  );
}

/**
 * Verify connection to Neo4j
 */
export async function verifyConnection(): Promise<boolean> {
  const session = getSession();
  try {
    const result = await session.run('RETURN 1 as n');
    return result.records.length > 0;
  } catch (error) {
    console.error('Neo4j connection verification failed:', error);
    return false;
  } finally {
    await session.close();
  }
}

/**
 * Get database information
 */
export async function getDatabaseInfo(): Promise<{
  version: string;
  edition: string;
  databases: string[];
}> {
  const session = getSession();
  try {
    const result = await session.run('CALL dbms.components()');
    const component = result.records[0];

    const dbResult = await session.run('SHOW DATABASES');
    const databases = dbResult.records.map((r) => r.get('name') as string);

    return {
      version: component.get('versions')[0] as string,
      edition: component.get('edition') as string,
      databases,
    };
  } finally {
    await session.close();
  }
}

/**
 * Create indexes for common queries
 */
export async function createIndexes(): Promise<void> {
  const indexes = [
    // Knowledge nodes index
    'CREATE INDEX knowledge_node_type IF NOT EXISTS FOR (n:Knowledge) ON (n.type)',
    'CREATE INDEX knowledge_node_category IF NOT EXISTS FOR (n:Knowledge) ON (n.category)',
    'CREATE INDEX knowledge_node_source IF NOT EXISTS FOR (n:Knowledge) ON (n.sourceId)',

    // Test case nodes index
    'CREATE INDEX test_case_id IF NOT EXISTS FOR (n:TestCase) ON (n.testCaseId)',
    'CREATE INDEX test_case_title IF NOT EXISTS FOR (n:TestCase) ON (n.title)',

    // Bug nodes index
    'CREATE INDEX bug_id IF NOT EXISTS FOR (n:Bug) ON (n.bugId)',

    // Best practice nodes index
    'CREATE INDEX best_practice_category IF NOT EXISTS FOR (n:BestPractice) ON (n.category)',

    // Fulltext index for search
    'CREATE FULLTEXT INDEX knowledge_fulltext IF NOT EXISTS FOR (n:Knowledge) ON EACH [n.title, n.content, n.description]',
  ];

  const session = getSession();
  try {
    for (const index of indexes) {
      try {
        await session.run(index);
      } catch {
        // Index might already exist, log and continue
        console.log(`Index creation skipped (may already exist): ${index}`);
      }
    }
  } finally {
    await session.close();
  }
}

/**
 * Clear all data (use with caution!)
 */
export async function clearAllData(): Promise<void> {
  const session = getSession();
  try {
    await session.run('MATCH (n) DETACH DELETE n');
  } finally {
    await session.close();
  }
}

// Export types
export type { Driver, Session, Transaction, Result };
export { neo4j };
