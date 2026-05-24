import { prisma } from '@/lib/prisma';
import type {
  TestSpecStatus,
  TestSpec,
  TestSpecDetail,
  TestSpecVersion,
  CreateTestSpecInput,
  UpdateTestSpecInput,
  CreateTestSpecVersionInput,
  TestSpecSearchParams,
  TestSpecListResponse,
} from '@/types/test-spec';

// テスト仕様書作成
export async function createTestSpec(data: CreateTestSpecInput): Promise<TestSpec> {
  const testSpec = await prisma.testSpec.create({
    data: {
      projectId: BigInt(data.projectId),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      status: data.status || 'DRAFT',
      version: '1.0.0',
      isLocked: false,
    },
    select: {
      id: true,
      projectId: true,
      name: true,
      description: true,
      status: true,
      version: true,
      isLocked: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          versions: true,
        },
      },
    },
  });

  // 初期バージョンを作成
  await prisma.testSpecVersion.create({
    data: {
      testSpecId: testSpec.id,
      version: '1.0.0',
      changeNote: '初期作成',
    },
  });

  return serializeTestSpec(testSpec);
}

// テスト仕様書をIDで取得
export async function getTestSpecById(id: bigint): Promise<TestSpecDetail | null> {
  const testSpec = await prisma.testSpec.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      name: true,
      description: true,
      status: true,
      version: true,
      isLocked: true,
      createdAt: true,
      updatedAt: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      versions: {
        select: {
          id: true,
          testSpecId: true,
          version: true,
          changeNote: true,
          createdBy: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!testSpec) {
    return null;
  }

  return serializeTestSpecDetail(testSpec);
}

// テスト仕様書一覧を取得（ページネーション付き）
export async function getTestSpecs(
  params: TestSpecSearchParams = {}
): Promise<TestSpecListResponse> {
  const {
    projectId,
    query,
    status,
    isLocked,
    page = 1,
    limit = 20,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
  } = params;

  const skip = (page - 1) * limit;

  // 検索条件を構築
  const where: {
    projectId?: bigint;
    status?: TestSpecStatus;
    isLocked?: boolean;
    OR?: Array<
      | { name: { contains: string; mode: 'insensitive' } }
      | { description: { contains: string; mode: 'insensitive' } }
    >;
  } = {};

  if (projectId) {
    where.projectId = BigInt(projectId);
  }

  if (status) {
    where.status = status;
  }

  if (isLocked !== undefined) {
    where.isLocked = isLocked;
  }

  if (query?.trim()) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ];
  }

  // テスト仕様書数をカウント
  const total = await prisma.testSpec.count({ where });

  // テスト仕様書一覧を取得
  const testSpecs = await prisma.testSpec.findMany({
    where,
    select: {
      id: true,
      projectId: true,
      name: true,
      description: true,
      status: true,
      version: true,
      isLocked: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          versions: true,
        },
      },
    },
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
  });

  return {
    testSpecs: testSpecs.map(serializeTestSpec),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// テスト仕様書を更新
export async function updateTestSpec(
  id: bigint,
  data: UpdateTestSpecInput
): Promise<TestSpec | null> {
  const existingTestSpec = await prisma.testSpec.findUnique({
    where: { id },
    select: { id: true, isLocked: true },
  });

  if (!existingTestSpec) {
    return null;
  }

  // ロックされている場合はロック解除以外の更新を拒否
  if (existingTestSpec.isLocked && data.isLocked !== false) {
    throw new Error('このテスト仕様書はロックされているため更新できません。');
  }

  const updateData: {
    name?: string;
    description?: string | null;
    status?: TestSpecStatus;
    isLocked?: boolean;
  } = {};

  if (data.name !== undefined) {
    updateData.name = data.name.trim();
  }

  if (data.description !== undefined) {
    updateData.description = data.description?.trim() || null;
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (data.isLocked !== undefined) {
    updateData.isLocked = data.isLocked;
  }

  const testSpec = await prisma.testSpec.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      projectId: true,
      name: true,
      description: true,
      status: true,
      version: true,
      isLocked: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          versions: true,
        },
      },
    },
  });

  return serializeTestSpec(testSpec);
}

// テスト仕様書を削除
export async function deleteTestSpec(id: bigint): Promise<{ success: boolean; error?: string }> {
  const testSpec = await prisma.testSpec.findUnique({
    where: { id },
    select: { id: true, isLocked: true },
  });

  if (!testSpec) {
    return { success: false, error: 'テスト仕様書が見つかりません。' };
  }

  if (testSpec.isLocked) {
    return { success: false, error: 'ロックされているテスト仕様書は削除できません。' };
  }

  await prisma.testSpec.delete({
    where: { id },
  });

  return { success: true };
}

// 新しいバージョンを作成
export async function createTestSpecVersion(
  testSpecId: bigint,
  data: CreateTestSpecVersionInput
): Promise<{ testSpec: TestSpec; version: TestSpecVersion }> {
  const testSpec = await prisma.testSpec.findUnique({
    where: { id: testSpecId },
    select: { id: true, isLocked: true, version: true },
  });

  if (!testSpec) {
    throw new Error('テスト仕様書が見つかりません。');
  }

  if (testSpec.isLocked) {
    throw new Error('ロックされているテスト仕様書のバージョンは更新できません。');
  }

  // トランザクションで両方を更新
  const [updatedTestSpec, newVersion] = await prisma.$transaction([
    prisma.testSpec.update({
      where: { id: testSpecId },
      data: { version: data.version },
      select: {
        id: true,
        projectId: true,
        name: true,
        description: true,
        status: true,
        version: true,
        isLocked: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            versions: true,
          },
        },
      },
    }),
    prisma.testSpecVersion.create({
      data: {
        testSpecId,
        version: data.version,
        changeNote: data.changeNote?.trim() || null,
        createdBy: data.createdBy ? BigInt(data.createdBy) : null,
      },
      select: {
        id: true,
        testSpecId: true,
        version: true,
        changeNote: true,
        createdBy: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    testSpec: serializeTestSpec(updatedTestSpec),
    version: serializeTestSpecVersion(newVersion),
  };
}

// バージョン履歴を取得
export async function getTestSpecVersions(testSpecId: bigint): Promise<TestSpecVersion[]> {
  const versions = await prisma.testSpecVersion.findMany({
    where: { testSpecId },
    select: {
      id: true,
      testSpecId: true,
      version: true,
      changeNote: true,
      createdBy: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return versions.map(serializeTestSpecVersion);
}

// テスト仕様書名の重複をチェック（同一プロジェクト内）
export async function isTestSpecNameTaken(
  projectId: bigint,
  name: string,
  excludeId?: bigint
): Promise<boolean> {
  const testSpec = await prisma.testSpec.findFirst({
    where: {
      projectId,
      name: { equals: name, mode: 'insensitive' },
    },
    select: { id: true },
  });

  if (!testSpec) {
    return false;
  }

  if (excludeId && testSpec.id === excludeId) {
    return false;
  }

  return true;
}

// プロジェクトの存在確認
export async function projectExists(projectId: bigint): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  return project !== null;
}

// テスト仕様書データをシリアライズ（BigIntを文字列に変換）
function serializeTestSpec(testSpec: {
  id: bigint;
  projectId: bigint;
  name: string;
  description: string | null;
  status: string;
  version: string;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    versions: number;
  };
}): TestSpec {
  return {
    id: testSpec.id.toString(),
    projectId: testSpec.projectId.toString(),
    name: testSpec.name,
    description: testSpec.description,
    status: testSpec.status as TestSpecStatus,
    version: testSpec.version,
    isLocked: testSpec.isLocked,
    createdAt: testSpec.createdAt.toISOString(),
    updatedAt: testSpec.updatedAt.toISOString(),
    _count: testSpec._count,
  };
}

// テスト仕様書詳細データをシリアライズ
function serializeTestSpecDetail(testSpec: {
  id: bigint;
  projectId: bigint;
  name: string;
  description: string | null;
  status: string;
  version: string;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  project: {
    id: bigint;
    name: string;
  };
  versions: Array<{
    id: bigint;
    testSpecId: bigint;
    version: string;
    changeNote: string | null;
    createdBy: bigint | null;
    createdAt: Date;
  }>;
}): TestSpecDetail {
  return {
    id: testSpec.id.toString(),
    projectId: testSpec.projectId.toString(),
    name: testSpec.name,
    description: testSpec.description,
    status: testSpec.status as TestSpecStatus,
    version: testSpec.version,
    isLocked: testSpec.isLocked,
    createdAt: testSpec.createdAt.toISOString(),
    updatedAt: testSpec.updatedAt.toISOString(),
    project: {
      id: testSpec.project.id.toString(),
      name: testSpec.project.name,
    },
    versions: testSpec.versions.map(serializeTestSpecVersion),
  };
}

// バージョンデータをシリアライズ
function serializeTestSpecVersion(version: {
  id: bigint;
  testSpecId: bigint;
  version: string;
  changeNote: string | null;
  createdBy: bigint | null;
  createdAt: Date;
}): TestSpecVersion {
  return {
    id: version.id.toString(),
    testSpecId: version.testSpecId.toString(),
    version: version.version,
    changeNote: version.changeNote,
    createdBy: version.createdBy?.toString() || null,
    createdAt: version.createdAt.toISOString(),
  };
}
