/**
 * 暗号化ユーティリティ
 * AES-256-GCMを使用して機密データを暗号化/復号化
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

/**
 * 暗号化キーを取得
 */
function getEncryptionKey(): string {
  const key = process.env['ENCRYPTION_KEY'];
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  return key;
}

/**
 * 暗号化キーを派生
 */
function deriveKey(salt: Buffer): Buffer {
  const baseKey = getEncryptionKey();
  return scryptSync(baseKey, salt, KEY_LENGTH);
}

/**
 * 文字列を暗号化
 * @param plainText 平文
 * @returns 暗号化された文字列（Base64エンコード）
 */
export function encrypt(plainText: string): string {
  if (!plainText) return '';

  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Format: salt:iv:authTag:encryptedData (all hex encoded)
  const result = Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, 'hex')]).toString(
    'base64'
  );

  return result;
}

/**
 * 暗号化された文字列を復号化
 * @param encryptedText 暗号化された文字列（Base64エンコード）
 * @returns 復号化された平文
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';

  try {
    const buffer = Buffer.from(encryptedText, 'base64');

    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = buffer.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    const key = deriveKey(salt);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch {
    throw new Error('Failed to decrypt data');
  }
}

/**
 * 暗号化されたデータかどうかを判定
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  try {
    const buffer = Buffer.from(text, 'base64');
    // Minimum length: salt + iv + authTag + 1 byte of data
    return buffer.length >= SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1;
  } catch {
    return false;
  }
}

/**
 * APIキーをマスク表示用に変換
 * @param apiKey APIキー
 * @returns マスクされた文字列（例: "abc...xyz"）
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return '••••••••';
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}
