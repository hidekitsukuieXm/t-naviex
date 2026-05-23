'use client';

import { type ReactNode } from 'react';
import type { ResourceType, PermissionAction, Permissions } from '@/types/role';
import { hasPermission } from '@/types/role';

/**
 * PermissionGate Props
 */
export interface PermissionGateProps {
  /** ユーザーの権限 */
  permissions: Permissions | null | undefined;
  /** 必要なリソースタイプ */
  resource: ResourceType;
  /** 必要なアクション */
  action: PermissionAction;
  /** 権限がある場合に表示するコンテンツ */
  children: ReactNode;
  /** 権限がない場合に表示するコンテンツ（オプション） */
  fallback?: ReactNode;
  /** 複数の権限をチェックする場合（AND条件） */
  requiredPermissions?: Array<{ resource: ResourceType; action: PermissionAction }>;
  /** 複数の権限のいずれかを持っていればOK（OR条件） */
  anyPermission?: boolean;
}

/**
 * 権限に基づいてコンテンツを条件付きでレンダリングするコンポーネント
 *
 * @example
 * ```tsx
 * // 単一の権限チェック
 * <PermissionGate
 *   permissions={userPermissions}
 *   resource="testCases"
 *   action="create"
 * >
 *   <CreateTestCaseButton />
 * </PermissionGate>
 *
 * // 権限がない場合のフォールバック
 * <PermissionGate
 *   permissions={userPermissions}
 *   resource="testCases"
 *   action="delete"
 *   fallback={<span>削除権限がありません</span>}
 * >
 *   <DeleteButton />
 * </PermissionGate>
 *
 * // 複数の権限をチェック（AND条件）
 * <PermissionGate
 *   permissions={userPermissions}
 *   resource="projects"
 *   action="read"
 *   requiredPermissions={[
 *     { resource: 'projects', action: 'read' },
 *     { resource: 'testCases', action: 'create' },
 *   ]}
 * >
 *   <AdminPanel />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permissions,
  resource,
  action,
  children,
  fallback = null,
  requiredPermissions,
  anyPermission = false,
}: PermissionGateProps): ReactNode {
  // 権限がない場合
  if (!permissions) {
    return fallback;
  }

  // 複数の権限をチェックする場合
  if (requiredPermissions && requiredPermissions.length > 0) {
    const checks = requiredPermissions.map((perm) =>
      hasPermission(permissions, perm.resource, perm.action)
    );

    const hasRequiredPermissions = anyPermission
      ? checks.some(Boolean) // OR条件
      : checks.every(Boolean); // AND条件

    return hasRequiredPermissions ? children : fallback;
  }

  // 単一の権限をチェック
  const isAuthorized = hasPermission(permissions, resource, action);

  return isAuthorized ? children : fallback;
}

/**
 * 権限チェック用のヘルパー関数
 */
export function canPerform(
  permissions: Permissions | null | undefined,
  resource: ResourceType,
  action: PermissionAction
): boolean {
  if (!permissions) {
    return false;
  }
  return hasPermission(permissions, resource, action);
}

/**
 * 複数の権限をチェックするヘルパー関数
 */
export function canPerformAll(
  permissions: Permissions | null | undefined,
  checks: Array<{ resource: ResourceType; action: PermissionAction }>
): boolean {
  if (!permissions) {
    return false;
  }
  return checks.every((check) => hasPermission(permissions, check.resource, check.action));
}

/**
 * 複数の権限のいずれかを持っているかチェックするヘルパー関数
 */
export function canPerformAny(
  permissions: Permissions | null | undefined,
  checks: Array<{ resource: ResourceType; action: PermissionAction }>
): boolean {
  if (!permissions) {
    return false;
  }
  return checks.some((check) => hasPermission(permissions, check.resource, check.action));
}
