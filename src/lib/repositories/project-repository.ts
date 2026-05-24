import { prisma } from '@/lib/prisma';
import type {
  ProjectStatus,
  Project,
  ProjectDetail,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectSearchParams,
  ProjectListResponse,
} from '@/types/project';

// プロジェクト作成
export async function createProject(data: CreateProjectInput): Promise<Project> {
  const project = await prisma.project.create({
    data: {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      status: data.status || 'ACTIVE',
      projectType: data.projectType?.trim() || null,
      targetVersion: data.targetVersion?.trim() || null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      projectType: true,
      targetVersion: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return serializeProject(project);
}

// プロジェクトをIDで取得
export async function getProjectById(id: bigint): Promise<ProjectDetail | null> {
  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      projectType: true,
      targetVersion: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          projectMembers: true,
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  return serializeProjectDetail(project);
}

// プロジェクト一覧を取得（ページネーション付き）
export async function getProjects(params: ProjectSearchParams = {}): Promise<ProjectListResponse> {
  const {
    query,
    status,
    projectType,
    page = 1,
    limit = 20,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
  } = params;

  const skip = (page - 1) * limit;

  // 検索条件を構築
  const where: {
    status?: ProjectStatus;
    projectType?: string;
    OR?: Array<
      | { name: { contains: string; mode: 'insensitive' } }
      | { description: { contains: string; mode: 'insensitive' } }
    >;
  } = {};

  if (status) {
    where.status = status;
  }

  if (projectType) {
    where.projectType = projectType;
  }

  if (query?.trim()) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ];
  }

  // プロジェクト数をカウント
  const total = await prisma.project.count({ where });

  // プロジェクト一覧を取得
  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      projectType: true,
      targetVersion: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          projectMembers: true,
        },
      },
    },
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
  });

  return {
    projects: projects.map(serializeProject),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// 全プロジェクト一覧を取得（ページネーションなし - 互換性用）
export async function getAllProjects(): Promise<Project[]> {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      projectType: true,
      targetVersion: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          projectMembers: true,
        },
      },
    },
  });

  return projects.map(serializeProject);
}

// プロジェクトを更新
export async function updateProject(id: bigint, data: UpdateProjectInput): Promise<Project | null> {
  const existingProject = await prisma.project.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingProject) {
    return null;
  }

  const updateData: {
    name?: string;
    description?: string | null;
    status?: ProjectStatus;
    projectType?: string | null;
    targetVersion?: string | null;
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

  if (data.projectType !== undefined) {
    updateData.projectType = data.projectType?.trim() || null;
  }

  if (data.targetVersion !== undefined) {
    updateData.targetVersion = data.targetVersion?.trim() || null;
  }

  const project = await prisma.project.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      projectType: true,
      targetVersion: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return serializeProject(project);
}

// プロジェクトを削除
export async function deleteProject(id: bigint): Promise<{ success: boolean; error?: string }> {
  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      _count: {
        select: {
          projectMembers: true,
        },
      },
    },
  });

  if (!project) {
    return { success: false, error: 'プロジェクトが見つかりません。' };
  }

  // プロジェクトメンバーがいても削除可能（Cascade削除）
  await prisma.project.delete({
    where: { id },
  });

  return { success: true };
}

// プロジェクト名の重複をチェック
export async function isProjectNameTaken(name: string, excludeId?: bigint): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });

  if (!project) {
    return false;
  }

  if (excludeId && project.id === excludeId) {
    return false;
  }

  return true;
}

// プロジェクトデータをシリアライズ（BigIntを文字列に変換）
function serializeProject(project: {
  id: bigint;
  name: string;
  description: string | null;
  status: string;
  projectType: string | null;
  targetVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    projectMembers: number;
  };
}): Project {
  return {
    id: project.id.toString(),
    name: project.name,
    description: project.description,
    status: project.status as ProjectStatus,
    projectType: project.projectType,
    targetVersion: project.targetVersion,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    _count: project._count,
  };
}

// プロジェクト詳細データをシリアライズ
function serializeProjectDetail(project: {
  id: bigint;
  name: string;
  description: string | null;
  status: string;
  projectType: string | null;
  targetVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    projectMembers: number;
  };
}): ProjectDetail {
  return {
    ...serializeProject(project),
    _count: project._count,
  };
}
