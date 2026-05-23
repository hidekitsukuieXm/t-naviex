import { NextResponse } from 'next/server';
import type { ResourceType, PermissionAction } from '@/types/role';

// RBAC関連エラークラス

/**
 * 認証エラー（未ログイン）
 */
export class UnauthorizedError extends Error {
  constructor(message: string = '認証が必要です。') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 権限不足エラー（ログイン済みだが権限がない）
 */
export class ForbiddenError extends Error {
  public resource: ResourceType;
  public action: PermissionAction;

  constructor(resource: ResourceType, action: PermissionAction, message?: string) {
    super(message || `${resource}の${action}権限がありません。`);
    this.name = 'ForbiddenError';
    this.resource = resource;
    this.action = action;
  }
}

/**
 * 権限拒否エラー（汎用）
 */
export class PermissionDeniedError extends Error {
  constructor(message: string = 'この操作を実行する権限がありません。') {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * RBACエラーレスポンス型
 */
export interface RBACErrorResponse {
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'PERMISSION_DENIED';
  resource?: ResourceType;
  action?: PermissionAction;
}

/**
 * RBACエラーをHTTPレスポンスに変換
 */
export function handleRBACError(error: unknown): NextResponse<RBACErrorResponse> {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'UNAUTHORIZED' as const,
      },
      { status: 401 }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'FORBIDDEN' as const,
        resource: error.resource,
        action: error.action,
      },
      { status: 403 }
    );
  }

  if (error instanceof PermissionDeniedError) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'PERMISSION_DENIED' as const,
      },
      { status: 403 }
    );
  }

  // 予期しないエラー
  console.error('RBAC Error:', error);
  return NextResponse.json(
    {
      error: 'アクセス権限の確認中にエラーが発生しました。',
      code: 'PERMISSION_DENIED' as const,
    },
    { status: 500 }
  );
}

/**
 * エラーメッセージを日本語で取得
 */
export function getPermissionErrorMessage(
  resource: ResourceType,
  action: PermissionAction
): string {
  const resourceLabels: Record<ResourceType, string> = {
    projects: 'プロジェクト',
    users: 'ユーザー',
    roles: 'ロール',
    testCases: 'テストケース',
    testRuns: 'テストラン',
    testResults: 'テスト結果',
    bugs: 'バグ',
    reports: 'レポート',
    settings: '設定',
  };

  const actionLabels: Record<PermissionAction, string> = {
    create: '作成',
    read: '閲覧',
    update: '更新',
    delete: '削除',
  };

  return `${resourceLabels[resource]}の${actionLabels[action]}権限がありません。`;
}
