/**
 * Matrix Template Detail API
 *
 * 個別マトリクステンプレートの取得・更新・削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { MatrixAxisType, MatrixCellValue } from '@/generated/prisma';
import {
  getMatrixTemplate,
  updateMatrixTemplate,
  deleteMatrixTemplate,
  incrementTemplateUsage,
} from '@/repositories/matrix-repository';

interface RouteParams {
  params: Promise<{ id: string; templateId: string }>;
}

/**
 * GET /api/projects/[id]/matrix/templates/[templateId]
 * マトリクステンプレートを取得
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { templateId } = await params;
    const templateIdBigInt = BigInt(templateId);

    const template = await getMatrixTemplate(templateIdBigInt);

    if (!template) {
      return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({
      ...template,
      id: template.id.toString(),
      projectId: template.projectId.toString(),
    });
  } catch (error) {
    console.error('Failed to fetch matrix template:', error);
    return NextResponse.json(
      { error: 'マトリクステンプレートの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/matrix/templates/[templateId]
 * マトリクステンプレートを更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { templateId } = await params;
    const templateIdBigInt = BigInt(templateId);
    const body = await request.json();

    // 存在確認
    const existing = await getMatrixTemplate(templateIdBigInt);
    if (!existing) {
      return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 });
    }

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
      isActive,
    } = body;

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

    const template = await updateMatrixTemplate(templateIdBigInt, {
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
      isActive,
    });

    return NextResponse.json({
      ...template,
      id: template.id.toString(),
      projectId: template.projectId.toString(),
    });
  } catch (error) {
    console.error('Failed to update matrix template:', error);
    return NextResponse.json(
      { error: 'マトリクステンプレートの更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/matrix/templates/[templateId]
 * マトリクステンプレートを削除（論理削除）
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { templateId } = await params;
    const templateIdBigInt = BigInt(templateId);

    // 存在確認
    const existing = await getMatrixTemplate(templateIdBigInt);
    if (!existing) {
      return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 });
    }

    await deleteMatrixTemplate(templateIdBigInt);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete matrix template:', error);
    return NextResponse.json(
      { error: 'マトリクステンプレートの削除に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]/matrix/templates/[templateId]
 * テンプレート使用回数をインクリメント
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { templateId } = await params;
    const templateIdBigInt = BigInt(templateId);
    const body = await request.json();

    if (body.action === 'incrementUsage') {
      const template = await incrementTemplateUsage(templateIdBigInt);

      return NextResponse.json({
        ...template,
        id: template.id.toString(),
        projectId: template.projectId.toString(),
      });
    }

    return NextResponse.json({ error: '不明なアクションです' }, { status: 400 });
  } catch (error) {
    console.error('Failed to patch matrix template:', error);
    return NextResponse.json(
      { error: 'マトリクステンプレートの更新に失敗しました' },
      { status: 500 }
    );
  }
}
