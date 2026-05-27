/**
 * Custom Field Values API
 *
 * カスタムフィールド値の取得・設定
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCustomFieldValues,
  setCustomFieldValue,
  setCustomFieldValues,
  deleteCustomFieldValue,
  deleteAllCustomFieldValues,
  extractValueFromCustomFieldValue,
} from '@/repositories/custom-field-repository';
import {
  CustomFieldTargetEntity,
  SetCustomFieldValueRequest,
  SetCustomFieldValuesRequest,
  CustomFieldType,
} from '@/types/custom-field';
import { serializeBigInt } from '@/lib/json-utils';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]/custom-fields/values
 * エンティティのカスタムフィールド値を取得
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const projectId = parseInt(id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const entityId = searchParams.get('entityId');
    const entityType = searchParams.get('entityType') as CustomFieldTargetEntity | null;

    if (!entityId || !entityType) {
      return NextResponse.json(
        { error: 'Missing required parameters: entityId, entityType' },
        { status: 400 }
      );
    }

    const values = await getCustomFieldValues(parseInt(entityId, 10), entityType);

    // 値を整形して返す
    const formattedValues = values.map((v) => ({
      ...serializeBigInt(v),
      extractedValue: extractValueFromCustomFieldValue(
        v,
        v.definition.fieldType as CustomFieldType
      ),
    }));

    return NextResponse.json(formattedValues);
  } catch (error) {
    console.error('Error fetching custom field values:', error);
    return NextResponse.json({ error: 'Failed to fetch custom field values' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/custom-fields/values
 * カスタムフィールド値を設定
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const projectId = parseInt(id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const body = await request.json();

    // 単一値設定か複数値一括設定かを判定
    if ('values' in body && Array.isArray(body.values)) {
      // 複数値の一括設定
      const data: SetCustomFieldValuesRequest = body;

      if (!data.entityId || !data.entityType || !data.values.length) {
        return NextResponse.json(
          { error: 'Missing required fields: entityId, entityType, values' },
          { status: 400 }
        );
      }

      await setCustomFieldValues(data);

      return NextResponse.json({ success: true });
    } else {
      // 単一値の設定
      const data: SetCustomFieldValueRequest = body;

      if (!data.definitionId || !data.entityId || !data.entityType) {
        return NextResponse.json(
          { error: 'Missing required fields: definitionId, entityId, entityType' },
          { status: 400 }
        );
      }

      const value = await setCustomFieldValue(data);

      return NextResponse.json(serializeBigInt(value), { status: 201 });
    }
  } catch (error) {
    console.error('Error setting custom field value:', error);
    return NextResponse.json({ error: 'Failed to set custom field value' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/custom-fields/values
 * カスタムフィールド値を削除
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const projectId = parseInt(id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const definitionId = searchParams.get('definitionId');
    const entityId = searchParams.get('entityId');
    const entityType = searchParams.get('entityType') as CustomFieldTargetEntity | null;

    if (!entityId || !entityType) {
      return NextResponse.json(
        { error: 'Missing required parameters: entityId, entityType' },
        { status: 400 }
      );
    }

    if (definitionId) {
      // 特定の値を削除
      await deleteCustomFieldValue(parseInt(definitionId, 10), parseInt(entityId, 10), entityType);
    } else {
      // エンティティのすべての値を削除
      await deleteAllCustomFieldValues(parseInt(entityId, 10), entityType);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom field value:', error);
    return NextResponse.json({ error: 'Failed to delete custom field value' }, { status: 500 });
  }
}
