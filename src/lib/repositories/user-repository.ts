import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import type { UserStatus } from '@/types/user';

// ソルトラウンド数
const SALT_ROUNDS = 12;

// ユーザー作成用データ型
export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  status?: UserStatus;
}

// ユーザー更新用データ型
export interface UpdateUserInput {
  email?: string;
  name?: string;
  password?: string;
  status?: UserStatus;
  image?: string | null;
  mfaEnabled?: boolean;
  mfaType?: string | null;
}

// ユーザー検索パラメータ
export interface UserSearchParams {
  query?: string;
  status?: UserStatus;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// パスワードをハッシュ化
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// パスワードを検証
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ユーザーを作成
export async function createUser(data: CreateUserInput) {
  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      status: data.status || 'ACTIVE',
    },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      emailVerified: true,
      image: true,
      mfaEnabled: true,
      mfaType: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return serializeUser(user);
}

// ユーザーをIDで取得
export async function getUserById(id: bigint) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      emailVerified: true,
      image: true,
      mfaEnabled: true,
      mfaType: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          projectMembers: true,
          userGroups: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return serializeUserDetail(user);
}

// ユーザーをメールで取得
export async function getUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      emailVerified: true,
      image: true,
      mfaEnabled: true,
      mfaType: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return null;
  }

  return serializeUser(user);
}

// ユーザー一覧を取得
export async function getUsers(params: UserSearchParams = {}) {
  const { query, status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params;

  const skip = (page - 1) * limit;

  // 検索条件を構築
  const where: {
    status?: UserStatus;
    OR?: Array<
      | { name: { contains: string; mode: 'insensitive' } }
      | { email: { contains: string; mode: 'insensitive' } }
    >;
  } = {};

  if (status) {
    where.status = status;
  }

  if (query?.trim()) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
    ];
  }

  // ユーザー数をカウント
  const total = await prisma.user.count({ where });

  // ユーザー一覧を取得
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      emailVerified: true,
      image: true,
      mfaEnabled: true,
      mfaType: true,
      createdAt: true,
      updatedAt: true,
    },
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
  });

  return {
    users: users.map(serializeUser),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ユーザーを更新
export async function updateUser(id: bigint, data: UpdateUserInput) {
  const updateData: {
    email?: string;
    name?: string;
    passwordHash?: string;
    status?: UserStatus;
    image?: string | null;
    mfaEnabled?: boolean;
    mfaType?: string | null;
  } = {};

  if (data.email !== undefined) {
    updateData.email = data.email;
  }

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.password !== undefined) {
    updateData.passwordHash = await hashPassword(data.password);
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (data.image !== undefined) {
    updateData.image = data.image;
  }

  if (data.mfaEnabled !== undefined) {
    updateData.mfaEnabled = data.mfaEnabled;
  }

  if (data.mfaType !== undefined) {
    updateData.mfaType = data.mfaType;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      emailVerified: true,
      image: true,
      mfaEnabled: true,
      mfaType: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return serializeUser(user);
}

// ユーザーを削除
export async function deleteUser(id: bigint): Promise<void> {
  await prisma.user.delete({
    where: { id },
  });
}

// パスワードを変更
export async function changePassword(
  id: bigint,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    return { success: false, error: 'ユーザーが見つかりません。' };
  }

  const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isPasswordValid) {
    return { success: false, error: '現在のパスワードが正しくありません。' };
  }

  const newPasswordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id },
    data: { passwordHash: newPasswordHash },
  });

  return { success: true };
}

// メールアドレスの重複をチェック
export async function isEmailTaken(email: string, excludeId?: bigint): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return false;
  }

  if (excludeId && user.id === excludeId) {
    return false;
  }

  return true;
}

// ユーザーデータをシリアライズ（BigIntを文字列に変換）
function serializeUser(user: {
  id: bigint;
  email: string;
  name: string;
  status: string;
  emailVerified: Date | null;
  image: string | null;
  mfaEnabled: boolean;
  mfaType: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id.toString(),
    email: user.email,
    name: user.name,
    status: user.status as UserStatus,
    emailVerified: user.emailVerified?.toISOString() || null,
    image: user.image,
    mfaEnabled: user.mfaEnabled,
    mfaType: user.mfaType,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

// ユーザー詳細データをシリアライズ（BigIntを文字列に変換）
function serializeUserDetail(user: {
  id: bigint;
  email: string;
  name: string;
  status: string;
  emailVerified: Date | null;
  image: string | null;
  mfaEnabled: boolean;
  mfaType: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    projectMembers: number;
    userGroups: number;
  };
}) {
  return {
    ...serializeUser(user),
    _count: user._count,
  };
}
