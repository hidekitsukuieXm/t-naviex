/**
 * Test Case Versions API
 *
 * GET /api/test-cases/[testCaseId]/versions - バージョン一覧取得
 * POST /api/test-cases/[testCaseId]/versions - 新しいバージョンを作成
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTestCaseVersions,
  createTestCaseVersion,
} from '@/repositories/test-case-version-repository';

type RouteParams = {
  params: Promise<{ testCaseId: string }>;
};

/**
 * GET: バージョン一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { testCaseId } = await params;
    const { searchParams } = new URL(request.url);
    const includeContent = searchParams.get('includeContent') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await getTestCaseVersions(testCaseId, {
      includeContent,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get test case versions:', error);
    return NextResponse.json({ error: 'バージョン一覧の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST: 新しいバージョンを作成
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { testCaseId } = await params;
    const body = await request.json();
    const { changeNote, userId } = body;

    const version = await createTestCaseVersion(testCaseId, userId, changeNote);

    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    console.error('Failed to create test case version:', error);
    return NextResponse.json({ error: 'バージョンの作成に失敗しました' }, { status: 500 });
  }
}
