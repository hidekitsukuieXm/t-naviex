import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ResourceType, PermissionAction, Permissions } from '@/types/role';
import { hasPermission } from '@/types/role';
import {
  UnauthorizedError,
  ForbiddenError,
  handleRBACError,
  getPermissionErrorMessage,
} from './errors';

/**
 * 権限チェック結果
 */
export interface PermissionCheckResult {
  authorized: boolean;
  userId?: string;
  projectId?: string;
  role?: {
    id: string;
    name: string;
    permissions: Permissions;
  };
  error?: string;
}

/**
 * withPermission オプション
 */
export interface WithPermissionOptions {
  /** リソースタイプ */
  resource: ResourceType;
  /** 必要なアクション */
  action: PermissionAction;
  /** プロジェクトIDの取得方法（デフォルト: URLパラメータから取得） */
  getProjectId?: (
    request: Request,
    params?: Record<string, string>
  ) => Promise<string | null> | string | null;
  /** プロジェクトコンテキストが不要な場合（システム全体の操作など） */
  systemLevel?: boolean;
}

/**
 * ユーザーのプロジェクト内ロールと権限を取得
 */
async function getUserProjectRole(
  userId: string,
  projectId: string
): Promise<{ id: string; name: string; permissions: Permissions } | null> {
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: BigInt(projectId),
        userId: BigInt(userId),
      },
    },
    select: {
      role: {
        select: {
          id: true,
          name: true,
          permissions: true,
        },
      },
    },
  });

  if (!member) {
    return null;
  }

  return {
    id: member.role.id.toString(),
    name: member.role.name,
    permissions: member.role.permissions as Permissions,
  };
}

/**
 * システム管理者かどうかをチェック
 */
async function isSystemAdmin(userId: string): Promise<boolean> {
  // いずれかのプロジェクトでSYSTEM_ADMINロールを持っているかチェック
  const adminMembership = await prisma.projectMember.findFirst({
    where: {
      userId: BigInt(userId),
      role: {
        name: 'SYSTEM_ADMIN',
      },
    },
  });

  return !!adminMembership;
}

/**
 * 権限をチェック（プロジェクトコンテキストあり）
 */
export async function checkPermission(
  userId: string,
  projectId: string,
  resource: ResourceType,
  action: PermissionAction
): Promise<PermissionCheckResult> {
  const role = await getUserProjectRole(userId, projectId);

  if (!role) {
    return {
      authorized: false,
      userId,
      projectId,
      error: 'このプロジェクトのメンバーではありません。',
    };
  }

  const authorized = hasPermission(role.permissions, resource, action);

  return {
    authorized,
    userId,
    projectId,
    role,
    error: authorized ? undefined : getPermissionErrorMessage(resource, action),
  };
}

/**
 * システムレベルの権限をチェック（プロジェクトコンテキストなし）
 */
export async function checkSystemPermission(
  userId: string,
  resource: ResourceType,
  action: PermissionAction
): Promise<PermissionCheckResult> {
  // システム管理者はすべての操作が可能
  const admin = await isSystemAdmin(userId);

  if (admin) {
    return {
      authorized: true,
      userId,
    };
  }

  // システムレベルの操作には管理者権限が必要
  return {
    authorized: false,
    userId,
    error: getPermissionErrorMessage(resource, action) + ' システム管理者権限が必要です。',
  };
}

/**
 * 権限チェック付きAPIルートハンドラー
 *
 * @example
 * ```ts
 * export const GET = withPermission(
 *   { resource: 'testCases', action: 'read' },
 *   async (request, context) => {
 *     // context.userId, context.projectId, context.role が利用可能
 *     return NextResponse.json({ data: 'protected data' });
 *   }
 * );
 * ```
 */
export function withPermission<T extends Record<string, string> = Record<string, string>>(
  options: WithPermissionOptions,
  handler: (
    request: Request,
    context: {
      params: Promise<T>;
      userId: string;
      projectId: string | null;
      role: { id: string; name: string; permissions: Permissions } | null;
    }
  ) => Promise<NextResponse>
) {
  return async (request: Request, { params }: { params: Promise<T> }): Promise<NextResponse> => {
    try {
      // 認証チェック
      const session = await auth();
      if (!session?.user?.id) {
        throw new UnauthorizedError();
      }

      const userId = session.user.id;
      const resolvedParams = await params;

      // システムレベルの操作の場合
      if (options.systemLevel) {
        const result = await checkSystemPermission(userId, options.resource, options.action);
        if (!result.authorized) {
          throw new ForbiddenError(options.resource, options.action, result.error);
        }

        return handler(request, {
          params: Promise.resolve(resolvedParams),
          userId,
          projectId: null,
          role: null,
        });
      }

      // プロジェクトIDの取得
      let projectId: string | null = null;

      if (options.getProjectId) {
        projectId = await options.getProjectId(request, resolvedParams);
      } else {
        // デフォルト: URLパラメータから取得（id または projectId）
        projectId = resolvedParams.id || resolvedParams.projectId || null;
      }

      // プロジェクトIDがない場合はクエリパラメータをチェック
      if (!projectId) {
        const url = new URL(request.url);
        projectId = url.searchParams.get('projectId');
      }

      if (!projectId) {
        return NextResponse.json(
          { error: 'プロジェクトIDが指定されていません。' },
          { status: 400 }
        );
      }

      // 権限チェック
      const result = await checkPermission(userId, projectId, options.resource, options.action);
      if (!result.authorized) {
        throw new ForbiddenError(options.resource, options.action, result.error);
      }

      return handler(request, {
        params: Promise.resolve(resolvedParams),
        userId,
        projectId,
        role: result.role || null,
      });
    } catch (error) {
      return handleRBACError(error);
    }
  };
}

/**
 * 権限を要求するヘルパー（手動チェック用）
 *
 * @example
 * ```ts
 * export async function GET(request: Request) {
 *   const session = await auth();
 *   if (!session?.user?.id) {
 *     return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
 *   }
 *
 *   try {
 *     await requirePermission(session.user.id, projectId, 'testCases', 'read');
 *   } catch (error) {
 *     return handleRBACError(error);
 *   }
 *
 *   // 権限チェック通過
 * }
 * ```
 */
export async function requirePermission(
  userId: string,
  projectId: string,
  resource: ResourceType,
  action: PermissionAction
): Promise<void> {
  const result = await checkPermission(userId, projectId, resource, action);

  if (!result.authorized) {
    throw new ForbiddenError(resource, action, result.error);
  }
}

/**
 * システム管理者権限を要求するヘルパー
 */
export async function requireSystemAdmin(userId: string): Promise<void> {
  const admin = await isSystemAdmin(userId);

  if (!admin) {
    throw new ForbiddenError('settings', 'update', 'この操作にはシステム管理者権限が必要です。');
  }
}
