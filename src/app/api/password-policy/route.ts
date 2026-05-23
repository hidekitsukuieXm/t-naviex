import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getPasswordPolicy,
  updatePasswordPolicy,
} from '@/lib/repositories/password-policy-repository';
import { validatePasswordPolicySettings } from '@/types/password-policy';

// GET /api/password-policy - パスワードポリシー取得
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const policy = await getPasswordPolicy();

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Get password policy error:', error);
    return NextResponse.json(
      { error: 'パスワードポリシーの取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// PUT /api/password-policy - パスワードポリシー更新
export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validatePasswordPolicySettings(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    const policy = await updatePasswordPolicy(body);

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Update password policy error:', error);
    return NextResponse.json(
      { error: 'パスワードポリシーの更新に失敗しました。' },
      { status: 500 }
    );
  }
}
