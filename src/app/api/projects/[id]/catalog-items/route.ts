import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getCatalogItems,
  createCatalogItem,
  getCatalogItemByName,
  getCategories,
} from '@/repositories/catalog-item-repository';
import { validateCreateCatalogItemInput } from '@/types/catalog-item';
import type { CatalogItemType, CatalogItemStatus } from '@/types/catalog-item';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/catalog-items
 * カタログアイテム一覧取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = BigInt(id);
    const searchParams = request.nextUrl.searchParams;

    // カテゴリ一覧を取得するオプション
    if (searchParams.get('categories') === 'true') {
      const categories = await getCategories(projectId);
      return NextResponse.json({ categories });
    }

    const options = {
      projectId,
      type: searchParams.get('type') as CatalogItemType | undefined,
      status: searchParams.get('status') as CatalogItemStatus | undefined,
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      tagIds: searchParams.get('tagIds')
        ? searchParams
            .get('tagIds')!
            .split(',')
            .map((id) => BigInt(id))
        : undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '50', 10),
      sortBy:
        (searchParams.get('sortBy') as
          | 'name'
          | 'createdAt'
          | 'updatedAt'
          | 'usageCount'
          | 'sortOrder') || 'sortOrder',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
    };

    const result = await getCatalogItems(options);

    return NextResponse.json({
      items: result.items,
      total: result.total,
      page: options.page,
      limit: options.limit,
    });
  } catch (error) {
    console.error('Failed to get catalog items:', error);
    return NextResponse.json({ error: 'カタログアイテムの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/catalog-items
 * カタログアイテム作成
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = BigInt(id);
    const userId = BigInt(session.user.id);
    const body = await request.json();

    // バリデーション
    const validation = validateCreateCatalogItemInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    // 同名チェック
    const existing = await getCatalogItemByName(projectId, body.name);
    if (existing) {
      return NextResponse.json(
        { error: '同じ名前のカタログアイテムが既に存在します' },
        { status: 409 }
      );
    }

    const item = await createCatalogItem(projectId, body, userId);

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Failed to create catalog item:', error);
    return NextResponse.json({ error: 'カタログアイテムの作成に失敗しました' }, { status: 500 });
  }
}
