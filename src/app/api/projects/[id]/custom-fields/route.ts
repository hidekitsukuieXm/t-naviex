/**
 * Custom Field Definitions API
 *
 * カスタムフィールド定義の一覧取得・作成
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCustomFieldDefinitions,
  createCustomFieldDefinition,
} from '@/repositories/custom-field-repository';
import { CustomFieldTargetEntity, CreateCustomFieldDefinitionRequest } from '@/types/custom-field';
import { serializeBigInt } from '@/lib/json-utils';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]/custom-fields
 * カスタムフィールド定義一覧を取得
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const projectId = parseInt(id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const targetEntity = searchParams.get('targetEntity') as CustomFieldTargetEntity | null;
    const isActive = searchParams.get('isActive');

    const definitions = await getCustomFieldDefinitions({
      projectId,
      targetEntity: targetEntity ?? undefined,
      isActive: isActive !== null ? isActive === 'true' : undefined,
    });

    return NextResponse.json(serializeBigInt(definitions));
  } catch (error) {
    console.error('Error fetching custom field definitions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom field definitions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/custom-fields
 * カスタムフィールド定義を作成
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const projectId = parseInt(id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const body: CreateCustomFieldDefinitionRequest = await request.json();

    // バリデーション
    if (!body.name || !body.displayName || !body.fieldType || !body.targetEntity) {
      return NextResponse.json(
        { error: 'Missing required fields: name, displayName, fieldType, targetEntity' },
        { status: 400 }
      );
    }

    // フィールド名のバリデーション（英数字とアンダースコアのみ）
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(body.name)) {
      return NextResponse.json(
        {
          error:
            'Field name must start with a letter and contain only letters, numbers, and underscores',
        },
        { status: 400 }
      );
    }

    const definition = await createCustomFieldDefinition(projectId, body);

    return NextResponse.json(serializeBigInt(definition), { status: 201 });
  } catch (error) {
    console.error('Error creating custom field definition:', error);

    // 重複エラーのハンドリング
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A custom field with this name already exists for the target entity' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create custom field definition' },
      { status: 500 }
    );
  }
}
