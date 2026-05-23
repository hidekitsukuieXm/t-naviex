import { prisma } from '@/lib/prisma';
import type { Permissions, CreateRoleData, UpdateRoleData } from '@/types/role';
import { isSystemRole, SYSTEM_ROLE_NAMES } from '@/types/role';

// ロール作成
export async function createRole(data: CreateRoleData) {
  const role = await prisma.role.create({
    data: {
      name: data.name,
      displayName: data.displayName,
      description: data.description || null,
      permissions: data.permissions,
      isSystemRole: false,
    },
    select: {
      id: true,
      name: true,
      displayName: true,
      description: true,
      permissions: true,
      isSystemRole: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return serializeRole(role);
}

// ロールをIDで取得
export async function getRoleById(id: bigint) {
  const role = await prisma.role.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      displayName: true,
      description: true,
      permissions: true,
      isSystemRole: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          projectMembers: true,
        },
      },
    },
  });

  if (!role) {
    return null;
  }

  return {
    ...serializeRole(role),
    _count: role._count,
  };
}

// ロールを名前で取得
export async function getRoleByName(name: string) {
  const role = await prisma.role.findUnique({
    where: { name },
    select: {
      id: true,
      name: true,
      displayName: true,
      description: true,
      permissions: true,
      isSystemRole: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!role) {
    return null;
  }

  return serializeRole(role);
}

// ロール一覧を取得
export async function getRoles() {
  const roles = await prisma.role.findMany({
    select: {
      id: true,
      name: true,
      displayName: true,
      description: true,
      permissions: true,
      isSystemRole: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ isSystemRole: 'desc' }, { name: 'asc' }],
  });

  return {
    roles: roles.map(serializeRole),
    total: roles.length,
  };
}

// ロールを更新
export async function updateRole(id: bigint, data: UpdateRoleData) {
  const existingRole = await prisma.role.findUnique({
    where: { id },
    select: { name: true, isSystemRole: true },
  });

  if (!existingRole) {
    return null;
  }

  // システムロールの名前は変更不可
  if (existingRole.isSystemRole && data.name && data.name !== existingRole.name) {
    throw new Error('システムロールの名前は変更できません。');
  }

  const updateData: {
    name?: string;
    displayName?: string;
    description?: string | null;
    permissions?: Permissions;
  } = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.displayName !== undefined) {
    updateData.displayName = data.displayName;
  }

  if (data.description !== undefined) {
    updateData.description = data.description;
  }

  if (data.permissions !== undefined) {
    updateData.permissions = data.permissions;
  }

  const role = await prisma.role.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      displayName: true,
      description: true,
      permissions: true,
      isSystemRole: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return serializeRole(role);
}

// ロールを削除
export async function deleteRole(id: bigint): Promise<{ success: boolean; error?: string }> {
  const role = await prisma.role.findUnique({
    where: { id },
    select: {
      name: true,
      isSystemRole: true,
      _count: {
        select: {
          projectMembers: true,
        },
      },
    },
  });

  if (!role) {
    return { success: false, error: 'ロールが見つかりません。' };
  }

  // システムロールは削除不可
  if (role.isSystemRole) {
    return { success: false, error: 'システムロールは削除できません。' };
  }

  // 使用中のロールは削除不可
  if (role._count.projectMembers > 0) {
    return {
      success: false,
      error: `このロールは${role._count.projectMembers}件のプロジェクトメンバーに割り当てられているため削除できません。`,
    };
  }

  await prisma.role.delete({
    where: { id },
  });

  return { success: true };
}

// ロール名の重複をチェック
export async function isRoleNameTaken(name: string, excludeId?: bigint): Promise<boolean> {
  const role = await prisma.role.findUnique({
    where: { name },
    select: { id: true },
  });

  if (!role) {
    return false;
  }

  if (excludeId && role.id === excludeId) {
    return false;
  }

  return true;
}

// システムロールを初期化（シードデータ用）
export async function initializeSystemRoles() {
  const { DEFAULT_ROLES } = await import('@/types/role');

  const roles = [];

  for (const roleName of SYSTEM_ROLE_NAMES) {
    const roleData = DEFAULT_ROLES[roleName];

    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {
        displayName: roleData.displayName,
        description: roleData.description,
        permissions: roleData.permissions,
        isSystemRole: true,
      },
      create: {
        name: roleName,
        displayName: roleData.displayName,
        description: roleData.description,
        permissions: roleData.permissions,
        isSystemRole: true,
      },
    });

    roles.push(role);
  }

  return roles;
}

// ユーザーがリソースに対する権限を持っているかチェック
export async function checkUserPermission(
  userId: bigint,
  projectId: bigint,
  resource: string,
  action: string
): Promise<boolean> {
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    select: {
      role: {
        select: {
          permissions: true,
        },
      },
    },
  });

  if (!member) {
    return false;
  }

  const permissions = member.role.permissions as Permissions;
  const resourcePermissions = permissions[resource as keyof Permissions];

  if (!resourcePermissions) {
    return false;
  }

  return resourcePermissions.includes(action as 'create' | 'read' | 'update' | 'delete');
}

// ロールデータをシリアライズ（BigIntを文字列に変換）
function serializeRole(role: {
  id: bigint;
  name: string;
  displayName: string;
  description: string | null;
  permissions: unknown;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: role.id.toString(),
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    permissions: role.permissions as Permissions,
    isSystemRole: role.isSystemRole,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

// re-export for convenience
export { isSystemRole };
