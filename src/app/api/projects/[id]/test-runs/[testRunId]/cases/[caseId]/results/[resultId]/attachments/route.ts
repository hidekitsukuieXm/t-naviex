/**
 * テスト結果添付ファイル API
 * GET  /api/projects/[id]/test-runs/[testRunId]/cases/[caseId]/results/[resultId]/attachments - 添付ファイル一覧取得
 * POST /api/projects/[id]/test-runs/[testRunId]/cases/[caseId]/results/[resultId]/attachments - 添付ファイルアップロード
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createAttachment,
  getAttachmentsByTestResultId,
  testResultExists,
} from '@/lib/repositories/test-result-attachment-repository';
import {
  validateFileName,
  validateFileSize,
  validateMimeType,
} from '@/types/test-result-attachment';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

interface RouteParams {
  params: Promise<{ id: string; testRunId: string; caseId: string; resultId: string }>;
}

// GET /api/projects/[id]/test-runs/[testRunId]/cases/[caseId]/results/[resultId]/attachments
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { resultId } = await params;

    if (!resultId) {
      return NextResponse.json({ error: 'テスト結果IDは必須です。' }, { status: 400 });
    }

    // テスト結果の存在確認
    const exists = await testResultExists(BigInt(resultId));
    if (!exists) {
      return NextResponse.json({ error: 'テスト結果が見つかりません。' }, { status: 404 });
    }

    const attachments = await getAttachmentsByTestResultId(resultId);

    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Get attachments error:', error);
    return NextResponse.json({ error: '添付ファイル一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/test-runs/[testRunId]/cases/[caseId]/results/[resultId]/attachments
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, testRunId, resultId } = await params;

    if (!resultId) {
      return NextResponse.json({ error: 'テスト結果IDは必須です。' }, { status: 400 });
    }

    // テスト結果の存在確認
    const exists = await testResultExists(BigInt(resultId));
    if (!exists) {
      return NextResponse.json({ error: 'テスト結果が見つかりません。' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'ファイルは必須です。' }, { status: 400 });
    }

    // バリデーション
    const fileNameValidation = validateFileName(file.name);
    if (!fileNameValidation.valid) {
      return NextResponse.json({ error: fileNameValidation.error }, { status: 400 });
    }

    const fileSizeValidation = validateFileSize(file.size);
    if (!fileSizeValidation.valid) {
      return NextResponse.json({ error: fileSizeValidation.error }, { status: 400 });
    }

    const mimeTypeValidation = validateMimeType(file.type);
    if (!mimeTypeValidation.valid) {
      return NextResponse.json({ error: mimeTypeValidation.error }, { status: 400 });
    }

    // ファイル保存
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ストレージパスの生成
    const fileId = randomUUID();
    const ext = file.name.split('.').pop() || '';
    const storageName = `${fileId}.${ext}`;
    const uploadDir = join(
      process.cwd(),
      'uploads',
      'projects',
      projectId,
      'test-runs',
      testRunId,
      'results',
      resultId
    );
    const storagePath = join(uploadDir, storageName);

    // ディレクトリ作成
    await mkdir(uploadDir, { recursive: true });

    // ファイル保存
    await writeFile(storagePath, buffer);

    // DB登録
    const attachment = await createAttachment({
      testResultId: resultId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      storagePath: `/uploads/projects/${projectId}/test-runs/${testRunId}/results/${resultId}/${storageName}`,
      description: description || null,
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Upload attachment error:', error);
    return NextResponse.json(
      { error: '添付ファイルのアップロードに失敗しました。' },
      { status: 500 }
    );
  }
}
