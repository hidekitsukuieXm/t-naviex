import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getApiTokenById,
  updateApiToken,
  revokeApiToken,
  deleteApiToken,
  type UpdateApiTokenInput,
} from '@/lib/repositories/api-token-repository';
import {
  validateTokenName,
  validateScopes,
  validateExpiresAt,
  type ApiTokenScope,
} from '@/types/api-token';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tokens/[id] - トークン詳細取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const tokenId = BigInt(id);
    const token = await getApiTokenById(tokenId);

    if (!token) {
      return NextResponse.json({ error: 'トークンが見つかりません。' }, { status: 404 });
    }

    // 自分のトークンのみ取得可能
    if (token.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'このトークンにアクセスする権限がありません。' },
        { status: 403 }
      );
    }

    return NextResponse.json(token);
  } catch (error) {
    console.error('Get API token error:', error);
    return NextResponse.json({ error: 'APIトークンの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/tokens/[id] - トークン更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const tokenId = BigInt(id);
    const existingToken = await getApiTokenById(tokenId);

    if (!existingToken) {
      return NextResponse.json({ error: 'トークンが見つかりません。' }, { status: 404 });
    }

    // 自分のトークンのみ更新可能
    if (existingToken.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'このトークンを更新する権限がありません。' },
        { status: 403 }
      );
    }

    // 失効済みトークンは更新不可
    if (existingToken.revokedAt) {
      return NextResponse.json({ error: '失効済みのトークンは更新できません。' }, { status: 400 });
    }

    const body = await request.json();
    const input: UpdateApiTokenInput = {};

    // トークン名のバリデーション
    if (body.name !== undefined) {
      const nameValidation = validateTokenName(body.name);
      if (!nameValidation.valid) {
        return NextResponse.json({ error: nameValidation.error }, { status: 400 });
      }
      input.name = body.name;
    }

    // スコープのバリデーション
    if (body.scopes !== undefined) {
      if (!Array.isArray(body.scopes)) {
        return NextResponse.json({ error: 'スコープは配列で指定してください。' }, { status: 400 });
      }
      const scopes = body.scopes as ApiTokenScope[];
      const scopesValidation = validateScopes(scopes);
      if (!scopesValidation.valid) {
        return NextResponse.json({ error: scopesValidation.error }, { status: 400 });
      }
      input.scopes = scopes;
    }

    // 有効期限のバリデーション
    if (body.expiresAt !== undefined) {
      if (body.expiresAt !== null) {
        const expiresAtValidation = validateExpiresAt(body.expiresAt);
        if (!expiresAtValidation.valid) {
          return NextResponse.json({ error: expiresAtValidation.error }, { status: 400 });
        }
        input.expiresAt = new Date(body.expiresAt);
      } else {
        input.expiresAt = null;
      }
    }

    // アクティブ状態
    if (body.isActive !== undefined) {
      input.isActive = body.isActive;
    }

    const token = await updateApiToken(tokenId, input);

    return NextResponse.json(token);
  } catch (error) {
    console.error('Update API token error:', error);
    return NextResponse.json({ error: 'APIトークンの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/tokens/[id] - トークン削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const tokenId = BigInt(id);
    const existingToken = await getApiTokenById(tokenId);

    if (!existingToken) {
      return NextResponse.json({ error: 'トークンが見つかりません。' }, { status: 404 });
    }

    // 自分のトークンのみ削除可能
    if (existingToken.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'このトークンを削除する権限がありません。' },
        { status: 403 }
      );
    }

    await deleteApiToken(tokenId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete API token error:', error);
    return NextResponse.json({ error: 'APIトークンの削除に失敗しました。' }, { status: 500 });
  }
}

// POST /api/tokens/[id] - トークン操作（失効など）
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const tokenId = BigInt(id);
    const existingToken = await getApiTokenById(tokenId);

    if (!existingToken) {
      return NextResponse.json({ error: 'トークンが見つかりません。' }, { status: 404 });
    }

    // 自分のトークンのみ操作可能
    if (existingToken.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'このトークンを操作する権限がありません。' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'revoke': {
        if (existingToken.revokedAt) {
          return NextResponse.json(
            { error: 'このトークンは既に失効しています。' },
            { status: 400 }
          );
        }
        const token = await revokeApiToken(tokenId, body.reason);
        return NextResponse.json(token);
      }

      default:
        return NextResponse.json({ error: '無効なアクションです。' }, { status: 400 });
    }
  } catch (error) {
    console.error('API token action error:', error);
    return NextResponse.json({ error: 'APIトークンの操作に失敗しました。' }, { status: 500 });
  }
}
