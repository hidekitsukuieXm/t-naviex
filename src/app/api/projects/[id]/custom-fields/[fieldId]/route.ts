/**
 * Custom Field Definition Detail API
 *
 * カスタムフィールド定義の取得・更新・削除
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCustomFieldDefinitionById,
  updateCustomFieldDefinition,
  deleteCustomFieldDefinition,
} from '@/repositories/custom-field-repository';
import { UpdateCustomFieldDefinitionRequest } from '@/types/custom-field';
import { serializeBigInt } from '@/lib/json-utils';

type RouteContext = {
  params: Promise<{ id: string; fieldId: string }>;
};

/**
 * GET /api/projects/[id]/custom-fields/[fieldId]
 * カスタムフィールド定義を取得
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id, fieldId } = await context.params;
    const projectId = parseInt(id, 10);
    const definitionId = parseInt(fieldId, 10);

    if (isNaN(projectId) || isNaN(definitionId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const definition = await getCustomFieldDefinitionById(definitionId);

    if (!definition) {
      return NextResponse.json({ error: 'Custom field definition not found' }, { status: 404 });
    }

    // プロジェクトIDが一致するか確認
    if (Number(definition.projectId) !== projectId) {
      return NextResponse.json({ error: 'Custom field definition not found' }, { status: 404 });
    }

    return NextResponse.json(serializeBigInt(definition));
  } catch (error) {
    console.error('Error fetching custom field definition:', error);
    return NextResponse.json({ error: 'Failed to fetch custom field definition' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/custom-fields/[fieldId]
 * カスタムフィールド定義を更新
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id, fieldId } = await context.params;
    const projectId = parseInt(id, 10);
    const definitionId = parseInt(fieldId, 10);

    if (isNaN(projectId) || isNaN(definitionId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // 存在確認
    const existing = await getCustomFieldDefinitionById(definitionId);
    if (!existing || Number(existing.projectId) !== projectId) {
      return NextResponse.json({ error: 'Custom field definition not found' }, { status: 404 });
    }

    const body: UpdateCustomFieldDefinitionRequest = await request.json();

    const definition = await updateCustomFieldDefinition(definitionId, body);

    return NextResponse.json(serializeBigInt(definition));
  } catch (error) {
    console.error('Error updating custom field definition:', error);
    return NextResponse.json(
      { error: 'Failed to update custom field definition' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/custom-fields/[fieldId]
 * カスタムフィールド定義を削除
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id, fieldId } = await context.params;
    const projectId = parseInt(id, 10);
    const definitionId = parseInt(fieldId, 10);

    if (isNaN(projectId) || isNaN(definitionId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // 存在確認
    const existing = await getCustomFieldDefinitionById(definitionId);
    if (!existing || Number(existing.projectId) !== projectId) {
      return NextResponse.json({ error: 'Custom field definition not found' }, { status: 404 });
    }

    await deleteCustomFieldDefinition(definitionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom field definition:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom field definition' },
      { status: 500 }
    );
  }
}
