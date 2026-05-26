/**
 * 要求仕様詳細・更新・削除 API
 * GET /api/projects/[id]/requirements/[requirementId] - 詳細取得
 * PUT /api/projects/[id]/requirements/[requirementId] - 更新
 * DELETE /api/projects/[id]/requirements/[requirementId] - 削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getRequirementById,
  updateRequirement,
  deleteRequirement,
  requirementCodeExists,
} from '@/repositories/requirement-repository';
import { validateUpdateRequirement, toRequirementSafe } from '@/types/requirement';

interface RouteParams {
  params: Promise<{ id: string; requirementId: string }>;
}

// GET /api/projects/[id]/requirements/[requirementId]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { requirementId } = await params;
    const id = BigInt(requirementId);

    const requirement = await getRequirementById(id);

    if (!requirement) {
      return NextResponse.json({ error: '要求仕様が見つかりません。' }, { status: 404 });
    }

    const safeRequirement = toRequirementSafe(requirement);

    return NextResponse.json(safeRequirement);
  } catch (error) {
    console.error('Get requirement error:', error);
    return NextResponse.json({ error: '要求仕様の取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/projects/[id]/requirements/[requirementId]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, requirementId } = await params;
    const projectId = BigInt(id);
    const reqId = BigInt(requirementId);

    const existingRequirement = await getRequirementById(reqId);

    if (!existingRequirement) {
      return NextResponse.json({ error: '要求仕様が見つかりません。' }, { status: 404 });
    }

    if (existingRequirement.projectId !== projectId) {
      return NextResponse.json({ error: '要求仕様が見つかりません。' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateUpdateRequirement(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    // Check for duplicate code (if code is being updated)
    if (validation.data.code && validation.data.code !== existingRequirement.code) {
      const codeExists = await requirementCodeExists(projectId, validation.data.code, reqId);
      if (codeExists) {
        return NextResponse.json({ error: 'このコードは既に使用されています。' }, { status: 400 });
      }
    }

    // Prevent circular parent reference
    if (validation.data.parentId !== undefined) {
      if (validation.data.parentId === reqId) {
        return NextResponse.json(
          { error: '自身を親として設定することはできません。' },
          { status: 400 }
        );
      }
    }

    const requirement = await updateRequirement(reqId, validation.data, BigInt(session.user.id));

    const safeRequirement = toRequirementSafe(requirement);

    return NextResponse.json(safeRequirement);
  } catch (error) {
    console.error('Update requirement error:', error);
    return NextResponse.json({ error: '要求仕様の更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/requirements/[requirementId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, requirementId } = await params;
    const projectId = BigInt(id);
    const reqId = BigInt(requirementId);

    const existingRequirement = await getRequirementById(reqId);

    if (!existingRequirement) {
      return NextResponse.json({ error: '要求仕様が見つかりません。' }, { status: 404 });
    }

    if (existingRequirement.projectId !== projectId) {
      return NextResponse.json({ error: '要求仕様が見つかりません。' }, { status: 404 });
    }

    await deleteRequirement(reqId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete requirement error:', error);
    return NextResponse.json({ error: '要求仕様の削除に失敗しました。' }, { status: 500 });
  }
}
