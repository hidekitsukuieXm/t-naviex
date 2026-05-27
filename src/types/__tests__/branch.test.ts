/**
 * Branch Management Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  BranchStatus,
  BranchType,
  MergeStatus,
  ConflictType,
  ResolutionType,
  getBranchStatusLabel,
  getBranchStatusColor,
  getBranchTypeLabel,
  getBranchTypeColor,
  getMergeStatusLabel,
  getMergeStatusColor,
  getConflictTypeLabel,
  getResolutionTypeLabel,
  createEmptyBranch,
  validateBranchName,
  validateBranch,
  calculateTestCaseChecksum,
  compareTestCases,
  generateBranchPath,
  TestCaseSnapshot,
  Branch,
} from '../branch';

// ====================================
// Label Functions Tests
// ====================================

describe('getBranchStatusLabel', () => {
  it('should return correct label for each status', () => {
    expect(getBranchStatusLabel(BranchStatus.ACTIVE)).toBe('アクティブ');
    expect(getBranchStatusLabel(BranchStatus.MERGED)).toBe('マージ済み');
    expect(getBranchStatusLabel(BranchStatus.DELETED)).toBe('削除済み');
    expect(getBranchStatusLabel(BranchStatus.FROZEN)).toBe('凍結');
  });

  it('should return status as fallback for unknown status', () => {
    expect(getBranchStatusLabel('UNKNOWN' as BranchStatus)).toBe('UNKNOWN');
  });
});

describe('getBranchStatusColor', () => {
  it('should return correct color for each status', () => {
    expect(getBranchStatusColor(BranchStatus.ACTIVE)).toBe('green');
    expect(getBranchStatusColor(BranchStatus.MERGED)).toBe('blue');
    expect(getBranchStatusColor(BranchStatus.DELETED)).toBe('gray');
    expect(getBranchStatusColor(BranchStatus.FROZEN)).toBe('orange');
  });
});

describe('getBranchTypeLabel', () => {
  it('should return correct label for each type', () => {
    expect(getBranchTypeLabel(BranchType.MASTER)).toBe('マスター');
    expect(getBranchTypeLabel(BranchType.FEATURE)).toBe('フィーチャー');
    expect(getBranchTypeLabel(BranchType.RELEASE)).toBe('リリース');
    expect(getBranchTypeLabel(BranchType.HOTFIX)).toBe('ホットフィックス');
    expect(getBranchTypeLabel(BranchType.EXPERIMENTAL)).toBe('実験');
  });
});

describe('getBranchTypeColor', () => {
  it('should return correct color for each type', () => {
    expect(getBranchTypeColor(BranchType.MASTER)).toBe('purple');
    expect(getBranchTypeColor(BranchType.FEATURE)).toBe('blue');
    expect(getBranchTypeColor(BranchType.RELEASE)).toBe('green');
    expect(getBranchTypeColor(BranchType.HOTFIX)).toBe('red');
    expect(getBranchTypeColor(BranchType.EXPERIMENTAL)).toBe('orange');
  });
});

describe('getMergeStatusLabel', () => {
  it('should return correct label for each status', () => {
    expect(getMergeStatusLabel(MergeStatus.PENDING)).toBe('保留中');
    expect(getMergeStatusLabel(MergeStatus.IN_PROGRESS)).toBe('進行中');
    expect(getMergeStatusLabel(MergeStatus.COMPLETED)).toBe('完了');
    expect(getMergeStatusLabel(MergeStatus.CONFLICT)).toBe('コンフリクト');
    expect(getMergeStatusLabel(MergeStatus.CANCELLED)).toBe('キャンセル');
  });
});

describe('getMergeStatusColor', () => {
  it('should return correct color for each status', () => {
    expect(getMergeStatusColor(MergeStatus.PENDING)).toBe('yellow');
    expect(getMergeStatusColor(MergeStatus.IN_PROGRESS)).toBe('blue');
    expect(getMergeStatusColor(MergeStatus.COMPLETED)).toBe('green');
    expect(getMergeStatusColor(MergeStatus.CONFLICT)).toBe('red');
    expect(getMergeStatusColor(MergeStatus.CANCELLED)).toBe('gray');
  });
});

describe('getConflictTypeLabel', () => {
  it('should return correct label for each type', () => {
    expect(getConflictTypeLabel(ConflictType.CONTENT_MODIFIED)).toBe('コンテンツ変更');
    expect(getConflictTypeLabel(ConflictType.DELETE_MODIFY)).toBe('削除と変更');
    expect(getConflictTypeLabel(ConflictType.BOTH_ADDED)).toBe('両方追加');
    expect(getConflictTypeLabel(ConflictType.RENAME)).toBe('名前変更');
  });
});

describe('getResolutionTypeLabel', () => {
  it('should return correct label for each type', () => {
    expect(getResolutionTypeLabel(ResolutionType.USE_SOURCE)).toBe('ソースを使用');
    expect(getResolutionTypeLabel(ResolutionType.USE_TARGET)).toBe('ターゲットを使用');
    expect(getResolutionTypeLabel(ResolutionType.MANUAL_MERGE)).toBe('手動マージ');
    expect(getResolutionTypeLabel(ResolutionType.SKIP)).toBe('スキップ');
  });
});

// ====================================
// Factory Functions Tests
// ====================================

describe('createEmptyBranch', () => {
  it('should create an empty branch with default values', () => {
    const branch = createEmptyBranch('test-spec-123');

    expect(branch.testSpecId).toBe('test-spec-123');
    expect(branch.name).toBe('');
    expect(branch.type).toBe(BranchType.FEATURE);
    expect(branch.status).toBe(BranchStatus.ACTIVE);
    expect(branch.createdBy).toBe('');
  });
});

// ====================================
// Validation Functions Tests
// ====================================

describe('validateBranchName', () => {
  it('should validate a valid branch name', () => {
    const result = validateBranchName('feature/new-test');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate Japanese branch name', () => {
    const result = validateBranchName('機能追加');
    expect(result.valid).toBe(true);
  });

  it('should fail if name is empty', () => {
    const result = validateBranchName('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ブランチ名は必須です');
  });

  it('should fail if name is whitespace only', () => {
    const result = validateBranchName('   ');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ブランチ名は必須です');
  });

  it('should fail if name is too short', () => {
    const result = validateBranchName('a');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ブランチ名は2文字以上で入力してください');
  });

  it('should fail if name is too long', () => {
    const result = validateBranchName('a'.repeat(101));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ブランチ名は100文字以内で入力してください');
  });

  it('should fail if name contains invalid characters', () => {
    const result = validateBranchName('feature@test');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ブランチ名に使用できない文字が含まれています');
  });

  it('should fail if name is master', () => {
    const result = validateBranchName('master');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('master/mainは予約語のため使用できません');
  });

  it('should fail if name is main', () => {
    const result = validateBranchName('main');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('master/mainは予約語のため使用できません');
  });
});

describe('validateBranch', () => {
  it('should validate a valid branch', () => {
    const branch = {
      testSpecId: 'test-spec-123',
      name: 'feature/new-test',
      type: BranchType.FEATURE,
      status: BranchStatus.ACTIVE,
      createdBy: 'user-123',
    };

    const result = validateBranch(branch);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail if testSpecId is missing', () => {
    const branch = {
      testSpecId: '',
      name: 'feature/new-test',
      type: BranchType.FEATURE,
      status: BranchStatus.ACTIVE,
      createdBy: 'user-123',
    };

    const result = validateBranch(branch);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('テスト仕様書IDは必須です');
  });

  it('should fail if type is invalid', () => {
    const branch = {
      testSpecId: 'test-spec-123',
      name: 'feature/new-test',
      type: 'INVALID' as BranchType,
      status: BranchStatus.ACTIVE,
      createdBy: 'user-123',
    };

    const result = validateBranch(branch);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('無効なブランチタイプです');
  });

  it('should fail if status is invalid', () => {
    const branch = {
      testSpecId: 'test-spec-123',
      name: 'feature/new-test',
      type: BranchType.FEATURE,
      status: 'INVALID' as BranchStatus,
      createdBy: 'user-123',
    };

    const result = validateBranch(branch);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('無効なブランチステータスです');
  });
});

// ====================================
// Utility Functions Tests
// ====================================

describe('calculateTestCaseChecksum', () => {
  it('should return consistent checksum for same content', () => {
    const testCase: Omit<TestCaseSnapshot, 'checksum'> = {
      testCaseId: 'tc-1',
      title: 'Test Case 1',
      description: 'Description',
      steps: [{ stepNumber: 1, action: 'Action 1', expectedResult: 'Result 1' }],
      tags: ['tag1', 'tag2'],
    };

    const checksum1 = calculateTestCaseChecksum(testCase);
    const checksum2 = calculateTestCaseChecksum(testCase);

    expect(checksum1).toBe(checksum2);
  });

  it('should return different checksum for different content', () => {
    const testCase1: Omit<TestCaseSnapshot, 'checksum'> = {
      testCaseId: 'tc-1',
      title: 'Test Case 1',
      steps: [],
      tags: [],
    };

    const testCase2: Omit<TestCaseSnapshot, 'checksum'> = {
      testCaseId: 'tc-1',
      title: 'Test Case 2',
      steps: [],
      tags: [],
    };

    const checksum1 = calculateTestCaseChecksum(testCase1);
    const checksum2 = calculateTestCaseChecksum(testCase2);

    expect(checksum1).not.toBe(checksum2);
  });

  it('should return same checksum regardless of tag order', () => {
    const testCase1: Omit<TestCaseSnapshot, 'checksum'> = {
      testCaseId: 'tc-1',
      title: 'Test Case 1',
      steps: [],
      tags: ['tag1', 'tag2'],
    };

    const testCase2: Omit<TestCaseSnapshot, 'checksum'> = {
      testCaseId: 'tc-1',
      title: 'Test Case 1',
      steps: [],
      tags: ['tag2', 'tag1'],
    };

    const checksum1 = calculateTestCaseChecksum(testCase1);
    const checksum2 = calculateTestCaseChecksum(testCase2);

    expect(checksum1).toBe(checksum2);
  });
});

describe('compareTestCases', () => {
  it('should return equal for identical test cases', () => {
    const testCase: TestCaseSnapshot = {
      testCaseId: 'tc-1',
      title: 'Test Case 1',
      description: 'Description',
      steps: [{ stepNumber: 1, action: 'Action 1', expectedResult: 'Result 1' }],
      tags: ['tag1'],
      checksum: 'abc123',
    };

    const result = compareTestCases(testCase, testCase);
    expect(result.equal).toBe(true);
    expect(result.changes).toHaveLength(0);
  });

  it('should detect title change', () => {
    const source: TestCaseSnapshot = {
      testCaseId: 'tc-1',
      title: 'Test Case 1',
      steps: [],
      tags: [],
      checksum: 'abc123',
    };

    const target: TestCaseSnapshot = {
      ...source,
      title: 'Test Case 2',
    };

    const result = compareTestCases(source, target);
    expect(result.equal).toBe(false);
    expect(result.changes).toContain('タイトルが変更されました');
  });

  it('should detect description change', () => {
    const source: TestCaseSnapshot = {
      testCaseId: 'tc-1',
      title: 'Test Case 1',
      description: 'Old description',
      steps: [],
      tags: [],
      checksum: 'abc123',
    };

    const target: TestCaseSnapshot = {
      ...source,
      description: 'New description',
    };

    const result = compareTestCases(source, target);
    expect(result.equal).toBe(false);
    expect(result.changes).toContain('説明が変更されました');
  });

  it('should detect step count change', () => {
    const source: TestCaseSnapshot = {
      testCaseId: 'tc-1',
      title: 'Test Case 1',
      steps: [{ stepNumber: 1, action: 'Action 1' }],
      tags: [],
      checksum: 'abc123',
    };

    const target: TestCaseSnapshot = {
      ...source,
      steps: [
        { stepNumber: 1, action: 'Action 1' },
        { stepNumber: 2, action: 'Action 2' },
      ],
    };

    const result = compareTestCases(source, target);
    expect(result.equal).toBe(false);
    expect(result.changes).toContain('ステップ数が変更されました (1 -> 2)');
  });

  it('should detect step content change', () => {
    const source: TestCaseSnapshot = {
      testCaseId: 'tc-1',
      title: 'Test Case 1',
      steps: [{ stepNumber: 1, action: 'Action 1', expectedResult: 'Result 1' }],
      tags: [],
      checksum: 'abc123',
    };

    const target: TestCaseSnapshot = {
      ...source,
      steps: [{ stepNumber: 1, action: 'Action 1', expectedResult: 'Result 2' }],
    };

    const result = compareTestCases(source, target);
    expect(result.equal).toBe(false);
    expect(result.changes).toContain('ステップ1が変更されました');
  });

  it('should detect tag change', () => {
    const source: TestCaseSnapshot = {
      testCaseId: 'tc-1',
      title: 'Test Case 1',
      steps: [],
      tags: ['tag1'],
      checksum: 'abc123',
    };

    const target: TestCaseSnapshot = {
      ...source,
      tags: ['tag2'],
    };

    const result = compareTestCases(source, target);
    expect(result.equal).toBe(false);
    expect(result.changes).toContain('タグが変更されました');
  });

  it('should detect multiple changes', () => {
    const source: TestCaseSnapshot = {
      testCaseId: 'tc-1',
      title: 'Test Case 1',
      description: 'Old',
      priority: 1,
      steps: [],
      tags: [],
      checksum: 'abc123',
    };

    const target: TestCaseSnapshot = {
      ...source,
      title: 'Test Case 2',
      description: 'New',
      priority: 2,
    };

    const result = compareTestCases(source, target);
    expect(result.equal).toBe(false);
    expect(result.changes.length).toBeGreaterThanOrEqual(3);
  });
});

describe('generateBranchPath', () => {
  it('should return single item path for branch without parent', () => {
    const branches: Branch[] = [
      {
        id: 'branch-1',
        testSpecId: 'spec-1',
        name: 'master',
        type: BranchType.MASTER,
        status: BranchStatus.ACTIVE,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const path = generateBranchPath(branches, 'branch-1');
    expect(path).toHaveLength(1);
    expect(path[0]).toEqual({ id: 'branch-1', name: 'master' });
  });

  it('should return correct path for nested branches', () => {
    const branches: Branch[] = [
      {
        id: 'branch-1',
        testSpecId: 'spec-1',
        name: 'master',
        type: BranchType.MASTER,
        status: BranchStatus.ACTIVE,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'branch-2',
        testSpecId: 'spec-1',
        name: 'feature-1',
        type: BranchType.FEATURE,
        status: BranchStatus.ACTIVE,
        parentBranchId: 'branch-1',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'branch-3',
        testSpecId: 'spec-1',
        name: 'sub-feature',
        type: BranchType.FEATURE,
        status: BranchStatus.ACTIVE,
        parentBranchId: 'branch-2',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const path = generateBranchPath(branches, 'branch-3');
    expect(path).toHaveLength(3);
    expect(path[0]).toEqual({ id: 'branch-1', name: 'master' });
    expect(path[1]).toEqual({ id: 'branch-2', name: 'feature-1' });
    expect(path[2]).toEqual({ id: 'branch-3', name: 'sub-feature' });
  });

  it('should return empty array for non-existent branch', () => {
    const branches: Branch[] = [];
    const path = generateBranchPath(branches, 'non-existent');
    expect(path).toHaveLength(0);
  });
});
