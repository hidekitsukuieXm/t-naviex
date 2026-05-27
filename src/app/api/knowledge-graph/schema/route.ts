/**
 * Knowledge Graph Schema API
 *
 * GET  /api/knowledge-graph/schema - スキーマ情報取得
 * POST /api/knowledge-graph/schema - スキーマ初期化
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NODE_LABELS, RELATIONSHIP_TYPES, initializeSchema } from '@/lib/knowledge-graph-schema';
import { verifyConnection, getSession } from '@/lib/neo4j';

/**
 * GET /api/knowledge-graph/schema
 * スキーマ情報を取得
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        {
          connected: false,
          error: 'Neo4j is not connected',
          nodeLabels: Object.values(NODE_LABELS),
          relationshipTypes: Object.values(RELATIONSHIP_TYPES),
        },
        { status: 503 }
      );
    }

    // Get existing indexes and constraints
    const neo4jSession = getSession();
    try {
      const indexResult = await neo4jSession.run('SHOW INDEXES');
      const constraintResult = await neo4jSession.run('SHOW CONSTRAINTS');

      const indexes = indexResult.records.map((record) => ({
        name: record.get('name'),
        type: record.get('type'),
        entityType: record.get('entityType'),
        labelsOrTypes: record.get('labelsOrTypes'),
        properties: record.get('properties'),
        state: record.get('state'),
      }));

      const constraints = constraintResult.records.map((record) => ({
        name: record.get('name'),
        type: record.get('type'),
        entityType: record.get('entityType'),
        labelsOrTypes: record.get('labelsOrTypes'),
        properties: record.get('properties'),
      }));

      return NextResponse.json({
        connected: true,
        schema: {
          nodeLabels: Object.values(NODE_LABELS),
          relationshipTypes: Object.values(RELATIONSHIP_TYPES),
          indexes,
          constraints,
        },
      });
    } finally {
      await neo4jSession.close();
    }
  } catch (error) {
    console.error('Failed to get schema info:', error);
    return NextResponse.json({ error: 'Failed to get schema info' }, { status: 500 });
  }
}

/**
 * POST /api/knowledge-graph/schema
 * スキーマを初期化
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check connection first
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json({ error: 'Neo4j is not connected' }, { status: 503 });
    }

    // Initialize schema
    await initializeSchema();

    return NextResponse.json({
      success: true,
      message: 'Schema initialized successfully',
    });
  } catch (error) {
    console.error('Failed to initialize schema:', error);
    return NextResponse.json({ error: 'Failed to initialize schema' }, { status: 500 });
  }
}
