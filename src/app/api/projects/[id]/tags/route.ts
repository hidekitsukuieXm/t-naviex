import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTags, getAllTags, createTag, getTagByName } from '@/lib/repositories/tag-repository';
import { getProjectById } from '@/lib/repositories/project-repository';
import { logTagCreate } from '@/lib/audit';
import { validateCreateTagInput } from '@/types/tag';

// GET /api/projects/[id]/tags - Get tags for a project
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Check project exists
    const project = await getProjectById(BigInt(projectId));
    if (!project) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const all = searchParams.get('all') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (all) {
      // Return all tags without pagination (for dropdowns)
      const tags = await getAllTags(projectId);
      return NextResponse.json({ tags });
    }

    // Return paginated tags
    const result = await getTags({
      projectId,
      search,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'タグの取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/tags - Create a new tag
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Check project exists
    const project = await getProjectById(BigInt(projectId));
    if (!project) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();
    const input = {
      projectId,
      name: body.name,
      color: body.color,
      description: body.description,
    };

    // Validate input
    const validation = validateCreateTagInput(input);
    if (!validation.valid) {
      return NextResponse.json(
        { error: '入力が無効です。', details: validation.errors },
        { status: 400 }
      );
    }

    // Check for duplicate tag name
    const existingTag = await getTagByName(projectId, input.name);
    if (existingTag) {
      return NextResponse.json({ error: '同じ名前のタグが既に存在します。' }, { status: 409 });
    }

    // Create tag
    const tag = await createTag(input);

    // Audit log
    await logTagCreate(session.user.id, tag.id, {
      projectId,
      name: tag.name,
      color: tag.color,
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'タグの作成に失敗しました。' }, { status: 500 });
  }
}
