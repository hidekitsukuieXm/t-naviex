import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateTestParameter, type UpdateTestParameterData } from '@/types/test-parameter';
import { logAudit } from '@/lib/audit';

type Params = { params: Promise<{ id: string; parameterId: string }> };

// GET /api/test-cases/[id]/parameters/[parameterId] - テストパラメーター詳細取得
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { parameterId } = await params;
    const paramId = BigInt(parameterId);

    const parameter = await prisma.testParameter.findUnique({
      where: { id: paramId },
    });

    if (!parameter) {
      return NextResponse.json({ error: 'テストパラメーターが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json({
      id: parameter.id.toString(),
      testCaseId: parameter.testCaseId.toString(),
      name: parameter.name,
      description: parameter.description,
      values: parameter.values,
      isRequired: parameter.isRequired,
      sortOrder: parameter.sortOrder,
      createdAt: parameter.createdAt.toISOString(),
      updatedAt: parameter.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Get test parameter error:', error);
    return NextResponse.json(
      { error: 'テストパラメーターの取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// PUT /api/test-cases/[id]/parameters/[parameterId] - テストパラメーター更新
export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, parameterId } = await params;
    const testCaseId = BigInt(id);
    const paramId = BigInt(parameterId);

    const body: UpdateTestParameterData = await request.json();

    // バリデーション
    const validation = validateTestParameter(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    const existing = await prisma.testParameter.findUnique({
      where: { id: paramId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'テストパラメーターが見つかりません。' }, { status: 404 });
    }

    // 名前変更時の重複チェック
    if (body.name && body.name !== existing.name) {
      const duplicate = await prisma.testParameter.findUnique({
        where: {
          testCaseId_name: {
            testCaseId,
            name: body.name,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'このパラメーター名は既に使用されています。' },
          { status: 400 }
        );
      }
    }

    const parameter = await prisma.testParameter.update({
      where: { id: paramId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.values !== undefined && { values: body.values }),
        ...(body.isRequired !== undefined && { isRequired: body.isRequired }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    // 監査ログを記録
    await logAudit({
      userId: session.user.id,
      action: 'TEST_PARAMETER_UPDATE',
      targetType: 'TEST_PARAMETER',
      targetId: parameter.id.toString(),
      details: { testCaseId: id, name: parameter.name },
    });

    return NextResponse.json({
      id: parameter.id.toString(),
      testCaseId: parameter.testCaseId.toString(),
      name: parameter.name,
      description: parameter.description,
      values: parameter.values,
      isRequired: parameter.isRequired,
      sortOrder: parameter.sortOrder,
      createdAt: parameter.createdAt.toISOString(),
      updatedAt: parameter.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Update test parameter error:', error);
    return NextResponse.json(
      { error: 'テストパラメーターの更新に失敗しました。' },
      { status: 500 }
    );
  }
}

// DELETE /api/test-cases/[id]/parameters/[parameterId] - テストパラメーター削除
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, parameterId } = await params;
    const paramId = BigInt(parameterId);

    const existing = await prisma.testParameter.findUnique({
      where: { id: paramId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'テストパラメーターが見つかりません。' }, { status: 404 });
    }

    await prisma.testParameter.delete({
      where: { id: paramId },
    });

    // 監査ログを記録
    await logAudit({
      userId: session.user.id,
      action: 'TEST_PARAMETER_DELETE',
      targetType: 'TEST_PARAMETER',
      targetId: parameterId,
      details: { testCaseId: id, name: existing.name },
    });

    return NextResponse.json({ message: 'テストパラメーターを削除しました。' });
  } catch (error) {
    console.error('Delete test parameter error:', error);
    return NextResponse.json(
      { error: 'テストパラメーターの削除に失敗しました。' },
      { status: 500 }
    );
  }
}
