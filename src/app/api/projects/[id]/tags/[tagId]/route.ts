import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTagById, updateTag, deleteTag, getTagByName } from '@/lib/repositories/tag-repository';
import { getProjectById } from '@/lib/repositories/project-repository';
import { logTagUpdate, logTagDelete } from '@/lib/audit';
import { validateUpdateTagInput } from '@/types/tag';

// GET /api/projects/[id]/tags/[tagId] - Get a tag by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, tagId } = await params;

    // Check project exists
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // Get tag
    const tag = await getTagById(tagId);
    if (!tag) {
      return NextResponse.json({ error: 'タグが見つかりません。' }, { status: 404 });
    }

    // Verify tag belongs to project
    if (tag.projectId !== projectId) {
      return NextResponse.json({ error: 'タグが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json({ error: 'タグの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/projects/[id]/tags/[tagId] - Update a tag
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, tagId } = await params;

    // Check project exists
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // Get existing tag
    const existingTag = await getTagById(tagId);
    if (!existingTag) {
      return NextResponse.json({ error: 'タグが見つかりません。' }, { status: 404 });
    }

    // Verify tag belongs to project
    if (existingTag.projectId !== projectId) {
      return NextResponse.json({ error: 'タグが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();
    const input = {
      name: body.name,
      color: body.color,
      description: body.description,
    };

    // Validate input
    const validation = validateUpdateTagInput(input);
    if (!validation.valid) {
      return NextResponse.json(
        { error: '入力が無効です。', details: validation.errors },
        { status: 400 }
      );
    }

    // Check for duplicate tag name if name is being changed
    if (input.name && input.name !== existingTag.name) {
      const duplicateTag = await getTagByName(projectId, input.name);
      if (duplicateTag && duplicateTag.id !== tagId) {
        return NextResponse.json({ error: '同じ名前のタグが既に存在します。' }, { status: 409 });
      }
    }

    // Update tag
    const tag = await updateTag(tagId, input);

    // Audit log
    await logTagUpdate(session.user.id, tagId, {
      projectId,
      changes: input,
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'タグの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/tags/[tagId] - Delete a tag
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, tagId } = await params;

    // Check project exists
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // Get existing tag
    const existingTag = await getTagById(tagId);
    if (!existingTag) {
      return NextResponse.json({ error: 'タグが見つかりません。' }, { status: 404 });
    }

    // Verify tag belongs to project
    if (existingTag.projectId !== projectId) {
      return NextResponse.json({ error: 'タグが見つかりません。' }, { status: 404 });
    }

    // Delete tag
    const result = await deleteTag(tagId);
    if (!result.success) {
      return NextResponse.json({ error: result.error || '削除に失敗しました。' }, { status: 500 });
    }

    // Audit log
    await logTagDelete(session.user.id, tagId, {
      projectId,
      name: existingTag.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'タグの削除に失敗しました。' }, { status: 500 });
  }
}
