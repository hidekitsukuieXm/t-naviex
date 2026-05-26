/**
 * テスト結果添付ファイルリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  TestResultAttachment,
  CreateTestResultAttachmentInput,
  UpdateTestResultAttachmentInput,
} from '@/types/test-result-attachment';

// ============================================
// セレクト定義
// ============================================

const attachmentSelect = {
  id: true,
  testResultId: true,
  fileName: true,
  fileSize: true,
  mimeType: true,
  storagePath: true,
  thumbnailPath: true,
  description: true,
  createdAt: true,
};

// ============================================
// 変換関数
// ============================================

interface DbAttachment {
  id: bigint;
  testResultId: bigint;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  thumbnailPath: string | null;
  description: string | null;
  createdAt: Date;
}

function serializeAttachment(attachment: DbAttachment): TestResultAttachment {
  return {
    id: attachment.id.toString(),
    testResultId: attachment.testResultId.toString(),
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
    mimeType: attachment.mimeType,
    storagePath: attachment.storagePath,
    thumbnailPath: attachment.thumbnailPath,
    description: attachment.description,
    createdAt: attachment.createdAt.toISOString(),
  };
}

// ============================================
// CRUD操作
// ============================================

/**
 * 添付ファイル作成
 */
export async function createAttachment(
  input: CreateTestResultAttachmentInput
): Promise<TestResultAttachment> {
  const attachment = await prisma.testResultAttachment.create({
    data: {
      testResultId: BigInt(input.testResultId),
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      storagePath: input.storagePath,
      thumbnailPath: input.thumbnailPath ?? null,
      description: input.description ?? null,
    },
    select: attachmentSelect,
  });

  return serializeAttachment(attachment as DbAttachment);
}

/**
 * 添付ファイル取得（ID指定）
 */
export async function getAttachmentById(id: bigint): Promise<TestResultAttachment | null> {
  const attachment = await prisma.testResultAttachment.findUnique({
    where: { id },
    select: attachmentSelect,
  });

  if (!attachment) {
    return null;
  }

  return serializeAttachment(attachment as DbAttachment);
}

/**
 * テスト結果の添付ファイル一覧取得
 */
export async function getAttachmentsByTestResultId(
  testResultId: string
): Promise<TestResultAttachment[]> {
  const attachments = await prisma.testResultAttachment.findMany({
    where: { testResultId: BigInt(testResultId) },
    select: attachmentSelect,
    orderBy: { createdAt: 'desc' },
  });

  return attachments.map((a) => serializeAttachment(a as DbAttachment));
}

/**
 * 添付ファイル更新
 */
export async function updateAttachment(
  id: bigint,
  input: UpdateTestResultAttachmentInput
): Promise<TestResultAttachment | null> {
  const existing = await prisma.testResultAttachment.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const attachment = await prisma.testResultAttachment.update({
    where: { id },
    data: {
      description: input.description,
    },
    select: attachmentSelect,
  });

  return serializeAttachment(attachment as DbAttachment);
}

/**
 * 添付ファイル削除
 */
export async function deleteAttachment(id: bigint): Promise<{ success: boolean; error?: string }> {
  const existing = await prisma.testResultAttachment.findUnique({
    where: { id },
    select: { id: true, storagePath: true },
  });

  if (!existing) {
    return { success: false, error: '添付ファイルが見つかりません。' };
  }

  await prisma.testResultAttachment.delete({
    where: { id },
  });

  return { success: true };
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * テスト結果が存在するか確認
 */
export async function testResultExists(testResultId: bigint): Promise<boolean> {
  const testResult = await prisma.testResult.findUnique({
    where: { id: testResultId },
    select: { id: true },
  });

  return testResult !== null;
}

/**
 * 添付ファイルがテスト結果に属しているか確認
 */
export async function attachmentBelongsToTestResult(
  attachmentId: bigint,
  testResultId: bigint
): Promise<boolean> {
  const attachment = await prisma.testResultAttachment.findFirst({
    where: {
      id: attachmentId,
      testResultId,
    },
    select: { id: true },
  });

  return attachment !== null;
}

/**
 * テスト結果の添付ファイル数を取得
 */
export async function getAttachmentCount(testResultId: bigint): Promise<number> {
  return prisma.testResultAttachment.count({
    where: { testResultId },
  });
}
