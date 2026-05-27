/**
 * Multi-Factor Authentication Types
 *
 * 多要素認証の型定義
 */

// ====================================
// Enums
// ====================================

/**
 * MFAタイプ
 */
export const MfaType = {
  TOTP: 'TOTP',
  SMS: 'SMS',
  EMAIL: 'EMAIL',
} as const;

export type MfaType = (typeof MfaType)[keyof typeof MfaType];

// ====================================
// Core Types
// ====================================

/**
 * MFA設定
 */
export interface MfaSetting {
  id: string;
  userId: string;
  mfaType: MfaType;
  isEnabled: boolean;
  isVerified: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MFAバックアップコード
 */
export interface MfaBackupCode {
  id: string;
  mfaSettingId: string;
  isUsed: boolean;
  usedAt?: Date;
  createdAt: Date;
}

/**
 * MFA認証ログ
 */
export interface MfaAuthLog {
  id: string;
  userId: string;
  mfaType: MfaType;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ====================================
// API Types
// ====================================

/**
 * MFA設定開始リクエスト
 */
export interface SetupMfaRequest {
  mfaType: MfaType;
}

/**
 * MFA設定開始レスポンス
 */
export interface SetupMfaResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

/**
 * MFA検証リクエスト
 */
export interface VerifyMfaRequest {
  code: string;
  mfaType?: MfaType;
}

/**
 * MFA検証レスポンス
 */
export interface VerifyMfaResponse {
  success: boolean;
  message?: string;
}

/**
 * MFA有効化リクエスト
 */
export interface EnableMfaRequest {
  code: string;
}

/**
 * MFA無効化リクエスト
 */
export interface DisableMfaRequest {
  code: string;
  password?: string;
}

/**
 * バックアップコード再生成レスポンス
 */
export interface RegenerateBackupCodesResponse {
  backupCodes: string[];
}

/**
 * MFAステータスレスポンス
 */
export interface MfaStatusResponse {
  isEnabled: boolean;
  mfaType?: MfaType;
  backupCodesRemaining?: number;
  lastUsedAt?: Date;
}

// ====================================
// Utility Functions
// ====================================

/**
 * MFAタイプのラベルを取得
 */
export function getMfaTypeLabel(type: MfaType): string {
  const labels: Record<MfaType, string> = {
    [MfaType.TOTP]: '認証アプリ',
    [MfaType.SMS]: 'SMS認証',
    [MfaType.EMAIL]: 'メール認証',
  };
  return labels[type] || type;
}

/**
 * MFAタイプの説明を取得
 */
export function getMfaTypeDescription(type: MfaType): string {
  const descriptions: Record<MfaType, string> = {
    [MfaType.TOTP]: 'Google AuthenticatorなどのTOTP認証アプリを使用',
    [MfaType.SMS]: '登録された電話番号にSMSでコードを送信',
    [MfaType.EMAIL]: '登録されたメールアドレスにコードを送信',
  };
  return descriptions[type] || '';
}

/**
 * TOTPコードを検証（形式チェック）
 */
export function validateTotpCode(code: string): boolean {
  // 6桁の数字
  return /^\d{6}$/.test(code);
}

/**
 * バックアップコードを検証（形式チェック）
 */
export function validateBackupCode(code: string): boolean {
  // 8文字の英数字（ハイフン含む可能性）
  return /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(code);
}

/**
 * バックアップコードをフォーマット
 */
export function formatBackupCode(code: string): string {
  const clean = code.replace(/-/g, '').toUpperCase();
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
}

/**
 * QRコード用のOTPAuthURL生成
 */
export function generateOtpAuthUrl(
  secret: string,
  accountName: string,
  issuer: string = 'T-NaviEX'
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * バックアップコードの残り数を計算
 */
export function countRemainingBackupCodes(codes: MfaBackupCode[]): number {
  return codes.filter((code) => !code.isUsed).length;
}

/**
 * MFA設定が完了しているかチェック
 */
export function isMfaConfigured(setting: MfaSetting | null | undefined): boolean {
  return !!setting && setting.isEnabled && setting.isVerified;
}

/**
 * デフォルトのバックアップコード数
 */
export const DEFAULT_BACKUP_CODE_COUNT = 10;

/**
 * TOTPのタイムステップ（秒）
 */
export const TOTP_TIME_STEP = 30;

/**
 * TOTPの許容範囲（前後何ステップまで許可するか）
 */
export const TOTP_WINDOW = 1;
