import 'dotenv/config';
import { PrismaClient, UserStatus, ProjectStatus } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL']!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding...');

  // Create default roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      permissions: {
        projects: ['create', 'read', 'update', 'delete'],
        users: ['create', 'read', 'update', 'delete'],
        settings: ['read', 'update'],
      },
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: {
      name: 'Manager',
      permissions: {
        projects: ['create', 'read', 'update'],
        users: ['read'],
        testCases: ['create', 'read', 'update', 'delete'],
        testRuns: ['create', 'read', 'update', 'delete'],
      },
    },
  });

  const testerRole = await prisma.role.upsert({
    where: { name: 'Tester' },
    update: {},
    create: {
      name: 'Tester',
      permissions: {
        projects: ['read'],
        testCases: ['read', 'update'],
        testRuns: ['read', 'update'],
        testResults: ['create', 'read', 'update'],
      },
    },
  });

  const viewerRole = await prisma.role.upsert({
    where: { name: 'Viewer' },
    update: {},
    create: {
      name: 'Viewer',
      permissions: {
        projects: ['read'],
        testCases: ['read'],
        testRuns: ['read'],
        testResults: ['read'],
      },
    },
  });

  console.log('Created roles:', { adminRole, managerRole, testerRole, viewerRole });

  // Create default groups
  const qaGroup = await prisma.group.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      name: 'QA Team',
    },
  });

  const devGroup = await prisma.group.upsert({
    where: { id: BigInt(2) },
    update: {},
    create: {
      name: 'Development Team',
    },
  });

  console.log('Created groups:', { qaGroup, devGroup });

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Administrator',
      status: UserStatus.ACTIVE,
      mfaEnabled: false,
    },
  });

  console.log('Created admin user:', adminUser);

  // Create sample project
  const sampleProject = await prisma.project.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      name: 'Sample Project',
      description: 'A sample project for testing',
      status: ProjectStatus.ACTIVE,
      projectType: 'Web Application',
      targetVersion: '1.0.0',
    },
  });

  console.log('Created sample project:', sampleProject);

  // Add admin user to sample project with Admin role
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: sampleProject.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      projectId: sampleProject.id,
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log('Added admin user to sample project');

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
      details: { message: 'Initial seed data created' },
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
