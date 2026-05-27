/**
 * Custom Field Types
 *
 * カスタムフィールド関連の型定義
 */

import { Prisma } from '@/generated/prisma';

// ========================================
// Enums
// ========================================

/**
 * カスタムフィールドタイプ
 */
export const CustomFieldType = {
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  DATE: 'DATE',
  SELECT_SINGLE: 'SELECT_SINGLE',
  SELECT_MULTI: 'SELECT_MULTI',
  CHECKBOX: 'CHECKBOX',
  URL: 'URL',
  EMAIL: 'EMAIL',
} as const;

export type CustomFieldType = (typeof CustomFieldType)[keyof typeof CustomFieldType];

/**
 * カスタムフィールド対象エンティティ
 */
export const CustomFieldTargetEntity = {
  TEST_CASE: 'TEST_CASE',
  BUG: 'BUG',
  TEST_SPEC: 'TEST_SPEC',
  TEST_RESULT: 'TEST_RESULT',
  TEST_RUN: 'TEST_RUN',
} as const;

export type CustomFieldTargetEntity =
  (typeof CustomFieldTargetEntity)[keyof typeof CustomFieldTargetEntity];

// ========================================
// フィールドタイプ情報
// ========================================

/**
 * フィールドタイプ情報
 */
export interface CustomFieldTypeInfo {
  type: CustomFieldType;
  label: string;
  description: string;
  icon: string;
  supportsOptions: boolean;
  supportsDefaultValue: boolean;
  supportsValidation: boolean;
}

/**
 * フィールドタイプ情報マップ
 */
export const CUSTOM_FIELD_TYPE_INFO: Record<CustomFieldType, CustomFieldTypeInfo> = {
  TEXT: {
    type: 'TEXT',
    label: 'テキスト',
    description: '単一行または複数行のテキスト入力',
    icon: 'Type',
    supportsOptions: false,
    supportsDefaultValue: true,
    supportsValidation: true,
  },
  NUMBER: {
    type: 'NUMBER',
    label: '数値',
    description: '整数または小数の入力',
    icon: 'Hash',
    supportsOptions: false,
    supportsDefaultValue: true,
    supportsValidation: true,
  },
  DATE: {
    type: 'DATE',
    label: '日付',
    description: '日付の選択',
    icon: 'Calendar',
    supportsOptions: false,
    supportsDefaultValue: true,
    supportsValidation: true,
  },
  SELECT_SINGLE: {
    type: 'SELECT_SINGLE',
    label: '単一選択',
    description: '選択肢から1つを選択',
    icon: 'List',
    supportsOptions: true,
    supportsDefaultValue: true,
    supportsValidation: false,
  },
  SELECT_MULTI: {
    type: 'SELECT_MULTI',
    label: '複数選択',
    description: '選択肢から複数を選択可能',
    icon: 'ListChecks',
    supportsOptions: true,
    supportsDefaultValue: true,
    supportsValidation: false,
  },
  CHECKBOX: {
    type: 'CHECKBOX',
    label: 'チェックボックス',
    description: 'オン/オフの切り替え',
    icon: 'CheckSquare',
    supportsOptions: false,
    supportsDefaultValue: true,
    supportsValidation: false,
  },
  URL: {
    type: 'URL',
    label: 'URL',
    description: 'URLリンク',
    icon: 'Link',
    supportsOptions: false,
    supportsDefaultValue: true,
    supportsValidation: true,
  },
  EMAIL: {
    type: 'EMAIL',
    label: 'メールアドレス',
    description: 'メールアドレス入力',
    icon: 'Mail',
    supportsOptions: false,
    supportsDefaultValue: true,
    supportsValidation: true,
  },
};

/**
 * 対象エンティティ情報
 */
export interface TargetEntityInfo {
  entity: CustomFieldTargetEntity;
  label: string;
  description: string;
}

/**
 * 対象エンティティ情報マップ
 */
export const TARGET_ENTITY_INFO: Record<CustomFieldTargetEntity, TargetEntityInfo> = {
  TEST_CASE: {
    entity: 'TEST_CASE',
    label: 'テストケース',
    description: 'テストケースにカスタムフィールドを追加',
  },
  BUG: {
    entity: 'BUG',
    label: 'バグ',
    description: 'バグレポートにカスタムフィールドを追加',
  },
  TEST_SPEC: {
    entity: 'TEST_SPEC',
    label: 'テスト仕様書',
    description: 'テスト仕様書にカスタムフィールドを追加',
  },
  TEST_RESULT: {
    entity: 'TEST_RESULT',
    label: 'テスト結果',
    description: 'テスト結果にカスタムフィールドを追加',
  },
  TEST_RUN: {
    entity: 'TEST_RUN',
    label: 'テスト実行',
    description: 'テスト実行にカスタムフィールドを追加',
  },
};

// ========================================
// 選択肢関連
// ========================================

/**
 * カスタムフィールドの選択肢
 */
export interface CustomFieldOption {
  id: string;
  value: string;
  label: string;
  color?: string;
  sortOrder: number;
  isDefault?: boolean;
}

// ========================================
// バリデーション関連
// ========================================

/**
 * バリデーションルール
 */
export interface CustomFieldValidationRules {
  // テキスト用
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;

  // 数値用
  min?: number;
  max?: number;
  precision?: number;

  // 日付用
  minDate?: string;
  maxDate?: string;
}

// ========================================
// API関連の型
// ========================================

/**
 * カスタムフィールド定義の作成リクエスト
 */
export interface CreateCustomFieldDefinitionRequest {
  name: string;
  displayName: string;
  description?: string;
  fieldType: CustomFieldType;
  targetEntity: CustomFieldTargetEntity;
  isRequired?: boolean;
  isSearchable?: boolean;
  isFilterable?: boolean;
  isVisibleInList?: boolean;
  sortOrder?: number;
  defaultValue?: string;
  options?: CustomFieldOption[];
  validationRules?: CustomFieldValidationRules;
  metadata?: Record<string, unknown>;
}

/**
 * カスタムフィールド定義の更新リクエスト
 */
export interface UpdateCustomFieldDefinitionRequest {
  displayName?: string;
  description?: string;
  isRequired?: boolean;
  isSearchable?: boolean;
  isFilterable?: boolean;
  isVisibleInList?: boolean;
  sortOrder?: number;
  defaultValue?: string;
  options?: CustomFieldOption[];
  validationRules?: CustomFieldValidationRules;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

/**
 * カスタムフィールド値の設定リクエスト
 */
export interface SetCustomFieldValueRequest {
  definitionId: number;
  entityId: number;
  entityType: CustomFieldTargetEntity;
  value: CustomFieldValueData;
}

/**
 * カスタムフィールド値データ
 */
export type CustomFieldValueData =
  | string // TEXT, URL, EMAIL
  | number // NUMBER
  | Date // DATE
  | boolean // CHECKBOX
  | string[] // SELECT_MULTI
  | null;

/**
 * 複数フィールド値の一括設定リクエスト
 */
export interface SetCustomFieldValuesRequest {
  entityId: number;
  entityType: CustomFieldTargetEntity;
  values: {
    definitionId: number;
    value: CustomFieldValueData;
  }[];
}

// ========================================
// レスポンス関連の型
// ========================================

/**
 * カスタムフィールド定義（詳細）
 */
export interface CustomFieldDefinitionWithDetails {
  id: number;
  projectId: number;
  name: string;
  displayName: string;
  description: string | null;
  fieldType: CustomFieldType;
  targetEntity: CustomFieldTargetEntity;
  isRequired: boolean;
  isSearchable: boolean;
  isFilterable: boolean;
  isVisibleInList: boolean;
  sortOrder: number;
  defaultValue: string | null;
  options: CustomFieldOption[] | null;
  validationRules: CustomFieldValidationRules | null;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    values: number;
  };
}

/**
 * カスタムフィールド値（詳細）
 */
export interface CustomFieldValueWithDefinition {
  id: number;
  definitionId: number;
  entityId: number;
  entityType: CustomFieldTargetEntity;
  textValue: string | null;
  numberValue: number | null;
  dateValue: Date | null;
  booleanValue: boolean | null;
  jsonValue: unknown;
  createdAt: Date;
  updatedAt: Date;
  definition: CustomFieldDefinitionWithDetails;
}

/**
 * エンティティのカスタムフィールド値一覧
 */
export interface EntityCustomFieldValues {
  entityId: number;
  entityType: CustomFieldTargetEntity;
  fields: {
    definition: CustomFieldDefinitionWithDetails;
    value: CustomFieldValueData;
    rawValue?: CustomFieldValueWithDefinition;
  }[];
}

// ========================================
// フィルター・検索関連
// ========================================

/**
 * カスタムフィールドフィルター
 */
export interface CustomFieldFilter {
  definitionId: number;
  operator: CustomFieldFilterOperator;
  value: CustomFieldValueData;
}

/**
 * フィルター演算子
 */
export type CustomFieldFilterOperator =
  | 'eq' // 等しい
  | 'ne' // 等しくない
  | 'gt' // より大きい
  | 'gte' // 以上
  | 'lt' // より小さい
  | 'lte' // 以下
  | 'contains' // 含む
  | 'startsWith' // で始まる
  | 'endsWith' // で終わる
  | 'in' // いずれかに一致
  | 'notIn' // いずれにも一致しない
  | 'isNull' // nullである
  | 'isNotNull'; // nullでない

/**
 * カスタムフィールド検索条件
 */
export interface CustomFieldSearchCriteria {
  targetEntity: CustomFieldTargetEntity;
  filters: CustomFieldFilter[];
  logic: 'AND' | 'OR';
}

// ========================================
// ユーティリティ型
// ========================================

/**
 * カスタムフィールド定義リスト取得オプション
 */
export interface GetCustomFieldDefinitionsOptions {
  projectId: number;
  targetEntity?: CustomFieldTargetEntity;
  isActive?: boolean;
  includeCount?: boolean;
}

/**
 * カスタムフィールド値取得オプション
 */
export interface GetCustomFieldValuesOptions {
  entityId: number;
  entityType: CustomFieldTargetEntity;
  includeDefinition?: boolean;
}

/**
 * カスタムフィールド定義のPrismaインクルード
 */
export const customFieldDefinitionInclude = {
  _count: {
    select: {
      values: true,
    },
  },
} satisfies Prisma.CustomFieldDefinitionInclude;

/**
 * カスタムフィールド値のPrismaインクルード
 */
export const customFieldValueInclude = {
  definition: true,
} satisfies Prisma.CustomFieldValueInclude;
