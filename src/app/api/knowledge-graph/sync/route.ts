/**
 * Knowledge Graph Sync API
 *
 * POST /api/knowledge-graph/sync - データ同期実行
 * GET  /api/knowledge-graph/sync - 同期ステータス取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  fullSyncToGraph,
  syncTestCasesToGraph,
  syncRequirementsToGraph,
  syncBugsToGraph,
  createSimilarTestCaseRelationships,
  type SyncOptions,
} from '@/services/graph/test-data-sync-service';
import { verifyConnection } from '@/lib/neo4j';

/**
 * GET /api/knowledge-graph/sync
 * 同期ステータスを取得
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const isConnected = await verifyConnection();

    return NextResponse.json({
      connected: isConnected,
      status: isConnected ? 'ready' : 'disconnected',
      message: isConnected ? 'Ready to sync' : 'Neo4j is not connected',
    });
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 });
  }
}

/**
 * POST /api/knowledge-graph/sync
 * データ同期を実行
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { syncType = 'full', projectId, testSpecId, batchSize = 100 } = body;

    const options: SyncOptions = {
      projectId,
      testSpecId,
      batchSize,
      includeRelationships: true,
    };

    let result;

    switch (syncType) {
      case 'testCases':
        result = {
          testCases: await syncTestCasesToGraph(options),
        };
        break;

      case 'requirements':
        result = {
          requirements: await syncRequirementsToGraph(options),
        };
        break;

      case 'bugs':
        result = {
          bugs: await syncBugsToGraph(options),
        };
        break;

      case 'similarities':
        result = {
          similarities: await createSimilarTestCaseRelationships(options),
        };
        break;

      case 'full':
      default:
        result = await fullSyncToGraph(options);
        break;
    }

    return NextResponse.json({
      success: true,
      syncType,
      result,
    });
  } catch (error) {
    console.error('Sync failed:', error);
    return NextResponse.json({ error: 'Sync failed', details: String(error) }, { status: 500 });
  }
}
