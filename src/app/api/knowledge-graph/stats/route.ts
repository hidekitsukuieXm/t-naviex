/**
 * Knowledge Graph Statistics API
 *
 * GET /api/knowledge-graph/stats - グラフ統計情報取得
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyConnection, getSession } from '@/lib/neo4j';

/**
 * GET /api/knowledge-graph/stats
 * グラフ統計情報を取得
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
        { error: 'Neo4j is not connected', connected: false },
        { status: 503 }
      );
    }

    const neo4jSession = getSession();
    try {
      // Get node statistics
      const nodeStatsResult = await neo4jSession.run(`
        MATCH (n)
        WITH labels(n) as nodeLabels, count(n) as count
        UNWIND nodeLabels as label
        RETURN label, sum(count) as totalCount
        ORDER BY totalCount DESC
      `);

      const nodeStats = nodeStatsResult.records.map((record) => ({
        label: record.get('label'),
        count: record.get('totalCount').toNumber(),
      }));

      // Get relationship statistics
      const relStatsResult = await neo4jSession.run(`
        MATCH ()-[r]->()
        RETURN type(r) as type, count(r) as count
        ORDER BY count DESC
      `);

      const relationshipStats = relStatsResult.records.map((record) => ({
        type: record.get('type'),
        count: record.get('count').toNumber(),
      }));

      // Get total counts
      const totalNodesResult = await neo4jSession.run('MATCH (n) RETURN count(n) as total');
      const totalRelsResult = await neo4jSession.run('MATCH ()-[r]->() RETURN count(r) as total');

      const totalNodes = totalNodesResult.records[0].get('total').toNumber();
      const totalRelationships = totalRelsResult.records[0].get('total').toNumber();

      // Get database size info (if available)
      let databaseInfo = null;
      try {
        const dbInfoResult = await neo4jSession.run('CALL dbms.components()');
        if (dbInfoResult.records.length > 0) {
          const record = dbInfoResult.records[0];
          databaseInfo = {
            name: record.get('name'),
            version: record.get('versions')[0],
            edition: record.get('edition'),
          };
        }
      } catch {
        // Database info may not be available
      }

      return NextResponse.json({
        connected: true,
        stats: {
          totalNodes,
          totalRelationships,
          nodesByLabel: nodeStats,
          relationshipsByType: relationshipStats,
          databaseInfo,
        },
      });
    } finally {
      await neo4jSession.close();
    }
  } catch (error) {
    console.error('Failed to get graph stats:', error);
    return NextResponse.json({ error: 'Failed to get graph statistics' }, { status: 500 });
  }
}
