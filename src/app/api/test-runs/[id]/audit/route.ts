import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  validateAuditReview,
  validateReviewResponse,
  type TestRunAuditReview,
  type CreateAuditReviewData,
  type ReviewAuditData,
} from '@/types/audit-review';
import { logAudit } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

// GET /api/test-runs/[id]/audit - テストラン監査レビュー一覧取得
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const testRunId = BigInt(id);

    const reviews = await prisma.testRunAuditReview.findMany({
      where: { testRunId },
      orderBy: { createdAt: 'desc' },
    });

    const serialized: TestRunAuditReview[] = reviews.map((review) => ({
      id: review.id.toString(),
      testRunId: review.testRunId.toString(),
      requesterId: review.requesterId.toString(),
      reviewerId: review.reviewerId?.toString() ?? null,
      status: review.status,
      comment: review.comment,
      reviewComment: review.reviewComment,
      reviewedAt: review.reviewedAt?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      reviews: serialized,
      total: serialized.length,
    });
  } catch (error) {
    console.error('Get audit reviews error:', error);
    return NextResponse.json({ error: '監査レビュー一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/test-runs/[id]/audit - 監査レビュー依頼作成
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const testRunId = BigInt(id);

    const body: CreateAuditReviewData = await request.json();
    body.testRunId = id;

    // バリデーション
    const validation = validateAuditReview(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // テストラン存在確認
    const testRun = await prisma.testRun.findUnique({
      where: { id: testRunId },
    });

    if (!testRun) {
      return NextResponse.json({ error: 'テストランが見つかりません。' }, { status: 404 });
    }

    // 既に保留中のレビューがないかチェック
    const pendingReview = await prisma.testRunAuditReview.findFirst({
      where: {
        testRunId,
        status: 'PENDING',
      },
    });

    if (pendingReview) {
      return NextResponse.json(
        { error: '既に保留中の監査レビューが存在します。' },
        { status: 400 }
      );
    }

    const review = await prisma.testRunAuditReview.create({
      data: {
        testRunId,
        requesterId: BigInt(session.user.id),
        reviewerId: body.reviewerId ? BigInt(body.reviewerId) : null,
        comment: body.comment ?? null,
        status: 'PENDING',
      },
    });

    // 監査ログを記録
    await logAudit({
      userId: session.user.id,
      action: 'AUDIT_REVIEW_SUBMIT',
      targetType: 'AUDIT_REVIEW',
      targetId: review.id.toString(),
      details: { testRunId: id },
    });

    return NextResponse.json(
      {
        id: review.id.toString(),
        testRunId: review.testRunId.toString(),
        requesterId: review.requesterId.toString(),
        reviewerId: review.reviewerId?.toString() ?? null,
        status: review.status,
        comment: review.comment,
        reviewComment: review.reviewComment,
        reviewedAt: review.reviewedAt?.toISOString() ?? null,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create audit review error:', error);
    return NextResponse.json({ error: '監査レビュー依頼の作成に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/test-runs/[id]/audit - 監査レビュー承認/却下
export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const testRunId = BigInt(id);

    const body: ReviewAuditData & { reviewId: string } = await request.json();

    if (!body.reviewId) {
      return NextResponse.json({ error: 'レビューIDは必須です。' }, { status: 400 });
    }

    // バリデーション
    const validation = validateReviewResponse(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    const reviewId = BigInt(body.reviewId);

    const existing = await prisma.testRunAuditReview.findUnique({
      where: { id: reviewId },
    });

    if (!existing) {
      return NextResponse.json({ error: '監査レビューが見つかりません。' }, { status: 404 });
    }

    if (existing.testRunId !== testRunId) {
      return NextResponse.json({ error: 'テストランIDが一致しません。' }, { status: 400 });
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'この監査レビューは既に処理されています。' },
        { status: 400 }
      );
    }

    const review = await prisma.testRunAuditReview.update({
      where: { id: reviewId },
      data: {
        status: body.status,
        reviewerId: BigInt(session.user.id),
        reviewComment: body.reviewComment ?? null,
        reviewedAt: new Date(),
      },
    });

    // 監査ログを記録
    await logAudit({
      userId: session.user.id,
      action: body.status === 'APPROVED' ? 'AUDIT_REVIEW_APPROVE' : 'AUDIT_REVIEW_REJECT',
      targetType: 'AUDIT_REVIEW',
      targetId: review.id.toString(),
      details: { testRunId: id, status: body.status },
    });

    return NextResponse.json({
      id: review.id.toString(),
      testRunId: review.testRunId.toString(),
      requesterId: review.requesterId.toString(),
      reviewerId: review.reviewerId?.toString() ?? null,
      status: review.status,
      comment: review.comment,
      reviewComment: review.reviewComment,
      reviewedAt: review.reviewedAt?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Review audit error:', error);
    return NextResponse.json({ error: '監査レビューの処理に失敗しました。' }, { status: 500 });
  }
}
