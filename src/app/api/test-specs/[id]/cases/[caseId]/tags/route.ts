import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTagsForTestCase,
  setTagsForTestCase,
  addTagToTestCase,
  removeTagFromTestCase,
} from '@/lib/repositories/tag-repository';
import { getTestSpecById } from '@/lib/repositories/test-spec-repository';
import { getTestCaseById } from '@/lib/repositories/test-case-repository';
import { logTestCaseUpdate } from '@/lib/audit';

// GET /api/test-specs/[id]/cases/[caseId]/tags - Get tags for a test case
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; caseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, caseId } = await params;
    const testSpecIdBigInt = BigInt(testSpecId);
    const caseIdBigInt = BigInt(caseId);

    // Check test spec exists
    const testSpec = await getTestSpecById(testSpecIdBigInt);
    if (!testSpec) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    // Check test case exists
    const testCase = await getTestCaseById(caseIdBigInt);
    if (!testCase || testCase.testSpecId.toString() !== testSpecId) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    // Get tags
    const tags = await getTagsForTestCase(caseId);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Error fetching test case tags:', error);
    return NextResponse.json({ error: 'タグの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/test-specs/[id]/cases/[caseId]/tags - Set tags for a test case
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; caseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, caseId } = await params;
    const testSpecIdBigInt = BigInt(testSpecId);
    const caseIdBigInt = BigInt(caseId);

    // Check test spec exists
    const testSpec = await getTestSpecById(testSpecIdBigInt);
    if (!testSpec) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    // Check if test spec is locked
    if (testSpec.isLocked) {
      return NextResponse.json({ error: 'テスト仕様書はロックされています。' }, { status: 403 });
    }

    // Check test case exists
    const testCase = await getTestCaseById(caseIdBigInt);
    if (!testCase || testCase.testSpecId.toString() !== testSpecId) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();
    const tagIds = body.tagIds;

    if (!Array.isArray(tagIds)) {
      return NextResponse.json({ error: 'tagIdsは配列で指定してください。' }, { status: 400 });
    }

    // Set tags
    const tags = await setTagsForTestCase(caseId, tagIds);

    // Audit log
    await logTestCaseUpdate(session.user.id, caseIdBigInt, {
      action: 'tags_updated',
      tagIds,
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Error setting test case tags:', error);
    return NextResponse.json({ error: 'タグの設定に失敗しました。' }, { status: 500 });
  }
}

// POST /api/test-specs/[id]/cases/[caseId]/tags - Add a tag to a test case
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; caseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, caseId } = await params;
    const testSpecIdBigInt = BigInt(testSpecId);
    const caseIdBigInt = BigInt(caseId);

    // Check test spec exists
    const testSpec = await getTestSpecById(testSpecIdBigInt);
    if (!testSpec) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    // Check if test spec is locked
    if (testSpec.isLocked) {
      return NextResponse.json({ error: 'テスト仕様書はロックされています。' }, { status: 403 });
    }

    // Check test case exists
    const testCase = await getTestCaseById(caseIdBigInt);
    if (!testCase || testCase.testSpecId.toString() !== testSpecId) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();
    const tagId = body.tagId;

    if (!tagId) {
      return NextResponse.json({ error: 'tagIdは必須です。' }, { status: 400 });
    }

    // Add tag
    const tag = await addTagToTestCase(caseId, tagId);
    if (!tag) {
      return NextResponse.json({ error: 'タグの追加に失敗しました。' }, { status: 500 });
    }

    // Audit log
    await logTestCaseUpdate(session.user.id, caseIdBigInt, {
      action: 'tag_added',
      tagId,
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error('Error adding test case tag:', error);
    return NextResponse.json({ error: 'タグの追加に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/test-specs/[id]/cases/[caseId]/tags - Remove a tag from a test case
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; caseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, caseId } = await params;
    const testSpecIdBigInt = BigInt(testSpecId);
    const caseIdBigInt = BigInt(caseId);

    // Check test spec exists
    const testSpec = await getTestSpecById(testSpecIdBigInt);
    if (!testSpec) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    // Check if test spec is locked
    if (testSpec.isLocked) {
      return NextResponse.json({ error: 'テスト仕様書はロックされています。' }, { status: 403 });
    }

    // Check test case exists
    const testCase = await getTestCaseById(caseIdBigInt);
    if (!testCase || testCase.testSpecId.toString() !== testSpecId) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    if (!tagId) {
      return NextResponse.json({ error: 'tagIdは必須です。' }, { status: 400 });
    }

    // Remove tag
    const result = await removeTagFromTestCase(caseId, tagId);
    if (!result.success) {
      return NextResponse.json({ error: 'タグの削除に失敗しました。' }, { status: 500 });
    }

    // Audit log
    await logTestCaseUpdate(session.user.id, caseIdBigInt, {
      action: 'tag_removed',
      tagId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing test case tag:', error);
    return NextResponse.json({ error: 'タグの削除に失敗しました。' }, { status: 500 });
  }
}
