/**
 * 要求仕様とテストケースの紐付け API
 * GET /api/projects/[id]/requirements/[requirementId]/test-cases - 紐付けられたテストケース一覧
 * POST /api/projects/[id]/requirements/[requirementId]/test-cases - テストケースを紐付け
 * DELETE /api/projects/[id]/requirements/[requirementId]/test-cases - テストケースの紐付けを解除
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getRequirementById,
  linkTestCaseToRequirement,
  unlinkTestCaseFromRequirement,
  getTestCasesByRequirement,
} from '@/repositories/requirement-repository';

interface RouteParams {
  params: Promise<{ id: string; requirementId: string }>;
}

// GET /api/projects/[id]/requirements/[requirementId]/test-cases
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, requirementId } = await params;
    const projectId = BigInt(id);
    const reqId = BigInt(requirementId);

    const requirement = await getRequirementById(reqId);

    if (!requirement || requirement.projectId !== projectId) {
      return NextResponse.json({ error: '要求仕様が見つかりません。' }, { status: 404 });
    }

    const testCases = await getTestCasesByRequirement(reqId);

    return NextResponse.json({
      testCases: testCases.map((tc) => ({
        testCaseId: tc.testCaseId.toString(),
        title: tc.title,
        testSpecId: tc.testSpecId.toString(),
      })),
    });
  } catch (error) {
    console.error('Get requirement test cases error:', error);
    return NextResponse.json({ error: 'テストケースの取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/requirements/[requirementId]/test-cases
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, requirementId } = await params;
    const projectId = BigInt(id);
    const reqId = BigInt(requirementId);

    const requirement = await getRequirementById(reqId);

    if (!requirement || requirement.projectId !== projectId) {
      return NextResponse.json({ error: '要求仕様が見つかりません。' }, { status: 404 });
    }

    const body = await request.json();
    const testCaseId = body.testCaseId;

    if (!testCaseId) {
      return NextResponse.json({ error: 'テストケースIDは必須です。' }, { status: 400 });
    }

    await linkTestCaseToRequirement(BigInt(testCaseId), reqId);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Link test case error:', error);
    return NextResponse.json({ error: 'テストケースの紐付けに失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/requirements/[requirementId]/test-cases
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, requirementId } = await params;
    const projectId = BigInt(id);
    const reqId = BigInt(requirementId);

    const requirement = await getRequirementById(reqId);

    if (!requirement || requirement.projectId !== projectId) {
      return NextResponse.json({ error: '要求仕様が見つかりません。' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const testCaseId = searchParams.get('testCaseId');

    if (!testCaseId) {
      return NextResponse.json({ error: 'テストケースIDは必須です。' }, { status: 400 });
    }

    await unlinkTestCaseFromRequirement(BigInt(testCaseId), reqId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unlink test case error:', error);
    return NextResponse.json(
      { error: 'テストケースの紐付け解除に失敗しました。' },
      { status: 500 }
    );
  }
}
