/**
 * メールテンプレートリポジトリ
 */

import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import type {
  EmailTemplate,
  EmailTemplateType,
  CreateEmailTemplateInput,
  UpdateEmailTemplateInput,
  EmailTemplateSearchParams,
  EmailTemplateListResponse,
} from '@/types/email-template';

/**
 * メールテンプレート一覧を取得
 */
export async function getEmailTemplates(
  params: EmailTemplateSearchParams = {}
): Promise<EmailTemplateListResponse> {
  const { type, isActive, query, page = 1, limit = 20 } = params;

  const where: Prisma.EmailTemplateWhereInput = {};

  if (type) {
    where.type = type;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { subject: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ];
  }

  const [templates, total] = await Promise.all([
    prisma.emailTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { type: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.emailTemplate.count({ where }),
  ]);

  return {
    templates: templates.map(serializeEmailTemplate),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * メールテンプレートをIDで取得
 */
export async function getEmailTemplateById(id: bigint | string): Promise<EmailTemplate | null> {
  const template = await prisma.emailTemplate.findUnique({
    where: { id: typeof id === 'string' ? BigInt(id) : id },
  });

  return template ? serializeEmailTemplate(template) : null;
}

/**
 * メールテンプレートを名前で取得
 */
export async function getEmailTemplateByName(name: string): Promise<EmailTemplate | null> {
  const template = await prisma.emailTemplate.findUnique({
    where: { name },
  });

  return template ? serializeEmailTemplate(template) : null;
}

/**
 * メールテンプレートをタイプで取得（デフォルトテンプレート優先）
 */
export async function getEmailTemplateByType(
  type: EmailTemplateType
): Promise<EmailTemplate | null> {
  // まずデフォルトテンプレートを探す
  let template = await prisma.emailTemplate.findFirst({
    where: { type, isDefault: true, isActive: true },
  });

  // デフォルトがなければ有効なテンプレートを探す
  if (!template) {
    template = await prisma.emailTemplate.findFirst({
      where: { type, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  return template ? serializeEmailTemplate(template) : null;
}

/**
 * メールテンプレートを作成
 */
export async function createEmailTemplate(data: CreateEmailTemplateInput): Promise<EmailTemplate> {
  // 同じタイプでisDefaultがtrueの場合、既存のデフォルトを解除
  if (data.isDefault && data.type) {
    await prisma.emailTemplate.updateMany({
      where: { type: data.type, isDefault: true },
      data: { isDefault: false },
    });
  }

  const template = await prisma.emailTemplate.create({
    data: {
      name: data.name,
      type: data.type ?? 'CUSTOM',
      subject: data.subject,
      body: data.body,
      variables: data.variables ?? [],
      description: data.description,
      isActive: data.isActive ?? true,
      isDefault: data.isDefault ?? false,
    },
  });

  return serializeEmailTemplate(template);
}

/**
 * メールテンプレートを更新
 */
export async function updateEmailTemplate(
  id: bigint | string,
  data: UpdateEmailTemplateInput
): Promise<EmailTemplate | null> {
  const templateId = typeof id === 'string' ? BigInt(id) : id;

  const existing = await prisma.emailTemplate.findUnique({
    where: { id: templateId },
  });

  if (!existing) {
    return null;
  }

  // isDefaultがtrueに変更される場合、同じタイプの既存デフォルトを解除
  if (data.isDefault === true) {
    const type = data.type ?? existing.type;
    await prisma.emailTemplate.updateMany({
      where: {
        type,
        isDefault: true,
        id: { not: templateId },
      },
      data: { isDefault: false },
    });
  }

  const template = await prisma.emailTemplate.update({
    where: { id: templateId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.body !== undefined && { body: data.body }),
      ...(data.variables !== undefined && { variables: data.variables }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
    },
  });

  return serializeEmailTemplate(template);
}

/**
 * メールテンプレートを削除
 */
export async function deleteEmailTemplate(id: bigint | string): Promise<boolean> {
  const templateId = typeof id === 'string' ? BigInt(id) : id;

  try {
    await prisma.emailTemplate.delete({
      where: { id: templateId },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * デフォルトテンプレートを初期化
 */
export async function initializeDefaultTemplates(
  templates: CreateEmailTemplateInput[]
): Promise<number> {
  let created = 0;

  for (const template of templates) {
    const existing = await prisma.emailTemplate.findUnique({
      where: { name: template.name },
    });

    if (!existing) {
      await prisma.emailTemplate.create({
        data: {
          name: template.name,
          type: template.type ?? 'CUSTOM',
          subject: template.subject,
          body: template.body,
          variables: template.variables ?? [],
          description: template.description,
          isActive: template.isActive ?? true,
          isDefault: template.isDefault ?? false,
        },
      });
      created++;
    }
  }

  return created;
}

/**
 * メールテンプレートデータをシリアライズ
 */
function serializeEmailTemplate(template: {
  id: bigint;
  name: string;
  type: string;
  subject: string;
  body: string;
  variables: unknown;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): EmailTemplate {
  return {
    id: template.id.toString(),
    name: template.name,
    type: template.type as EmailTemplateType,
    subject: template.subject,
    body: template.body,
    variables: (template.variables as string[]) ?? [],
    description: template.description,
    isActive: template.isActive,
    isDefault: template.isDefault,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}
