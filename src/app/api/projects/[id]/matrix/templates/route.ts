/**
 * Matrix Templates API
 *
 * マトリクステンプレートの一覧取得・作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { MatrixAxisType, MatrixCellValue } from '@/generated/prisma';
import { findMatrixTemplates, createMatrixTemplate } from '@/repositories/matrix-repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/matrix/templates
 * マトリクステンプレート一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const projectId = BigInt(id);
    const searchParams = request.nextUrl.searchParams;

    const isDefault = searchParams.get('isDefault');
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const skip = (page - 1) * limit;

    const result = await findMatrixTemplates({
      projectId,
      isDefault: isDefault !== null ? isDefault === 'true' : undefined,
      search,
      skip,
      take: limit,
    });

    // BigIntをstringに変換
    const items = result.items.map((item) => ({
      ...item,
      id: item.id.toString(),
      projectId: item.projectId.toString(),
    }));

    return NextResponse.json({
      items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error) {
    console.error('Failed to fetch matrix templates:', error);
    return NextResponse.json(
      { error: 'マトリクステンプレートの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/matrix/templates
 * マトリクステンプレートを作成
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const projectId = BigInt(id);
    const body = await request.json();

    const {
      name,
      description,
      rowAxisName,
      rowAxisType,
      rowAxisItems,
      columnAxisName,
      columnAxisType,
      columnAxisItems,
      defaultCellValue,
      isDefault,
    } = body;

    // バリデーション
    if (!name?.trim()) {
      return NextResponse.json({ error: 'テンプレート名は必須です' }, { status: 400 });
    }

    if (!rowAxisName?.trim() || !columnAxisName?.trim()) {
      return NextResponse.json({ error: '軸名は必須です' }, { status: 400 });
    }

    if (!rowAxisItems?.length || !columnAxisItems?.length) {
      return NextResponse.json({ error: '軸アイテムは1つ以上必要です' }, { status: 400 });
    }

    // 軸タイプのバリデーション
    const validAxisTypes = Object.values(MatrixAxisType);
    if (rowAxisType && !validAxisTypes.includes(rowAxisType)) {
      return NextResponse.json({ error: '無効な行軸タイプです' }, { status: 400 });
    }
    if (columnAxisType && !validAxisTypes.includes(columnAxisType)) {
      return NextResponse.json({ error: '無効な列軸タイプです' }, { status: 400 });
    }

    // セル値のバリデーション
    if (defaultCellValue) {
      const validCellValues = Object.values(MatrixCellValue);
      if (!validCellValues.includes(defaultCellValue)) {
        return NextResponse.json({ error: '無効なデフォルトセル値です' }, { status: 400 });
      }
    }

    const template = await createMatrixTemplate({
      projectId,
      name,
      description,
      rowAxisName,
      rowAxisType: rowAxisType || 'TEXT',
      rowAxisItems,
      columnAxisName,
      columnAxisType: columnAxisType || 'TEXT',
      columnAxisItems,
      defaultCellValue: defaultCellValue || 'EMPTY',
      isDefault: isDefault || false,
    });

    return NextResponse.json(
      {
        ...template,
        id: template.id.toString(),
        projectId: template.projectId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create matrix template:', error);
    return NextResponse.json(
      { error: 'マトリクステンプレートの作成に失敗しました' },
      { status: 500 }
    );
  }
}
