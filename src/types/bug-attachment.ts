/**
 * バグ添付ファイル型定義
 */

import { z } from 'zod';

// ============================================
// Constants
// ============================================

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
];

// ============================================
// Zod Schemas
// ============================================

export const bugAttachmentFileNameSchema = z
  .string()
  .min(1, 'ファイル名は必須です')
  .max(255, 'ファイル名は255文字以内で入力してください');

export const bugAttachmentDescriptionSchema = z
  .string()
  .max(500, '説明は500文字以内で入力してください')
  .optional()
  .nullable();

export const createBugAttachmentSchema = z.object({
  bugId: z.bigint().or(z.number().transform((n) => BigInt(n))),
  uploadedById: z.bigint().or(z.number().transform((n) => BigInt(n))),
  fileName: bugAttachmentFileNameSchema,
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE, `ファイルサイズは${MAX_FILE_SIZE / 1024 / 1024}MB以内にしてください`),
  mimeType: z
    .string()
    .max(100)
    .refine((v) => ALLOWED_MIME_TYPES.includes(v), {
      message: 'このファイル形式はサポートされていません',
    }),
  storagePath: z.string().max(500),
  thumbnailPath: z.string().max(500).optional().nullable(),
  description: bugAttachmentDescriptionSchema,
});

// ============================================
// Types
// ============================================

export type CreateBugAttachmentInput = z.infer<typeof createBugAttachmentSchema>;

export interface BugAttachment {
  id: bigint;
  bugId: bigint;
  uploadedById: bigint;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  thumbnailPath: string | null;
  description: string | null;
  createdAt: Date;
}

export interface BugAttachmentWithRelations extends BugAttachment {
  uploadedBy?: { id: bigint; name: string; email: string };
}

// ============================================
// Validation Functions
// ============================================

export function validateBugAttachmentFileName(fileName: string): {
  valid: boolean;
  error?: string;
} {
  const result = bugAttachmentFileNameSchema.safeParse(fileName);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateBugAttachmentFileSize(fileSize: number): {
  valid: boolean;
  error?: string;
} {
  if (fileSize <= 0) {
    return { valid: false, error: 'ファイルサイズは0より大きい必要があります' };
  }
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `ファイルサイズは${MAX_FILE_SIZE / 1024 / 1024}MB以内にしてください`,
    };
  }
  return { valid: true };
}

export function validateBugAttachmentMimeType(mimeType: string): {
  valid: boolean;
  error?: string;
} {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: 'このファイル形式はサポートされていません' };
  }
  return { valid: true };
}

export function validateCreateBugAttachmentInput(input: unknown): {
  valid: boolean;
  data?: CreateBugAttachmentInput;
  error?: string;
} {
  const result = createBugAttachmentSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

// ============================================
// Helper Functions
// ============================================

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
