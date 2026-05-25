/**
 * テストケーステンプレートのリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  TestCaseTemplate,
  TestCaseTemplateDetail,
  TemplateStep,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateListResponse,
} from '@/types/template';

// ============================================
// 共通ヘルパー関数
// ============================================

/**
 * BigIntをstringに変換するシリアライズ関数（テンプレート）
 */
function serializeTemplate(item: {
  id: bigint;
  projectId: bigint;
  name: string;
  description: string | null;
  title: string | null;
  templateDescription: string | null;
  preconditions: string | null;
  expectedResult: string | null;
  checkpoint: string | null;
  scenario: string | null;
  testEnvironment: string | null;
  notes: string | null;
  tags: string[];
  classification: string | null;
  priority: string;
  testType: string;
  testTechnique: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): TestCaseTemplate {
  return {
    id: item.id.toString(),
    projectId: item.projectId.toString(),
    name: item.name,
    description: item.description,
    title: item.title,
    templateDescription: item.templateDescription,
    preconditions: item.preconditions,
    expectedResult: item.expectedResult,
    checkpoint: item.checkpoint,
    scenario: item.scenario,
    testEnvironment: item.testEnvironment,
    notes: item.notes,
    tags: item.tags,
    classification: item.classification,
    priority: item.priority as TestCaseTemplate['priority'],
    testType: item.testType as TestCaseTemplate['testType'],
    testTechnique: item.testTechnique as TestCaseTemplate['testTechnique'],
    isDefault: item.isDefault,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

/**
 * BigIntをstringに変換するシリアライズ関数（テンプレートステップ）
 */
function serializeTemplateStep(item: {
  id: bigint;
  templateId: bigint;
  stepNo: number;
  actionMd: string;
  expectedMd: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TemplateStep {
  return {
    id: item.id.toString(),
    templateId: item.templateId.toString(),
    stepNo: item.stepNo,
    actionMd: item.actionMd,
    expectedMd: item.expectedMd,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

// ============================================
// テンプレート CRUD
// ============================================

/**
 * プロジェクトのテンプレート一覧を取得
 */
export async function getTemplates(
  projectId: string,
  options?: { defaultOnly?: boolean }
): Promise<TemplateListResponse> {
  const where = {
    projectId: BigInt(projectId),
    ...(options?.defaultOnly ? { isDefault: true } : {}),
  };

  const [templates, total] = await Promise.all([
    prisma.testCaseTemplate.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.testCaseTemplate.count({ where }),
  ]);

  return {
    templates: templates.map(serializeTemplate),
    total,
  };
}

/**
 * テンプレートを取得（ステップなし）
 */
export async function getTemplate(projectId: string, id: string): Promise<TestCaseTemplate | null> {
  const item = await prisma.testCaseTemplate.findFirst({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
  });

  return item ? serializeTemplate(item) : null;
}

/**
 * テンプレートを取得（ステップ付き）
 */
export async function getTemplateDetail(
  projectId: string,
  id: string
): Promise<TestCaseTemplateDetail | null> {
  const item = await prisma.testCaseTemplate.findFirst({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
    include: {
      templateSteps: {
        orderBy: { stepNo: 'asc' },
      },
    },
  });

  if (!item) return null;

  return {
    ...serializeTemplate(item),
    templateSteps: item.templateSteps.map(serializeTemplateStep),
  };
}

/**
 * 名前でテンプレートを取得
 */
export async function getTemplateByName(
  projectId: string,
  name: string
): Promise<TestCaseTemplate | null> {
  const item = await prisma.testCaseTemplate.findUnique({
    where: {
      projectId_name: {
        projectId: BigInt(projectId),
        name,
      },
    },
  });

  return item ? serializeTemplate(item) : null;
}

/**
 * テンプレートを作成
 */
export async function createTemplate(
  projectId: string,
  input: CreateTemplateInput
): Promise<TestCaseTemplateDetail> {
  const item = await prisma.testCaseTemplate.create({
    data: {
      projectId: BigInt(projectId),
      name: input.name,
      description: input.description ?? null,
      title: input.title ?? null,
      templateDescription: input.templateDescription ?? null,
      preconditions: input.preconditions ?? null,
      expectedResult: input.expectedResult ?? null,
      checkpoint: input.checkpoint ?? null,
      scenario: input.scenario ?? null,
      testEnvironment: input.testEnvironment ?? null,
      notes: input.notes ?? null,
      tags: input.tags ?? [],
      classification: input.classification ?? null,
      priority: input.priority ?? 'MEDIUM',
      testType: input.testType ?? 'FUNCTIONAL',
      testTechnique: input.testTechnique ?? 'OTHER',
      isDefault: input.isDefault ?? false,
      sortOrder: input.sortOrder ?? 0,
      templateSteps: input.templateSteps
        ? {
            create: input.templateSteps.map((step) => ({
              stepNo: step.stepNo,
              actionMd: step.actionMd,
              expectedMd: step.expectedMd ?? null,
            })),
          }
        : undefined,
    },
    include: {
      templateSteps: {
        orderBy: { stepNo: 'asc' },
      },
    },
  });

  return {
    ...serializeTemplate(item),
    templateSteps: item.templateSteps.map(serializeTemplateStep),
  };
}

/**
 * テンプレートを更新
 */
export async function updateTemplate(
  projectId: string,
  id: string,
  input: UpdateTemplateInput
): Promise<TestCaseTemplateDetail> {
  // トランザクションで更新（ステップがある場合は削除→再作成）
  const item = await prisma.$transaction(async (tx) => {
    // ステップがある場合は削除
    if (input.templateSteps !== undefined) {
      await tx.testCaseTemplateStep.deleteMany({
        where: { templateId: BigInt(id) },
      });
    }

    // テンプレート更新
    return tx.testCaseTemplate.update({
      where: {
        id: BigInt(id),
        projectId: BigInt(projectId),
      },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.templateDescription !== undefined
          ? { templateDescription: input.templateDescription }
          : {}),
        ...(input.preconditions !== undefined ? { preconditions: input.preconditions } : {}),
        ...(input.expectedResult !== undefined ? { expectedResult: input.expectedResult } : {}),
        ...(input.checkpoint !== undefined ? { checkpoint: input.checkpoint } : {}),
        ...(input.scenario !== undefined ? { scenario: input.scenario } : {}),
        ...(input.testEnvironment !== undefined ? { testEnvironment: input.testEnvironment } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.classification !== undefined ? { classification: input.classification } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.testType !== undefined ? { testType: input.testType } : {}),
        ...(input.testTechnique !== undefined ? { testTechnique: input.testTechnique } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        templateSteps:
          input.templateSteps !== undefined
            ? {
                create: input.templateSteps.map((step) => ({
                  stepNo: step.stepNo,
                  actionMd: step.actionMd,
                  expectedMd: step.expectedMd ?? null,
                })),
              }
            : undefined,
      },
      include: {
        templateSteps: {
          orderBy: { stepNo: 'asc' },
        },
      },
    });
  });

  return {
    ...serializeTemplate(item),
    templateSteps: item.templateSteps.map(serializeTemplateStep),
  };
}

/**
 * テンプレートを削除
 */
export async function deleteTemplate(projectId: string, id: string): Promise<void> {
  await prisma.testCaseTemplate.delete({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
  });
}

/**
 * テンプレートをコピー
 */
export async function duplicateTemplate(
  projectId: string,
  id: string,
  newName: string
): Promise<TestCaseTemplateDetail> {
  // 元のテンプレートを取得
  const original = await prisma.testCaseTemplate.findFirst({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
    include: {
      templateSteps: {
        orderBy: { stepNo: 'asc' },
      },
    },
  });

  if (!original) {
    throw new Error('Template not found');
  }

  // コピーを作成
  const item = await prisma.testCaseTemplate.create({
    data: {
      projectId: BigInt(projectId),
      name: newName,
      description: original.description,
      title: original.title,
      templateDescription: original.templateDescription,
      preconditions: original.preconditions,
      expectedResult: original.expectedResult,
      checkpoint: original.checkpoint,
      scenario: original.scenario,
      testEnvironment: original.testEnvironment,
      notes: original.notes,
      tags: original.tags,
      classification: original.classification,
      priority: original.priority,
      testType: original.testType,
      testTechnique: original.testTechnique,
      isDefault: false, // コピーはデフォルトにしない
      sortOrder: original.sortOrder,
      templateSteps: {
        create: original.templateSteps.map((step) => ({
          stepNo: step.stepNo,
          actionMd: step.actionMd,
          expectedMd: step.expectedMd,
        })),
      },
    },
    include: {
      templateSteps: {
        orderBy: { stepNo: 'asc' },
      },
    },
  });

  return {
    ...serializeTemplate(item),
    templateSteps: item.templateSteps.map(serializeTemplateStep),
  };
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * プロジェクトにテンプレートが存在するか確認
 */
export async function hasTemplates(projectId: string): Promise<boolean> {
  const count = await prisma.testCaseTemplate.count({
    where: { projectId: BigInt(projectId) },
  });
  return count > 0;
}

/**
 * デフォルトテンプレートを取得
 */
export async function getDefaultTemplate(
  projectId: string
): Promise<TestCaseTemplateDetail | null> {
  const item = await prisma.testCaseTemplate.findFirst({
    where: {
      projectId: BigInt(projectId),
      isDefault: true,
    },
    include: {
      templateSteps: {
        orderBy: { stepNo: 'asc' },
      },
    },
  });

  if (!item) return null;

  return {
    ...serializeTemplate(item),
    templateSteps: item.templateSteps.map(serializeTemplateStep),
  };
}

/**
 * テンプレートをデフォルトに設定（他のデフォルトを解除）
 */
export async function setDefaultTemplate(projectId: string, id: string): Promise<void> {
  await prisma.$transaction([
    // 既存のデフォルトを解除
    prisma.testCaseTemplate.updateMany({
      where: {
        projectId: BigInt(projectId),
        isDefault: true,
      },
      data: { isDefault: false },
    }),
    // 新しいデフォルトを設定
    prisma.testCaseTemplate.update({
      where: {
        id: BigInt(id),
        projectId: BigInt(projectId),
      },
      data: { isDefault: true },
    }),
  ]);
}

/**
 * テンプレートの並び順を更新
 */
export async function updateTemplateSortOrders(
  projectId: string,
  orders: { id: string; sortOrder: number }[]
): Promise<void> {
  await prisma.$transaction(
    orders.map((order) =>
      prisma.testCaseTemplate.update({
        where: {
          id: BigInt(order.id),
          projectId: BigInt(projectId),
        },
        data: { sortOrder: order.sortOrder },
      })
    )
  );
}
