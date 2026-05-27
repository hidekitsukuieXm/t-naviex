/**
 * Test Case Version Restore API
 *
 * POST /api/test-cases/[testCaseId]/versions/[versionId]/restore - バージョンを復元
 */

import { NextRequest, NextResponse } from 'next/server';
import { restoreTestCaseVersion } from '@/repositories/test-case-version-repository';

type RouteParams = {
  params: Promise<{ testCaseId: string; versionId: string }>;
};

/**
 * POST: バージョンを復元
 *
 * Body:
 * - createNewVersion: boolean - 復元後に新しいバージョンを作成するか
 * - changeNote: string - 変更メモ
 * - userId: string - ユーザーID
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { versionId } = await params;
    const body = await request.json();
    const { createNewVersion, changeNote, userId } = body;

    const result = await restoreTestCaseVersion(versionId, userId, {
      createNewVersion,
      changeNote,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to restore test case version:', error);
    const message = error instanceof Error ? error.message : 'バージョンの復元に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
