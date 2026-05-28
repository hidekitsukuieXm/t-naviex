import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createApiToken,
  getApiTokens,
  type CreateApiTokenInput,
  type ApiTokenSearchParams,
} from '@/lib/repositories/api-token-repository';
import {
  validateTokenName,
  validateScopes,
  validateExpiresAt,
  validateIpAddress,
  type ApiTokenScope,
  ALL_API_TOKEN_SCOPES,
} from '@/types/api-token';

// GET /api/tokens - トークン一覧取得
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const params: ApiTokenSearchParams = {
      userId: BigInt(session.user.id),
      isActive:
        searchParams.get('isActive') === 'true'
          ? true
          : searchParams.get('isActive') === 'false'
            ? false
            : undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sortBy: (searchParams.get('sortBy') as ApiTokenSearchParams['sortBy']) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as ApiTokenSearchParams['sortOrder']) || 'desc',
    };

    const result = await getApiTokens(params);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get API tokens error:', error);
    return NextResponse.json({ error: 'APIトークン一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/tokens - トークン作成
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();

    // トークン名のバリデーション
    const nameValidation = validateTokenName(body.name);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }

    // スコープのバリデーション
    if (!body.scopes || !Array.isArray(body.scopes)) {
      return NextResponse.json({ error: 'スコープは配列で指定してください。' }, { status: 400 });
    }

    const scopes = body.scopes as ApiTokenScope[];
    const scopesValidation = validateScopes(scopes);
    if (!scopesValidation.valid) {
      return NextResponse.json({ error: scopesValidation.error }, { status: 400 });
    }

    // 有効期限のバリデーション
    let expiresAt: Date | null = null;
    if (body.expiresAt) {
      const expiresAtValidation = validateExpiresAt(body.expiresAt);
      if (!expiresAtValidation.valid) {
        return NextResponse.json({ error: expiresAtValidation.error }, { status: 400 });
      }
      expiresAt = new Date(body.expiresAt);
    }

    // IPホワイトリストのバリデーション
    let ipWhitelists: string[] = [];
    if (body.ipWhitelists && Array.isArray(body.ipWhitelists)) {
      for (const ip of body.ipWhitelists) {
        const ipValidation = validateIpAddress(ip);
        if (!ipValidation.valid) {
          return NextResponse.json(
            { error: `IPアドレス "${ip}": ${ipValidation.error}` },
            { status: 400 }
          );
        }
      }
      ipWhitelists = body.ipWhitelists;
    }

    const input: CreateApiTokenInput = {
      userId: BigInt(session.user.id),
      name: body.name,
      scopes,
      expiresAt,
      ipWhitelists,
    };

    const result = await createApiToken(input);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Create API token error:', error);
    return NextResponse.json({ error: 'APIトークンの作成に失敗しました。' }, { status: 500 });
  }
}
