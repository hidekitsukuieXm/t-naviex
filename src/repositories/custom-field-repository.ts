/**
 * Custom Field Repository
 *
 * カスタムフィールドのデータアクセス層
 */

import { prisma } from '@/lib/prisma';
import { Prisma, CustomFieldDefinition, CustomFieldValue } from '@/generated/prisma';
import {
  CustomFieldType,
  CustomFieldTargetEntity,
  CreateCustomFieldDefinitionRequest,
  UpdateCustomFieldDefinitionRequest,
  SetCustomFieldValueRequest,
  SetCustomFieldValuesRequest,
  CustomFieldValueData,
  customFieldDefinitionInclude,
  customFieldValueInclude,
} from '@/types/custom-field';

// ========================================
// カスタムフィールド定義 CRUD
// ========================================

/**
 * カスタムフィールド定義を作成
 */
export async function createCustomFieldDefinition(
  projectId: number,
  data: CreateCustomFieldDefinitionRequest
): Promise<CustomFieldDefinition> {
  return prisma.customFieldDefinition.create({
    data: {
      projectId: BigInt(projectId),
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      fieldType: data.fieldType,
      targetEntity: data.targetEntity,
      isRequired: data.isRequired ?? false,
      isSearchable: data.isSearchable ?? true,
      isFilterable: data.isFilterable ?? true,
      isVisibleInList: data.isVisibleInList ?? true,
      sortOrder: data.sortOrder ?? 0,
      defaultValue: data.defaultValue,
      options: data.options ? (data.options as unknown as Prisma.JsonArray) : undefined,
      validationRules: data.validationRules
        ? (data.validationRules as unknown as Prisma.JsonObject)
        : undefined,
      metadata: data.metadata ? (data.metadata as unknown as Prisma.JsonObject) : undefined,
    },
    include: customFieldDefinitionInclude,
  });
}

/**
 * カスタムフィールド定義を取得
 */
export async function getCustomFieldDefinitionById(
  id: number
): Promise<CustomFieldDefinition | null> {
  return prisma.customFieldDefinition.findUnique({
    where: { id: BigInt(id) },
    include: customFieldDefinitionInclude,
  });
}

/**
 * プロジェクトのカスタムフィールド定義一覧を取得
 */
export async function getCustomFieldDefinitions(options: {
  projectId: number;
  targetEntity?: CustomFieldTargetEntity;
  isActive?: boolean;
}): Promise<CustomFieldDefinition[]> {
  const where: Prisma.CustomFieldDefinitionWhereInput = {
    projectId: BigInt(options.projectId),
  };

  if (options.targetEntity) {
    where.targetEntity = options.targetEntity;
  }

  if (options.isActive !== undefined) {
    where.isActive = options.isActive;
  }

  return prisma.customFieldDefinition.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: customFieldDefinitionInclude,
  });
}

/**
 * カスタムフィールド定義を更新
 */
export async function updateCustomFieldDefinition(
  id: number,
  data: UpdateCustomFieldDefinitionRequest
): Promise<CustomFieldDefinition> {
  const updateData: Prisma.CustomFieldDefinitionUpdateInput = {};

  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
  if (data.isSearchable !== undefined) updateData.isSearchable = data.isSearchable;
  if (data.isFilterable !== undefined) updateData.isFilterable = data.isFilterable;
  if (data.isVisibleInList !== undefined) updateData.isVisibleInList = data.isVisibleInList;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.defaultValue !== undefined) updateData.defaultValue = data.defaultValue;
  if (data.options !== undefined) {
    updateData.options = data.options as unknown as Prisma.JsonArray;
  }
  if (data.validationRules !== undefined) {
    updateData.validationRules = data.validationRules as unknown as Prisma.JsonObject;
  }
  if (data.metadata !== undefined) {
    updateData.metadata = data.metadata as unknown as Prisma.JsonObject;
  }
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return prisma.customFieldDefinition.update({
    where: { id: BigInt(id) },
    data: updateData,
    include: customFieldDefinitionInclude,
  });
}

/**
 * カスタムフィールド定義を削除
 */
export async function deleteCustomFieldDefinition(id: number): Promise<void> {
  await prisma.customFieldDefinition.delete({
    where: { id: BigInt(id) },
  });
}

/**
 * カスタムフィールド定義の表示順を一括更新
 */
export async function updateCustomFieldDefinitionOrders(
  orders: { id: number; sortOrder: number }[]
): Promise<void> {
  await prisma.$transaction(
    orders.map((order) =>
      prisma.customFieldDefinition.update({
        where: { id: BigInt(order.id) },
        data: { sortOrder: order.sortOrder },
      })
    )
  );
}

// ========================================
// カスタムフィールド値 CRUD
// ========================================

/**
 * カスタムフィールド値を設定（存在すれば更新、なければ作成）
 */
export async function setCustomFieldValue(
  data: SetCustomFieldValueRequest
): Promise<CustomFieldValue> {
  // 定義を取得してフィールドタイプを確認
  const definition = await prisma.customFieldDefinition.findUnique({
    where: { id: BigInt(data.definitionId) },
  });

  if (!definition) {
    throw new Error(`Custom field definition not found: ${data.definitionId}`);
  }

  // 値を適切なカラムにマッピング
  const valueData = mapValueToColumns(definition.fieldType as CustomFieldType, data.value);

  return prisma.customFieldValue.upsert({
    where: {
      definitionId_entityId_entityType: {
        definitionId: BigInt(data.definitionId),
        entityId: BigInt(data.entityId),
        entityType: data.entityType,
      },
    },
    create: {
      definitionId: BigInt(data.definitionId),
      entityId: BigInt(data.entityId),
      entityType: data.entityType,
      ...valueData,
    },
    update: valueData,
    include: customFieldValueInclude,
  });
}

/**
 * 複数のカスタムフィールド値を一括設定
 */
export async function setCustomFieldValues(data: SetCustomFieldValuesRequest): Promise<void> {
  // 定義を一括取得
  const definitionIds = data.values.map((v) => BigInt(v.definitionId));
  const definitions = await prisma.customFieldDefinition.findMany({
    where: { id: { in: definitionIds } },
  });

  const definitionMap = new Map(definitions.map((d) => [Number(d.id), d]));

  await prisma.$transaction(
    data.values.map((value) => {
      const definition = definitionMap.get(value.definitionId);
      if (!definition) {
        throw new Error(`Custom field definition not found: ${value.definitionId}`);
      }

      const valueData = mapValueToColumns(definition.fieldType as CustomFieldType, value.value);

      return prisma.customFieldValue.upsert({
        where: {
          definitionId_entityId_entityType: {
            definitionId: BigInt(value.definitionId),
            entityId: BigInt(data.entityId),
            entityType: data.entityType,
          },
        },
        create: {
          definitionId: BigInt(value.definitionId),
          entityId: BigInt(data.entityId),
          entityType: data.entityType,
          ...valueData,
        },
        update: valueData,
      });
    })
  );
}

/**
 * エンティティのカスタムフィールド値を取得
 */
export async function getCustomFieldValues(
  entityId: number,
  entityType: CustomFieldTargetEntity
): Promise<CustomFieldValue[]> {
  return prisma.customFieldValue.findMany({
    where: {
      entityId: BigInt(entityId),
      entityType,
    },
    include: customFieldValueInclude,
    orderBy: {
      definition: {
        sortOrder: 'asc',
      },
    },
  });
}

/**
 * 特定の定義のカスタムフィールド値を取得
 */
export async function getCustomFieldValueByDefinition(
  definitionId: number,
  entityId: number,
  entityType: CustomFieldTargetEntity
): Promise<CustomFieldValue | null> {
  return prisma.customFieldValue.findUnique({
    where: {
      definitionId_entityId_entityType: {
        definitionId: BigInt(definitionId),
        entityId: BigInt(entityId),
        entityType,
      },
    },
    include: customFieldValueInclude,
  });
}

/**
 * カスタムフィールド値を削除
 */
export async function deleteCustomFieldValue(
  definitionId: number,
  entityId: number,
  entityType: CustomFieldTargetEntity
): Promise<void> {
  await prisma.customFieldValue.delete({
    where: {
      definitionId_entityId_entityType: {
        definitionId: BigInt(definitionId),
        entityId: BigInt(entityId),
        entityType,
      },
    },
  });
}

/**
 * エンティティのカスタムフィールド値をすべて削除
 */
export async function deleteAllCustomFieldValues(
  entityId: number,
  entityType: CustomFieldTargetEntity
): Promise<void> {
  await prisma.customFieldValue.deleteMany({
    where: {
      entityId: BigInt(entityId),
      entityType,
    },
  });
}

// ========================================
// 検索・フィルタリング
// ========================================

/**
 * カスタムフィールド値で検索
 */
export async function searchByCustomFieldValue(options: {
  projectId: number;
  targetEntity: CustomFieldTargetEntity;
  definitionId: number;
  operator: string;
  value: CustomFieldValueData;
}): Promise<bigint[]> {
  const definition = await prisma.customFieldDefinition.findUnique({
    where: { id: BigInt(options.definitionId) },
  });

  if (!definition) {
    return [];
  }

  const fieldType = definition.fieldType as CustomFieldType;
  const where = buildSearchWhereClause(fieldType, options.operator, options.value);

  const results = await prisma.customFieldValue.findMany({
    where: {
      definitionId: BigInt(options.definitionId),
      entityType: options.targetEntity,
      ...where,
    },
    select: { entityId: true },
  });

  return results.map((r) => r.entityId);
}

// ========================================
// ヘルパー関数
// ========================================

/**
 * 値を適切なカラムにマッピング
 */
function mapValueToColumns(
  fieldType: CustomFieldType,
  value: CustomFieldValueData
): {
  textValue?: string | null;
  numberValue?: Prisma.Decimal | null;
  dateValue?: Date | null;
  booleanValue?: boolean | null;
  jsonValue?: Prisma.JsonValue | null;
} {
  // nullの場合はすべてのカラムをnullに
  if (value === null) {
    return {
      textValue: null,
      numberValue: null,
      dateValue: null,
      booleanValue: null,
      jsonValue: null,
    };
  }

  switch (fieldType) {
    case 'TEXT':
    case 'URL':
    case 'EMAIL':
      return {
        textValue: String(value),
        numberValue: null,
        dateValue: null,
        booleanValue: null,
        jsonValue: null,
      };
    case 'NUMBER':
      return {
        textValue: null,
        numberValue: new Prisma.Decimal(String(value)),
        dateValue: null,
        booleanValue: null,
        jsonValue: null,
      };
    case 'DATE':
      return {
        textValue: null,
        numberValue: null,
        dateValue: value instanceof Date ? value : new Date(String(value)),
        booleanValue: null,
        jsonValue: null,
      };
    case 'CHECKBOX':
      return {
        textValue: null,
        numberValue: null,
        dateValue: null,
        booleanValue: Boolean(value),
        jsonValue: null,
      };
    case 'SELECT_SINGLE':
      return {
        textValue: String(value),
        numberValue: null,
        dateValue: null,
        booleanValue: null,
        jsonValue: null,
      };
    case 'SELECT_MULTI':
      return {
        textValue: null,
        numberValue: null,
        dateValue: null,
        booleanValue: null,
        jsonValue: Array.isArray(value) ? value : [value],
      };
    default:
      return {
        textValue: String(value),
        numberValue: null,
        dateValue: null,
        booleanValue: null,
        jsonValue: null,
      };
  }
}

/**
 * 検索用のWhere句を構築
 */
function buildSearchWhereClause(
  fieldType: CustomFieldType,
  operator: string,
  value: CustomFieldValueData
): Prisma.CustomFieldValueWhereInput {
  switch (fieldType) {
    case 'TEXT':
    case 'URL':
    case 'EMAIL':
    case 'SELECT_SINGLE':
      return buildTextWhereClause(operator, value);
    case 'NUMBER':
      return buildNumberWhereClause(operator, value);
    case 'DATE':
      return buildDateWhereClause(operator, value);
    case 'CHECKBOX':
      return buildBooleanWhereClause(operator, value);
    case 'SELECT_MULTI':
      return buildJsonWhereClause(operator, value);
    default:
      return {};
  }
}

function buildTextWhereClause(
  operator: string,
  value: CustomFieldValueData
): Prisma.CustomFieldValueWhereInput {
  const stringValue = value !== null ? String(value) : null;
  switch (operator) {
    case 'eq':
      return { textValue: stringValue };
    case 'ne':
      return { textValue: { not: stringValue } };
    case 'contains':
      return { textValue: { contains: stringValue ?? '', mode: 'insensitive' } };
    case 'startsWith':
      return { textValue: { startsWith: stringValue ?? '', mode: 'insensitive' } };
    case 'endsWith':
      return { textValue: { endsWith: stringValue ?? '', mode: 'insensitive' } };
    case 'isNull':
      return { textValue: null };
    case 'isNotNull':
      return { textValue: { not: null } };
    default:
      return {};
  }
}

function buildNumberWhereClause(
  operator: string,
  value: CustomFieldValueData
): Prisma.CustomFieldValueWhereInput {
  const numValue = value !== null ? new Prisma.Decimal(String(value)) : null;
  switch (operator) {
    case 'eq':
      return { numberValue: numValue };
    case 'ne':
      return { numberValue: { not: numValue } };
    case 'gt':
      return { numberValue: { gt: numValue ?? undefined } };
    case 'gte':
      return { numberValue: { gte: numValue ?? undefined } };
    case 'lt':
      return { numberValue: { lt: numValue ?? undefined } };
    case 'lte':
      return { numberValue: { lte: numValue ?? undefined } };
    case 'isNull':
      return { numberValue: null };
    case 'isNotNull':
      return { numberValue: { not: null } };
    default:
      return {};
  }
}

function buildDateWhereClause(
  operator: string,
  value: CustomFieldValueData
): Prisma.CustomFieldValueWhereInput {
  const dateValue =
    value !== null ? (value instanceof Date ? value : new Date(String(value))) : null;
  switch (operator) {
    case 'eq':
      return { dateValue };
    case 'ne':
      return { dateValue: { not: dateValue } };
    case 'gt':
      return { dateValue: { gt: dateValue ?? undefined } };
    case 'gte':
      return { dateValue: { gte: dateValue ?? undefined } };
    case 'lt':
      return { dateValue: { lt: dateValue ?? undefined } };
    case 'lte':
      return { dateValue: { lte: dateValue ?? undefined } };
    case 'isNull':
      return { dateValue: null };
    case 'isNotNull':
      return { dateValue: { not: null } };
    default:
      return {};
  }
}

function buildBooleanWhereClause(
  operator: string,
  value: CustomFieldValueData
): Prisma.CustomFieldValueWhereInput {
  switch (operator) {
    case 'eq':
      return { booleanValue: Boolean(value) };
    case 'ne':
      return { booleanValue: { not: Boolean(value) } };
    case 'isNull':
      return { booleanValue: null };
    case 'isNotNull':
      return { booleanValue: { not: null } };
    default:
      return {};
  }
}

function buildJsonWhereClause(
  operator: string,
  _value: CustomFieldValueData
): Prisma.CustomFieldValueWhereInput {
  switch (operator) {
    case 'isNull':
      return { jsonValue: { equals: Prisma.JsonNull } };
    case 'isNotNull':
      return { NOT: { jsonValue: { equals: Prisma.JsonNull } } };
    // JSONの検索は制限的
    default:
      return {};
  }
}

/**
 * カスタムフィールド値からデータを抽出
 */
export function extractValueFromCustomFieldValue(
  fieldValue: CustomFieldValue,
  fieldType: CustomFieldType
): CustomFieldValueData {
  switch (fieldType) {
    case 'TEXT':
    case 'URL':
    case 'EMAIL':
    case 'SELECT_SINGLE':
      return fieldValue.textValue;
    case 'NUMBER':
      return fieldValue.numberValue ? Number(fieldValue.numberValue) : null;
    case 'DATE':
      return fieldValue.dateValue;
    case 'CHECKBOX':
      return fieldValue.booleanValue;
    case 'SELECT_MULTI':
      return (fieldValue.jsonValue as string[]) ?? null;
    default:
      return fieldValue.textValue;
  }
}
