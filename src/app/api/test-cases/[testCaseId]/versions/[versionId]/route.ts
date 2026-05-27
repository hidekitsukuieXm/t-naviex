/**
 * Test Case Version Detail API
 *
 * GET /api/test-cases/[testCaseId]/versions/[versionId] - バージョン詳細取得
 * DELETE /api/test-cases/[testCaseId]/versions/[versionId] - バージョン削除
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTestCaseVersion,
  deleteTestCaseVersion,
} from '@/repositories/test-case-version-repository';

type RouteParams = {
  params: Promise<{ testCaseId: string; versionId: string }>;
};

/**
 * GET: バージョン詳細を取得
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { versionId } = await params;

    const version = await getTestCaseVersion(versionId);

    if (!version) {
      return NextResponse.json({ error: 'バージョンが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(version);
  } catch (error) {
    console.error('Failed to get test case version:', error);
    return NextResponse.json({ error: 'バージョンの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE: バージョンを削除（最新バージョン以外）
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { versionId } = await params;

    const deleted = await deleteTestCaseVersion(versionId);

    if (!deleted) {
      return NextResponse.json({ error: 'バージョンが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete test case version:', error);
    const message = error instanceof Error ? error.message : 'バージョンの削除に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
