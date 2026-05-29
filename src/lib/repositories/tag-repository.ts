import { prisma } from '@/lib/prisma';
import type {
  Tag,
  TagWithCount,
  CreateTagInput,
  UpdateTagInput,
  TagSearchParams,
  TagListResponse,
  TestCaseTagInfo,
} from '@/types/tag';

// ============================================
// Type Definitions (Internal)
// ============================================

interface DbTag {
  id: bigint;
  projectId: bigint;
  name: string;
  color: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DbTagWithCount extends DbTag {
  _count: {
    testCaseTags: number;
  };
}

// ============================================
// Serialization Helpers
// ============================================

/**
 * Serialize database tag to API tag
 */
function serializeTag(dbTag: DbTag): Tag {
  return {
    id: dbTag.id.toString(),
    projectId: dbTag.projectId.toString(),
    name: dbTag.name,
    color: dbTag.color,
    description: dbTag.description,
    createdAt: dbTag.createdAt.toISOString(),
    updatedAt: dbTag.updatedAt.toISOString(),
  };
}

/**
 * Serialize database tag with count to API tag with count
 */
function serializeTagWithCount(dbTag: DbTagWithCount): TagWithCount {
  return {
    ...serializeTag(dbTag),
    usageCount: dbTag._count.testCaseTags,
  };
}

// ============================================
// Tag Repository Functions
// ============================================

/**
 * Get tags by project ID with pagination and search
 */
export async function getTags(params: TagSearchParams): Promise<TagListResponse> {
  const { projectId, search, page = 1, limit = 50 } = params;
  const skip = (page - 1) * limit;

  const where = {
    projectId: BigInt(projectId),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [tags, total] = await Promise.all([
    prisma.tag.findMany({
      where,
      include: {
        _count: {
          select: { testCaseTags: true },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.tag.count({ where }),
  ]);

  return {
    tags: tags.map(serializeTagWithCount),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get all tags for a project (no pagination, for dropdowns)
 */
export async function getAllTags(projectId: string): Promise<Tag[]> {
  const tags = await prisma.tag.findMany({
    where: { projectId: BigInt(projectId) },
    orderBy: { name: 'asc' },
  });

  return tags.map(serializeTag);
}

/**
 * Get tag by ID
 */
export async function getTagById(id: string): Promise<TagWithCount | null> {
  const tag = await prisma.tag.findUnique({
    where: { id: BigInt(id) },
    include: {
      _count: {
        select: { testCaseTags: true },
      },
    },
  });

  return tag ? serializeTagWithCount(tag) : null;
}

/**
 * Get tag by name within a project
 */
export async function getTagByName(projectId: string, name: string): Promise<Tag | null> {
  const tag = await prisma.tag.findUnique({
    where: {
      projectId_name: {
        projectId: BigInt(projectId),
        name,
      },
    },
  });

  return tag ? serializeTag(tag) : null;
}

/**
 * Create a new tag
 */
export async function createTag(input: CreateTagInput): Promise<Tag> {
  const tag = await prisma.tag.create({
    data: {
      projectId: BigInt(input.projectId),
      name: input.name.trim(),
      color: input.color || '#3b82f6',
      description: input.description?.trim() || null,
    },
  });

  return serializeTag(tag);
}

/**
 * Update a tag
 */
export async function updateTag(id: string, input: UpdateTagInput): Promise<Tag | null> {
  const tag = await prisma.tag.update({
    where: { id: BigInt(id) },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.description !== undefined && {
        description: input.description?.trim() || null,
      }),
    },
  });

  return serializeTag(tag);
}

/**
 * Delete a tag
 */
export async function deleteTag(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.tag.delete({
      where: { id: BigInt(id) },
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '削除に失敗しました。',
    };
  }
}

/**
 * Bulk delete tags
 */
export async function deleteTags(
  ids: string[]
): Promise<{ success: boolean; deletedCount: number }> {
  const result = await prisma.tag.deleteMany({
    where: {
      id: { in: ids.map((id) => BigInt(id)) },
    },
  });

  return { success: true, deletedCount: result.count };
}

// ============================================
// Test Case Tag Functions
// ============================================

/**
 * Get tags for a test case
 */
export async function getTagsForTestCase(testCaseId: string): Promise<TestCaseTagInfo[]> {
  const testCaseTags = await prisma.testCaseTag.findMany({
    where: { testCaseId: BigInt(testCaseId) },
    include: {
      tag: true,
    },
    orderBy: {
      tag: { name: 'asc' },
    },
  });

  return testCaseTags.map((tc) => ({
    id: tc.tag.id.toString(),
    name: tc.tag.name,
    color: tc.tag.color,
  }));
}

/**
 * Set tags for a test case (replaces existing tags)
 */
export async function setTagsForTestCase(
  testCaseId: string,
  tagIds: string[]
): Promise<TestCaseTagInfo[]> {
  const testCaseIdBigInt = BigInt(testCaseId);

  await prisma.$transaction(async (tx) => {
    // Remove existing tags
    await tx.testCaseTag.deleteMany({
      where: { testCaseId: testCaseIdBigInt },
    });

    // Add new tags
    if (tagIds.length > 0) {
      await tx.testCaseTag.createMany({
        data: tagIds.map((tagId) => ({
          testCaseId: testCaseIdBigInt,
          tagId: BigInt(tagId),
        })),
      });
    }
  });

  return getTagsForTestCase(testCaseId);
}

/**
 * Add a tag to a test case
 */
export async function addTagToTestCase(
  testCaseId: string,
  tagId: string
): Promise<TestCaseTagInfo | null> {
  try {
    await prisma.testCaseTag.create({
      data: {
        testCaseId: BigInt(testCaseId),
        tagId: BigInt(tagId),
      },
    });

    const tag = await prisma.tag.findUnique({
      where: { id: BigInt(tagId) },
    });

    return tag
      ? {
          id: tag.id.toString(),
          name: tag.name,
          color: tag.color,
        }
      : null;
  } catch {
    // Already exists or invalid
    return null;
  }
}

/**
 * Remove a tag from a test case
 */
export async function removeTagFromTestCase(
  testCaseId: string,
  tagId: string
): Promise<{ success: boolean }> {
  try {
    await prisma.testCaseTag.delete({
      where: {
        testCaseId_tagId: {
          testCaseId: BigInt(testCaseId),
          tagId: BigInt(tagId),
        },
      },
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Get test cases with a specific tag
 */
export async function getTestCaseIdsWithTag(tagId: string): Promise<string[]> {
  const testCaseTags = await prisma.testCaseTag.findMany({
    where: { tagId: BigInt(tagId) },
    select: { testCaseId: true },
  });

  return testCaseTags.map((tc) => tc.testCaseId.toString());
}

/**
 * Find or create a tag
 */
export async function findOrCreateTag(
  projectId: string,
  name: string,
  color?: string
): Promise<Tag> {
  const existingTag = await getTagByName(projectId, name.trim());
  if (existingTag) {
    return existingTag;
  }

  return createTag({
    projectId,
    name: name.trim(),
    color,
  });
}

/**
 * Migrate string tags to Tag entities
 * Utility function to help migrate existing string-based tags
 */
export async function migrateStringTagsToEntities(
  projectId: string,
  testCaseId: string,
  stringTags: string[]
): Promise<TestCaseTagInfo[]> {
  const tagIds: string[] = [];

  for (const tagName of stringTags) {
    if (tagName.trim()) {
      const tag = await findOrCreateTag(projectId, tagName.trim());
      tagIds.push(tag.id);
    }
  }

  return setTagsForTestCase(testCaseId, tagIds);
}
