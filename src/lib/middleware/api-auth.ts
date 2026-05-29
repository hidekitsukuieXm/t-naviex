import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateByToken,
  updateTokenLastUsed,
  logTokenUsage,
  checkAndUpdateRateLimit,
  isIpWhitelisted,
} from '@/lib/repositories/api-token-repository';
import type { ApiTokenScope } from '@/types/api-token';

// APIレスポンスの標準フォーマット
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    rateLimit?: {
      remaining: number;
      resetAt: string;
    };
  };
}

// 認証コンテキスト
export interface AuthContext {
  tokenId: bigint;
  userId: bigint;
  userName: string;
  userEmail: string;
  scopes: ApiTokenScope[];
}

// リクエストIDを生成
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// IPアドレスを取得
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return '127.0.0.1';
}

// 成功レスポンスを作成
export function createSuccessResponse<T>(
  data: T,
  requestId: string,
  rateLimitInfo?: { remaining: number; resetAt: Date }
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      ...(rateLimitInfo && {
        rateLimit: {
          remaining: rateLimitInfo.remaining,
          resetAt: rateLimitInfo.resetAt.toISOString(),
        },
      }),
    },
  };

  const headers: Record<string, string> = {
    'X-Request-Id': requestId,
  };

  if (rateLimitInfo) {
    headers['X-RateLimit-Remaining'] = rateLimitInfo.remaining.toString();
    headers['X-RateLimit-Reset'] = rateLimitInfo.resetAt.toISOString();
  }

  return NextResponse.json(response, { headers });
}

// エラーレスポンスを作成
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  requestId: string,
  details?: unknown
): NextResponse<ApiResponse<never>> {
  const response: ApiResponse<never> = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, {
    status,
    headers: { 'X-Request-Id': requestId },
  });
}

// 一般的なエラーコード
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  RATE_LIMITED: 'RATE_LIMITED',
  IP_NOT_ALLOWED: 'IP_NOT_ALLOWED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  INSUFFICIENT_SCOPE: 'INSUFFICIENT_SCOPE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

// APIミドルウェアオプション
export interface ApiMiddlewareOptions {
  requiredScopes?: ApiTokenScope[];
  requireAllScopes?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMinutes: number;
  };
  skipRateLimit?: boolean;
}

// API認証ミドルウェア
export async function withApiAuth<T>(
  request: NextRequest,
  handler: (context: AuthContext, requestId: string) => Promise<NextResponse<T>>,
  options: ApiMiddlewareOptions = {}
): Promise<NextResponse<ApiResponse<T> | ApiResponse<never>>> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const ipAddress = getClientIp(request);

  try {
    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        '認証が必要です。Authorization ヘッダーを設定してください。',
        401,
        requestId
      );
    }

    // Bearer トークンを抽出
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) {
      return createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        '無効な認証形式です。Bearer トークンを使用してください。',
        401,
        requestId
      );
    }

    const plainToken = tokenMatch[1];

    // トークンを認証
    const authResult = await authenticateByToken(plainToken);
    if (!authResult.valid || !authResult.token) {
      const errorCode =
        authResult.error === 'トークンの有効期限が切れています'
          ? ErrorCodes.TOKEN_EXPIRED
          : authResult.error === 'トークンは失効しています'
            ? ErrorCodes.TOKEN_REVOKED
            : ErrorCodes.UNAUTHORIZED;

      return createErrorResponse(
        errorCode,
        authResult.error || '認証に失敗しました。',
        401,
        requestId
      );
    }

    const token = authResult.token;

    // IPホワイトリストをチェック
    const ipAllowed = await isIpWhitelisted(token.id, ipAddress);
    if (!ipAllowed) {
      return createErrorResponse(
        ErrorCodes.IP_NOT_ALLOWED,
        'このIPアドレスからのアクセスは許可されていません。',
        403,
        requestId
      );
    }

    // スコープをチェック
    if (options.requiredScopes && options.requiredScopes.length > 0) {
      const tokenScopes = token.scopes as ApiTokenScope[];
      const hasAdmin = tokenScopes.includes('ADMIN');

      if (!hasAdmin) {
        const hasRequired = options.requireAllScopes
          ? options.requiredScopes.every((scope) => tokenScopes.includes(scope))
          : options.requiredScopes.some((scope) => tokenScopes.includes(scope));

        if (!hasRequired) {
          return createErrorResponse(
            ErrorCodes.INSUFFICIENT_SCOPE,
            `必要な権限がありません。必要なスコープ: ${options.requiredScopes.join(', ')}`,
            403,
            requestId
          );
        }
      }
    }

    // レート制限をチェック
    let rateLimitInfo: { remaining: number; resetAt: Date } | undefined;
    if (!options.skipRateLimit) {
      const rateLimit = options.rateLimit || { maxRequests: 1000, windowMinutes: 60 };
      const rateLimitResult = await checkAndUpdateRateLimit(
        token.id,
        rateLimit.maxRequests,
        rateLimit.windowMinutes
      );

      rateLimitInfo = {
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      };

      if (!rateLimitResult.allowed) {
        return createErrorResponse(
          ErrorCodes.RATE_LIMITED,
          `レート制限を超えました。${rateLimit.windowMinutes}分間に${rateLimit.maxRequests}リクエストまで許可されています。`,
          429,
          requestId
        );
      }
    }

    // 最終使用を更新
    await updateTokenLastUsed(token.id, ipAddress);

    // 認証コンテキストを作成
    const context: AuthContext = {
      tokenId: token.id,
      userId: token.user.id,
      userName: token.user.name,
      userEmail: token.user.email,
      scopes: token.scopes as ApiTokenScope[],
    };

    // ハンドラーを実行
    const response = await handler(context, requestId);

    // 使用ログを記録
    const responseTime = Date.now() - startTime;
    const responseStatus = response.status || 200;

    await logTokenUsage({
      tokenId: token.id,
      method: request.method,
      endpoint: new URL(request.url).pathname,
      statusCode: responseStatus,
      ipAddress,
      userAgent: request.headers.get('user-agent') || undefined,
      responseTime,
    });

    // レート制限ヘッダーを追加
    if (rateLimitInfo) {
      response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitInfo.resetAt.toISOString());
    }

    return response as NextResponse<ApiResponse<T> | ApiResponse<never>>;
  } catch (error) {
    console.error('API authentication error:', error);

    // エラーログを記録
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `API Error: ${request.method} ${new URL(request.url).pathname} - ${errorMessage} (${Date.now() - startTime}ms)`
    );

    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'サーバー内部エラーが発生しました。',
      500,
      requestId
    );
  }
}

// ページネーションパラメータを解析
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  return { page, limit };
}

// ページネーションメタデータを作成
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
): {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
