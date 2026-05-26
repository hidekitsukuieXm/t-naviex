/**
 * 要求仕様一覧・作成 API
 * GET /api/projects/[id]/requirements - 一覧取得
 * POST /api/projects/[id]/requirements - 新規作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getRequirements,
  getRequirementsTree,
  createRequirement,
  requirementCodeExists,
} from '@/repositories/requirement-repository';
import {
  validateCreateRequirement,
  toRequirementSafe,
  RequirementType,
  RequirementStatus,
  RequirementPriority,
} from '@/types/requirement';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/requirements
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = BigInt(id);

    const searchParams = request.nextUrl.searchParams;
    const parentIdStr = searchParams.get('parentId');
    const type = searchParams.get('type') as RequirementType | null;
    const status = searchParams.get('status') as RequirementStatus | null;
    const priority = searchParams.get('priority') as RequirementPriority | null;
    const search = searchParams.get('search');
    const tree = searchParams.get('tree') === 'true';

    if (tree) {
      const requirements = await getRequirementsTree(projectId);
      const safeRequirements = requirements.map(toRequirementSafe);
      return NextResponse.json({ requirements: safeRequirements });
    }

    const options: {
      projectId: bigint;
      parentId?: bigint | null;
      type?: RequirementType;
      status?: RequirementStatus;
      priority?: RequirementPriority;
      search?: string;
    } = {
      projectId,
    };

    if (parentIdStr !== null) {
      options.parentId = parentIdStr ? BigInt(parentIdStr) : null;
    }
    if (type) {
      options.type = type;
    }
    if (status) {
      options.status = status;
    }
    if (priority) {
      options.priority = priority;
    }
    if (search) {
      options.search = search;
    }

    const requirements = await getRequirements(options);
    const safeRequirements = requirements.map(toRequirementSafe);

    return NextResponse.json({ requirements: safeRequirements });
  } catch (error) {
    console.error('Get requirements error:', error);
    return NextResponse.json({ error: '要求仕様の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/requirements
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = BigInt(id);

    const body = await request.json();
    const validation = validateCreateRequirement({ ...body, projectId });

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    // Check for duplicate code
    const codeExists = await requirementCodeExists(projectId, validation.data.code);
    if (codeExists) {
      return NextResponse.json({ error: 'このコードは既に使用されています。' }, { status: 400 });
    }

    const requirement = await createRequirement(validation.data, BigInt(session.user.id));

    const safeRequirement = toRequirementSafe(requirement);

    return NextResponse.json(safeRequirement, { status: 201 });
  } catch (error) {
    console.error('Create requirement error:', error);
    return NextResponse.json({ error: '要求仕様の作成に失敗しました。' }, { status: 500 });
  }
}
