import 'dotenv/config';
import { PrismaClient, UserStatus, ProjectStatus } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { DEFAULT_ROLES, SYSTEM_ROLE_NAMES } from '../src/types/role';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL']!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding...');

  // Create system roles with Japanese names and comprehensive permissions
  console.log('Creating system roles...');
  const roles: Record<string, Awaited<ReturnType<typeof prisma.role.upsert>>> = {};

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

    roles[roleName] = role;
    console.log(`  Created/Updated role: ${roleName} (${roleData.displayName})`);
  }

  console.log('System roles created successfully.');

  // Create default groups
  const qaGroup = await prisma.group.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      name: 'QAチーム',
    },
  });

  const devGroup = await prisma.group.upsert({
    where: { id: BigInt(2) },
    update: {},
    create: {
      name: '開発チーム',
    },
  });

  console.log('Created groups:', { qaGroup: qaGroup.name, devGroup: devGroup.name });

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: '管理者',
      status: UserStatus.ACTIVE,
      mfaEnabled: false,
    },
  });

  console.log('Created admin user:', adminUser.email);

  // Create sample project
  const sampleProject = await prisma.project.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      name: 'サンプルプロジェクト',
      description: 'テスト用のサンプルプロジェクトです。',
      status: ProjectStatus.ACTIVE,
      projectType: 'Webアプリケーション',
      targetVersion: '1.0.0',
    },
  });

  console.log('Created sample project:', sampleProject.name);

  // Add admin user to sample project with SYSTEM_ADMIN role
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: sampleProject.id,
        userId: adminUser.id,
      },
    },
    update: {
      roleId: roles['SYSTEM_ADMIN']!.id,
    },
    create: {
      projectId: sampleProject.id,
      userId: adminUser.id,
      roleId: roles['SYSTEM_ADMIN']!.id,
    },
  });

  console.log('Added admin user to sample project with SYSTEM_ADMIN role');

  // Add admin user to QA group
  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: adminUser.id,
        groupId: qaGroup.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      groupId: qaGroup.id,
    },
  });

  console.log('Added admin user to QA group');

  // Create audit log for seeding
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'SEED',
      targetType: 'DATABASE',
      details: {
        message: 'Initial seed data created',
        roles: SYSTEM_ROLE_NAMES,
        groups: ['QAチーム', '開発チーム'],
      },
    },
  });

  console.log('Created audit log entry');
  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
