import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getApiTokenById,
  getTokenIpWhitelists,
  addIpWhitelist,
  removeIpWhitelist,
} from '@/lib/repositories/api-token-repository';
import { validateIpAddress } from '@/types/api-token';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tokens/[id]/ip-whitelist - IPホワイトリスト一覧取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const tokenId = BigInt(id);

    // トークンの存在確認と所有者確認
    const token = await getApiTokenById(tokenId);
    if (!token) {
      return NextResponse.json({ error: 'トークンが見つかりません。' }, { status: 404 });
    }

    // 自分のトークンまたは管理者のみアクセス可能
    if (token.userId !== session.user.id && false /* TODO: implement admin check */) {
      return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
    }

    const whitelists = await getTokenIpWhitelists(tokenId);
    return NextResponse.json({ whitelists });
  } catch (error) {
    console.error('Get IP whitelist error:', error);
    return NextResponse.json({ error: 'IPホワイトリストの取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/tokens/[id]/ip-whitelist - IPホワイトリスト追加
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const tokenId = BigInt(id);

    // トークンの存在確認と所有者確認
    const token = await getApiTokenById(tokenId);
    if (!token) {
      return NextResponse.json({ error: 'トークンが見つかりません。' }, { status: 404 });
    }

    // 自分のトークンまたは管理者のみアクセス可能
    if (token.userId !== session.user.id && false /* TODO: implement admin check */) {
      return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
    }

    const body = await request.json();

    // バリデーション
    if (!body.ipAddress) {
      return NextResponse.json({ error: 'IPアドレスは必須です。' }, { status: 400 });
    }

    const validation = validateIpAddress(body.ipAddress);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const whitelist = await addIpWhitelist(tokenId, body.ipAddress, body.description);

    return NextResponse.json(whitelist, { status: 201 });
  } catch (error) {
    console.error('Add IP whitelist error:', error);
    return NextResponse.json({ error: 'IPホワイトリストの追加に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/tokens/[id]/ip-whitelist - IPホワイトリスト削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const tokenId = BigInt(id);

    // トークンの存在確認と所有者確認
    const token = await getApiTokenById(tokenId);
    if (!token) {
      return NextResponse.json({ error: 'トークンが見つかりません。' }, { status: 404 });
    }

    // 自分のトークンまたは管理者のみアクセス可能
    if (token.userId !== session.user.id && false /* TODO: implement admin check */) {
      return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const whitelistId = searchParams.get('whitelistId');

    if (!whitelistId) {
      return NextResponse.json({ error: 'ホワイトリストIDが必要です。' }, { status: 400 });
    }

    await removeIpWhitelist(BigInt(whitelistId));

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Remove IP whitelist error:', error);
    return NextResponse.json({ error: 'IPホワイトリストの削除に失敗しました。' }, { status: 500 });
  }
}
