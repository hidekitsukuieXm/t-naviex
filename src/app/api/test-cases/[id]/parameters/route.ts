import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  validateTestParameter,
  type TestParameter,
  type CreateTestParameterData,
} from '@/types/test-parameter';
import { logAudit } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

// GET /api/test-cases/[id]/parameters - テストパラメーター一覧取得
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const testCaseId = BigInt(id);

    const parameters = await prisma.testParameter.findMany({
      where: { testCaseId },
      orderBy: { sortOrder: 'asc' },
    });

    const serialized: TestParameter[] = parameters.map((param) => ({
      id: param.id.toString(),
      testCaseId: param.testCaseId.toString(),
      name: param.name,
      description: param.description,
      values: param.values,
      isRequired: param.isRequired,
      sortOrder: param.sortOrder,
      createdAt: param.createdAt.toISOString(),
      updatedAt: param.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      parameters: serialized,
      total: serialized.length,
    });
  } catch (error) {
    console.error('Get test parameters error:', error);
    return NextResponse.json(
      { error: 'テストパラメーター一覧の取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// POST /api/test-cases/[id]/parameters - テストパラメーター作成
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const testCaseId = BigInt(id);

    const body: CreateTestParameterData = await request.json();

    // バリデーション
    const validation = validateTestParameter(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // テストケース存在確認
    const testCase = await prisma.testCase.findUnique({
      where: { id: testCaseId },
    });

    if (!testCase) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    // 同名パラメーターの重複チェック
    const existing = await prisma.testParameter.findUnique({
      where: {
        testCaseId_name: {
          testCaseId,
          name: body.name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'このパラメーター名は既に使用されています。' },
        { status: 400 }
      );
    }

    const parameter = await prisma.testParameter.create({
      data: {
        testCaseId,
        name: body.name,
        description: body.description ?? null,
        values: body.values ?? [],
        isRequired: body.isRequired ?? false,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    // 監査ログを記録
    await logAudit({
      userId: session.user.id,
      action: 'TEST_PARAMETER_CREATE',
      targetType: 'TEST_PARAMETER',
      targetId: parameter.id.toString(),
      details: { testCaseId: id, name: parameter.name },
    });

    return NextResponse.json(
      {
        id: parameter.id.toString(),
        testCaseId: parameter.testCaseId.toString(),
        name: parameter.name,
        description: parameter.description,
        values: parameter.values,
        isRequired: parameter.isRequired,
        sortOrder: parameter.sortOrder,
        createdAt: parameter.createdAt.toISOString(),
        updatedAt: parameter.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create test parameter error:', error);
    return NextResponse.json(
      { error: 'テストパラメーターの作成に失敗しました。' },
      { status: 500 }
    );
  }
}
