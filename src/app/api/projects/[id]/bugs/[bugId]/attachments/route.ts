/**
 * バグ添付ファイル API
 * GET /api/projects/[id]/bugs/[bugId]/attachments - 添付ファイル一覧取得
 * POST /api/projects/[id]/bugs/[bugId]/attachments - 添付ファイルアップロード
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { bugExistsInProject, projectExists } from '@/lib/repositories/bug-repository';
import { listBugAttachments, createBugAttachment } from '@/lib/repositories/bug-comment-repository';
import { validateCreateBugAttachmentInput } from '@/types/bug-attachment';

interface RouteParams {
  params: Promise<{ id: string; bugId: string }>;
}

// GET /api/projects/[id]/bugs/[bugId]/attachments
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, bugId } = await params;

    if (!projectId || !bugId) {
      return NextResponse.json({ error: 'プロジェクトIDとバグIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // バグの存在確認
    const bugExistsResult = await bugExistsInProject(BigInt(projectId), BigInt(bugId));
    if (!bugExistsResult) {
      return NextResponse.json({ error: 'バグが見つかりません。' }, { status: 404 });
    }

    const attachments = await listBugAttachments(BigInt(bugId));

    // BigIntをシリアライズ
    const serializedAttachments = attachments.map((attachment) => ({
      ...attachment,
      id: attachment.id.toString(),
      bugId: attachment.bugId.toString(),
      uploadedById: attachment.uploadedById.toString(),
      uploadedBy: attachment.uploadedBy
        ? { ...attachment.uploadedBy, id: attachment.uploadedBy.id.toString() }
        : undefined,
    }));

    return NextResponse.json({ attachments: serializedAttachments });
  } catch (error) {
    console.error('List bug attachments error:', error);
    return NextResponse.json({ error: '添付ファイルの取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/bugs/[bugId]/attachments
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, bugId } = await params;

    if (!projectId || !bugId) {
      return NextResponse.json({ error: 'プロジェクトIDとバグIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // バグの存在確認
    const bugExistsResult = await bugExistsInProject(BigInt(projectId), BigInt(bugId));
    if (!bugExistsResult) {
      return NextResponse.json({ error: 'バグが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // 入力値の検証
    const validation = validateCreateBugAttachmentInput({
      ...body,
      bugId: BigInt(bugId),
      uploadedById: BigInt(session.user.id),
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const attachment = await createBugAttachment(validation.data!);

    // BigIntをシリアライズ
    const serializedAttachment = {
      ...attachment,
      id: attachment.id.toString(),
      bugId: attachment.bugId.toString(),
      uploadedById: attachment.uploadedById.toString(),
    };

    return NextResponse.json(serializedAttachment, { status: 201 });
  } catch (error) {
    console.error('Create bug attachment error:', error);
    return NextResponse.json({ error: '添付ファイルの作成に失敗しました。' }, { status: 500 });
  }
}
