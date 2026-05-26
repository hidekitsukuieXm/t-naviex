/**
 * テスト結果添付ファイル型定義
 */

// ============================================
// 基本型定義
// ============================================

export interface TestResultAttachment {
  id: string;
  testResultId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  thumbnailPath: string | null;
  description: string | null;
  createdAt: string;
}

// ============================================
// 入力型定義
// ============================================

export interface CreateTestResultAttachmentInput {
  testResultId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  thumbnailPath?: string | null;
  description?: string | null;
}

export interface UpdateTestResultAttachmentInput {
  description?: string | null;
}

// ============================================
// バリデーション定数
// ============================================

export const ATTACHMENT_FILE_NAME_MAX_LENGTH = 255;
export const ATTACHMENT_DESCRIPTION_MAX_LENGTH = 500;
export const ATTACHMENT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

export const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// ============================================
// バリデーション関数
// ============================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileName(fileName: string): ValidationResult {
  if (!fileName || fileName.trim().length === 0) {
    return { valid: false, error: 'ファイル名は必須です。' };
  }
  if (fileName.length > ATTACHMENT_FILE_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `ファイル名は${ATTACHMENT_FILE_NAME_MAX_LENGTH}文字以内で入力してください。`,
    };
  }
  return { valid: true };
}

export function validateFileSize(fileSize: number): ValidationResult {
  if (fileSize <= 0) {
    return { valid: false, error: 'ファイルサイズは0より大きい必要があります。' };
  }
  if (fileSize > ATTACHMENT_MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `ファイルサイズは${ATTACHMENT_MAX_FILE_SIZE / 1024 / 1024}MB以内にしてください。`,
    };
  }
  return { valid: true };
}

export function validateMimeType(mimeType: string): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: 'サポートされていないファイル形式です。',
    };
  }
  return { valid: true };
}

export function validateDescription(description: string | null): ValidationResult {
  if (description && description.length > ATTACHMENT_DESCRIPTION_MAX_LENGTH) {
    return {
      valid: false,
      error: `説明は${ATTACHMENT_DESCRIPTION_MAX_LENGTH}文字以内で入力してください。`,
    };
  }
  return { valid: true };
}

// ============================================
// ユーティリティ関数
// ============================================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isImageFile(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}
