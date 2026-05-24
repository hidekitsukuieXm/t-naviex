import { headers } from 'next/headers';
import { createAuditLog } from '@/lib/repositories/audit-log-repository';
import type { AuditAction, AuditTargetType, CreateAuditLogInput } from '@/types/audit-log';

export type { AuditAction, AuditTargetType };

// リクエストコンテキストからIPアドレスを取得
export async function getClientIpAddress(): Promise<string | null> {
  try {
    const headersList = await headers();
    // X-Forwarded-For ヘッダーをチェック（プロキシ経由の場合）
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) {
      // カンマ区切りの最初のIPアドレスを取得
      return forwardedFor.split(',')[0].trim();
    }
    // X-Real-IP ヘッダーをチェック
    const realIp = headersList.get('x-real-ip');
    if (realIp) {
      return realIp;
    }
    return null;
  } catch {
    return null;
  }
}

// リクエストコンテキストからユーザーエージェントを取得
export async function getClientUserAgent(): Promise<string | null> {
  try {
    const headersList = await headers();
    return headersList.get('user-agent') || null;
  } catch {
    return null;
  }
}

// 監査ログ記録オプション
export interface AuditLogOptions {
  userId?: bigint | string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: bigint | string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// 監査ログを記録
export async function logAudit(options: AuditLogOptions): Promise<void> {
  try {
    // IPアドレスとユーザーエージェントを取得（未指定の場合）
    const ipAddress = options.ipAddress ?? (await getClientIpAddress());
    const userAgent = options.userAgent ?? (await getClientUserAgent());

    // userIdをbigintに変換
    let userId: bigint | null = null;
    if (options.userId !== undefined && options.userId !== null) {
      userId = typeof options.userId === 'string' ? BigInt(options.userId) : options.userId;
    }

    // targetIdをbigintに変換
    let targetId: bigint | null = null;
    if (options.targetId !== undefined && options.targetId !== null) {
      targetId = typeof options.targetId === 'string' ? BigInt(options.targetId) : options.targetId;
    }

    const input: CreateAuditLogInput = {
      userId,
      action: options.action,
      targetType: options.targetType,
      targetId,
      details: options.details,
      ipAddress,
      userAgent,
    };

    await createAuditLog(input);
  } catch (error) {
    // 監査ログの記録失敗はメイン処理に影響を与えないようにする
    console.error('Failed to create audit log:', error);
  }
}

// 認証イベント用ショートカット関数
export async function logLogin(userId: bigint | string): Promise<void> {
  await logAudit({
    userId,
    action: 'LOGIN',
    targetType: 'USER',
    targetId: userId,
  });
}

export async function logLogout(userId: bigint | string): Promise<void> {
  await logAudit({
    userId,
    action: 'LOGOUT',
    targetType: 'USER',
    targetId: userId,
  });
}

export async function logLoginFailed(email: string, ipAddress?: string | null): Promise<void> {
  await logAudit({
    action: 'LOGIN_FAILED',
    targetType: 'USER',
    details: { email },
    ipAddress,
  });
}

export async function logPasswordChange(userId: bigint | string): Promise<void> {
  await logAudit({
    userId,
    action: 'PASSWORD_CHANGE',
    targetType: 'USER',
    targetId: userId,
  });
}

export async function logPasswordResetRequest(email: string): Promise<void> {
  await logAudit({
    action: 'PASSWORD_RESET_REQUEST',
    targetType: 'USER',
    details: { email },
  });
}

export async function logPasswordReset(userId: bigint | string): Promise<void> {
  await logAudit({
    userId,
    action: 'PASSWORD_RESET',
    targetType: 'USER',
    targetId: userId,
  });
}

// ユーザー管理イベント用ショートカット関数
export async function logUserCreate(
  actorUserId: bigint | string,
  targetUserId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'USER_CREATE',
    targetType: 'USER',
    targetId: targetUserId,
    details,
  });
}

export async function logUserUpdate(
  actorUserId: bigint | string,
  targetUserId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'USER_UPDATE',
    targetType: 'USER',
    targetId: targetUserId,
    details,
  });
}

export async function logUserDelete(
  actorUserId: bigint | string,
  targetUserId: bigint | string
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'USER_DELETE',
    targetType: 'USER',
    targetId: targetUserId,
  });
}

export async function logUserLock(
  actorUserId: bigint | string | null,
  targetUserId: bigint | string
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'USER_LOCK',
    targetType: 'USER',
    targetId: targetUserId,
  });
}

export async function logUserUnlock(
  actorUserId: bigint | string,
  targetUserId: bigint | string
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'USER_UNLOCK',
    targetType: 'USER',
    targetId: targetUserId,
  });
}

// ロール管理イベント用ショートカット関数
export async function logRoleCreate(
  actorUserId: bigint | string,
  roleId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'ROLE_CREATE',
    targetType: 'ROLE',
    targetId: roleId,
    details,
  });
}

export async function logRoleUpdate(
  actorUserId: bigint | string,
  roleId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'ROLE_UPDATE',
    targetType: 'ROLE',
    targetId: roleId,
    details,
  });
}

export async function logRoleDelete(
  actorUserId: bigint | string,
  roleId: bigint | string
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'ROLE_DELETE',
    targetType: 'ROLE',
    targetId: roleId,
  });
}

// プロジェクト管理イベント用ショートカット関数
export async function logProjectCreate(
  actorUserId: bigint | string,
  projectId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'PROJECT_CREATE',
    targetType: 'PROJECT',
    targetId: projectId,
    details,
  });
}

export async function logProjectUpdate(
  actorUserId: bigint | string,
  projectId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'PROJECT_UPDATE',
    targetType: 'PROJECT',
    targetId: projectId,
    details,
  });
}

export async function logProjectDelete(
  actorUserId: bigint | string,
  projectId: bigint | string
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'PROJECT_DELETE',
    targetType: 'PROJECT',
    targetId: projectId,
  });
}

export async function logProjectMemberAdd(
  actorUserId: bigint | string,
  projectId: bigint | string,
  memberId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'PROJECT_MEMBER_ADD',
    targetType: 'PROJECT_MEMBER',
    targetId: projectId,
    details: { ...details, memberId: memberId.toString() },
  });
}

export async function logProjectMemberUpdate(
  actorUserId: bigint | string,
  projectId: bigint | string,
  memberId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'PROJECT_MEMBER_UPDATE',
    targetType: 'PROJECT_MEMBER',
    targetId: projectId,
    details: { ...details, memberId: memberId.toString() },
  });
}

export async function logProjectMemberRemove(
  actorUserId: bigint | string,
  projectId: bigint | string,
  memberId: bigint | string
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'PROJECT_MEMBER_REMOVE',
    targetType: 'PROJECT_MEMBER',
    targetId: projectId,
    details: { memberId: memberId.toString() },
  });
}

// 設定変更イベント用ショートカット関数
export async function logPasswordPolicyUpdate(
  actorUserId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'PASSWORD_POLICY_UPDATE',
    targetType: 'PASSWORD_POLICY',
    details,
  });
}

export async function logSessionSettingsUpdate(
  actorUserId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'SESSION_SETTINGS_UPDATE',
    targetType: 'SESSION_SETTINGS',
    details,
  });
}

// テスト仕様書イベント用ショートカット関数
export async function logTestSpecCreate(
  actorUserId: bigint | string,
  testSpecId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'TEST_SPEC_CREATE',
    targetType: 'TEST_SPEC',
    targetId: testSpecId,
    details,
  });
}

export async function logTestSpecUpdate(
  actorUserId: bigint | string,
  testSpecId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'TEST_SPEC_UPDATE',
    targetType: 'TEST_SPEC',
    targetId: testSpecId,
    details,
  });
}

export async function logTestSpecDelete(
  actorUserId: bigint | string,
  testSpecId: bigint | string
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'TEST_SPEC_DELETE',
    targetType: 'TEST_SPEC',
    targetId: testSpecId,
  });
}

export async function logTestSpecVersionCreate(
  actorUserId: bigint | string,
  testSpecId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'TEST_SPEC_VERSION_CREATE',
    targetType: 'TEST_SPEC',
    targetId: testSpecId,
    details,
  });
}

export async function logTestSpecLock(
  actorUserId: bigint | string,
  testSpecId: bigint | string
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'TEST_SPEC_LOCK',
    targetType: 'TEST_SPEC',
    targetId: testSpecId,
  });
}

export async function logTestSpecUnlock(
  actorUserId: bigint | string,
  testSpecId: bigint | string
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'TEST_SPEC_UNLOCK',
    targetType: 'TEST_SPEC',
    targetId: testSpecId,
  });
}

// テストセクションイベント用ショートカット関数
export async function logTestSectionCreate(
  actorUserId: bigint | string,
  sectionId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'TEST_SECTION_CREATE',
    targetType: 'TEST_SECTION',
    targetId: sectionId,
    details,
  });
}

export async function logTestSectionUpdate(
  actorUserId: bigint | string,
  sectionId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'TEST_SECTION_UPDATE',
    targetType: 'TEST_SECTION',
    targetId: sectionId,
    details,
  });
}

export async function logTestSectionDelete(
  actorUserId: bigint | string,
  sectionId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'TEST_SECTION_DELETE',
    targetType: 'TEST_SECTION',
    targetId: sectionId,
    details,
  });
}

export async function logTestSectionMove(
  actorUserId: bigint | string,
  sectionId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'TEST_SECTION_MOVE',
    targetType: 'TEST_SECTION',
    targetId: sectionId,
    details,
  });
}

export async function logTestSectionReorder(
  actorUserId: bigint | string,
  testSpecId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'TEST_SECTION_REORDER',
    targetType: 'TEST_SECTION',
    targetId: testSpecId,
    details,
  });
}

// テストケースイベント用ショートカット関数
export async function logTestCaseCreate(
  actorUserId: bigint | string,
  testCaseId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'TEST_CASE_CREATE',
    targetType: 'TEST_CASE',
    targetId: testCaseId,
    details,
  });
}

export async function logTestCaseUpdate(
  actorUserId: bigint | string,
  testCaseId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'TEST_CASE_UPDATE',
    targetType: 'TEST_CASE',
    targetId: testCaseId,
    details,
  });
}

export async function logTestCaseDelete(
  actorUserId: bigint | string,
  testCaseId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'TEST_CASE_DELETE',
    targetType: 'TEST_CASE',
    targetId: testCaseId,
    details,
  });
}

// その他イベント用ショートカット関数
export async function logAuditLogExport(
  actorUserId: bigint | string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId: actorUserId,
    action: 'AUDIT_LOG_EXPORT',
    targetType: 'AUDIT_LOG',
    details,
  });
}
