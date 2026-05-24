/**
 * テストセクション関連の型定義
 */

// ============================================
// 基本型定義
// ============================================

/**
 * テストセクション
 */
export interface TestSection {
  id: string;
  testSpecId: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * テストセクション詳細（子セクション含む）
 */
export interface TestSectionWithChildren extends TestSection {
  children: TestSectionWithChildren[];
}

/**
 * テストセクション詳細（親セクション含む）
 */
export interface TestSectionWithParent extends TestSection {
  parent: TestSection | null;
}

/**
 * テストセクション詳細（親と子両方含む）
 */
export interface TestSectionDetail extends TestSection {
  parent: TestSection | null;
  children: TestSection[];
  testSpec: {
    id: string;
    name: string;
  };
}

/**
 * テストセクションツリー（階層構造）
 */
export interface TestSectionTree {
  testSpecId: string;
  sections: TestSectionWithChildren[];
}

// ============================================
// 入力・更新型定義
// ============================================

/**
 * テストセクション作成入力
 */
export interface CreateTestSectionInput {
  testSpecId: string;
  parentId?: string | null;
  name: string;
  sortOrder?: number;
}

/**
 * テストセクション更新入力
 */
export interface UpdateTestSectionInput {
  name?: string;
  parentId?: string | null;
  sortOrder?: number;
}

/**
 * テストセクション並び順更新入力
 */
export interface UpdateSortOrderInput {
  id: string;
  sortOrder: number;
}

/**
 * テストセクション移動入力
 */
export interface MoveTestSectionInput {
  parentId: string | null;
  sortOrder?: number;
}

// ============================================
// 検索・フィルタ型定義
// ============================================

/**
 * テストセクション検索パラメータ
 */
export interface TestSectionSearchParams {
  testSpecId: string;
  parentId?: string | null;
  query?: string;
}

// ============================================
// バリデーション関数
// ============================================

/**
 * テストセクション名のバリデーション
 */
export function validateTestSectionName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'セクション名は必須です。' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length > 255) {
    return { valid: false, error: 'セクション名は255文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * 並び順のバリデーション
 */
export function validateSortOrder(sortOrder: number): {
  valid: boolean;
  error?: string;
} {
  if (!Number.isInteger(sortOrder)) {
    return { valid: false, error: '並び順は整数で指定してください。' };
  }

  if (sortOrder < 0) {
    return { valid: false, error: '並び順は0以上の値を指定してください。' };
  }

  if (sortOrder > 999999) {
    return { valid: false, error: '並び順は999999以下の値を指定してください。' };
  }

  return { valid: true };
}

/**
 * テストセクション作成入力のバリデーション
 */
export function validateCreateTestSectionInput(input: CreateTestSectionInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // テスト仕様書ID
  if (!input.testSpecId || input.testSpecId.trim() === '') {
    errors.push('テスト仕様書IDは必須です。');
  }

  // セクション名
  const nameValidation = validateTestSectionName(input.name);
  if (!nameValidation.valid && nameValidation.error) {
    errors.push(nameValidation.error);
  }

  // 並び順（指定されている場合）
  if (input.sortOrder !== undefined) {
    const sortOrderValidation = validateSortOrder(input.sortOrder);
    if (!sortOrderValidation.valid && sortOrderValidation.error) {
      errors.push(sortOrderValidation.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * テストセクション更新入力のバリデーション
 */
export function validateUpdateTestSectionInput(input: UpdateTestSectionInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // セクション名（指定されている場合）
  if (input.name !== undefined) {
    const nameValidation = validateTestSectionName(input.name);
    if (!nameValidation.valid && nameValidation.error) {
      errors.push(nameValidation.error);
    }
  }

  // 並び順（指定されている場合）
  if (input.sortOrder !== undefined) {
    const sortOrderValidation = validateSortOrder(input.sortOrder);
    if (!sortOrderValidation.valid && sortOrderValidation.error) {
      errors.push(sortOrderValidation.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 並び順一括更新入力のバリデーション
 */
export function validateBulkSortOrderUpdate(items: UpdateSortOrderInput[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(items)) {
    errors.push('並び順更新データは配列で指定してください。');
    return { valid: false, errors };
  }

  if (items.length === 0) {
    errors.push('並び順更新データが空です。');
    return { valid: false, errors };
  }

  // 重複IDチェック
  const ids = items.map((item) => item.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    errors.push('重複したIDが含まれています。');
  }

  // 各項目のバリデーション
  items.forEach((item, index) => {
    if (!item.id || item.id.trim() === '') {
      errors.push(`項目${index + 1}: IDは必須です。`);
    }

    if (item.sortOrder === undefined || item.sortOrder === null) {
      errors.push(`項目${index + 1}: 並び順は必須です。`);
    } else {
      const sortOrderValidation = validateSortOrder(item.sortOrder);
      if (!sortOrderValidation.valid && sortOrderValidation.error) {
        errors.push(`項目${index + 1}: ${sortOrderValidation.error}`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * フラットなセクションリストをツリー構造に変換
 */
export function buildSectionTree(sections: TestSection[]): TestSectionWithChildren[] {
  const sectionMap = new Map<string, TestSectionWithChildren>();
  const rootSections: TestSectionWithChildren[] = [];

  // まず全てのセクションをマップに登録
  sections.forEach((section) => {
    sectionMap.set(section.id, { ...section, children: [] });
  });

  // 親子関係を構築
  sections.forEach((section) => {
    const currentSection = sectionMap.get(section.id)!;

    if (section.parentId === null) {
      rootSections.push(currentSection);
    } else {
      const parentSection = sectionMap.get(section.parentId);
      if (parentSection) {
        parentSection.children.push(currentSection);
      } else {
        // 親が見つからない場合はルートに追加
        rootSections.push(currentSection);
      }
    }
  });

  // 各階層で並び順でソート
  const sortByOrder = (a: TestSectionWithChildren, b: TestSectionWithChildren) =>
    a.sortOrder - b.sortOrder;

  const sortRecursively = (sections: TestSectionWithChildren[]): void => {
    sections.sort(sortByOrder);
    sections.forEach((section) => {
      if (section.children.length > 0) {
        sortRecursively(section.children);
      }
    });
  };

  sortRecursively(rootSections);

  return rootSections;
}

/**
 * ツリー構造をフラットなリストに変換
 */
export function flattenSectionTree(tree: TestSectionWithChildren[]): TestSection[] {
  const result: TestSection[] = [];

  const traverse = (sections: TestSectionWithChildren[]): void => {
    sections.forEach((section) => {
      // childrenを除いた基本情報を追加
      const { children, ...sectionData } = section;
      result.push(sectionData);

      if (children.length > 0) {
        traverse(children);
      }
    });
  };

  traverse(tree);

  return result;
}

/**
 * セクションの深さを取得
 */
export function getSectionDepth(sectionId: string, sections: TestSection[]): number {
  const sectionMap = new Map<string, TestSection>();
  sections.forEach((section) => {
    sectionMap.set(section.id, section);
  });

  let depth = 0;
  let currentId: string | null = sectionId;

  while (currentId !== null) {
    const section = sectionMap.get(currentId);
    if (!section) break;

    if (section.parentId === null) break;

    currentId = section.parentId;
    depth++;
  }

  return depth;
}

/**
 * セクションの子孫IDを全て取得
 */
export function getDescendantIds(sectionId: string, sections: TestSection[]): string[] {
  const childMap = new Map<string, string[]>();

  sections.forEach((section) => {
    if (section.parentId !== null) {
      const children = childMap.get(section.parentId) || [];
      children.push(section.id);
      childMap.set(section.parentId, children);
    }
  });

  const result: string[] = [];

  const collectDescendants = (id: string): void => {
    const children = childMap.get(id) || [];
    children.forEach((childId) => {
      result.push(childId);
      collectDescendants(childId);
    });
  };

  collectDescendants(sectionId);

  return result;
}

/**
 * セクションの祖先IDを全て取得（親から順に）
 */
export function getAncestorIds(sectionId: string, sections: TestSection[]): string[] {
  const sectionMap = new Map<string, TestSection>();
  sections.forEach((section) => {
    sectionMap.set(section.id, section);
  });

  const result: string[] = [];
  let currentId: string | null = sectionId;

  while (currentId !== null) {
    const section = sectionMap.get(currentId);
    if (!section) break;

    if (section.parentId === null) break;

    result.unshift(section.parentId);
    currentId = section.parentId;
  }

  return result;
}

/**
 * 循環参照チェック
 * @returns true if circular reference detected
 */
export function hasCircularReference(
  sectionId: string,
  newParentId: string | null,
  sections: TestSection[]
): boolean {
  if (newParentId === null) {
    return false;
  }

  if (sectionId === newParentId) {
    return true;
  }

  // 子孫にnewParentIdが含まれていたら循環参照
  const descendantIds = getDescendantIds(sectionId, sections);
  return descendantIds.includes(newParentId);
}

/**
 * 次の並び順を計算
 */
export function getNextSortOrder(sections: TestSection[], parentId: string | null = null): number {
  const siblings = sections.filter((s) => s.parentId === parentId);

  if (siblings.length === 0) {
    return 0;
  }

  const maxSortOrder = Math.max(...siblings.map((s) => s.sortOrder));
  return maxSortOrder + 1;
}

/**
 * 並び順を再計算（連番に整理）
 */
export function recalculateSortOrders(
  sections: TestSection[],
  parentId: string | null = null
): UpdateSortOrderInput[] {
  const siblings = sections
    .filter((s) => s.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return siblings.map((section, index) => ({
    id: section.id,
    sortOrder: index,
  }));
}
