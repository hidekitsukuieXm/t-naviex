import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'メールアドレスは必須です。' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: 'リセットリンクを送信しました。' });
    }

    // Delete any existing reset tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email },
    });

    // Generate a secure token
    const token = randomBytes(32).toString('hex');

    // Token expires in 1 hour
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // Save the token
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires,
      },
    });

    // TODO: Send email with reset link
    // For now, just log the reset URL (remove in production)
    const authUrl = process.env['AUTH_URL'] ?? 'http://localhost:3000';
    const resetUrl = `${authUrl}/reset-password?token=${token}`;
    console.log('Password reset URL:', resetUrl);

    // In production, you would send an email here:
    // await sendPasswordResetEmail(email, resetUrl);

    return NextResponse.json({ message: 'リセットリンクを送信しました。' });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: 'エラーが発生しました。' }, { status: 500 });
  }
}
