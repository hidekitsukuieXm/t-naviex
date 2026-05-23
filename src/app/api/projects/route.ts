import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/projects - プロジェクト一覧取得
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

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

    // BigInt を文字列に変換
    const serializedProjects = projects.map((project) => ({
      ...project,
      id: project.id.toString(),
    }));

    return NextResponse.json(serializedProjects);
  } catch (error) {
    console.error('Projects fetch error:', error);
    return NextResponse.json({ error: 'プロジェクトの取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects - プロジェクト作成
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, projectType, targetVersion, status } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'プロジェクト名は必須です。' }, { status: 400 });
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: 'プロジェクト名は255文字以内で入力してください。' },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        projectType: projectType?.trim() || null,
        targetVersion: targetVersion?.trim() || null,
        status: status || 'ACTIVE',
      },
    });

    return NextResponse.json(
      {
        ...project,
        id: project.id.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json({ error: 'プロジェクトの作成に失敗しました。' }, { status: 500 });
  }
}
