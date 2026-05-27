/**
 * Smart Test Selection Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ChangeType,
  ChangeSeverity,
  ImpactScope,
  SelectionReasonType,
  SelectionStatus,
  getChangeTypeLabel,
  getChangeTypeColor,
  getSeverityLabel,
  getSeverityColor,
  getImpactScopeLabel,
  getSelectionReasonLabel,
  getSelectionStatusLabel,
  getSelectionStatusColor,
  createEmptyChangeItem,
  createEmptyChangeSet,
  calculatePriorityScore,
  calculateSelectionSummary,
  validateChangeItem,
  validateChangeSet,
  formatDuration,
  getImpactLevelValue,
  getSeverityValue,
  SelectionReason,
  TestCaseSelection,
} from '../smart-test-selection';

// ====================================
// Label Functions Tests
// ====================================

describe('getChangeTypeLabel', () => {
  it('should return correct label for each change type', () => {
    expect(getChangeTypeLabel(ChangeType.CODE)).toBe('コード');
    expect(getChangeTypeLabel(ChangeType.CONFIG)).toBe('設定');
    expect(getChangeTypeLabel(ChangeType.DATABASE)).toBe('データベース');
    expect(getChangeTypeLabel(ChangeType.API)).toBe('API');
    expect(getChangeTypeLabel(ChangeType.UI)).toBe('UI');
    expect(getChangeTypeLabel(ChangeType.INFRASTRUCTURE)).toBe('インフラ');
    expect(getChangeTypeLabel(ChangeType.DEPENDENCY)).toBe('依存関係');
    expect(getChangeTypeLabel(ChangeType.DOCUMENTATION)).toBe('ドキュメント');
    expect(getChangeTypeLabel(ChangeType.OTHER)).toBe('その他');
  });

  it('should return type as fallback for unknown type', () => {
    expect(getChangeTypeLabel('UNKNOWN' as ChangeType)).toBe('UNKNOWN');
  });
});

describe('getChangeTypeColor', () => {
  it('should return correct color for each change type', () => {
    expect(getChangeTypeColor(ChangeType.CODE)).toBe('blue');
    expect(getChangeTypeColor(ChangeType.CONFIG)).toBe('orange');
    expect(getChangeTypeColor(ChangeType.DATABASE)).toBe('purple');
    expect(getChangeTypeColor(ChangeType.API)).toBe('green');
    expect(getChangeTypeColor(ChangeType.UI)).toBe('pink');
    expect(getChangeTypeColor(ChangeType.INFRASTRUCTURE)).toBe('gray');
    expect(getChangeTypeColor(ChangeType.DEPENDENCY)).toBe('yellow');
  });
});

describe('getSeverityLabel', () => {
  it('should return correct label for each severity', () => {
    expect(getSeverityLabel(ChangeSeverity.CRITICAL)).toBe('クリティカル');
    expect(getSeverityLabel(ChangeSeverity.HIGH)).toBe('高');
    expect(getSeverityLabel(ChangeSeverity.MEDIUM)).toBe('中');
    expect(getSeverityLabel(ChangeSeverity.LOW)).toBe('低');
  });
});

describe('getSeverityColor', () => {
  it('should return correct color for each severity', () => {
    expect(getSeverityColor(ChangeSeverity.CRITICAL)).toBe('red');
    expect(getSeverityColor(ChangeSeverity.HIGH)).toBe('orange');
    expect(getSeverityColor(ChangeSeverity.MEDIUM)).toBe('yellow');
    expect(getSeverityColor(ChangeSeverity.LOW)).toBe('green');
  });
});

describe('getImpactScopeLabel', () => {
  it('should return correct label for each impact scope', () => {
    expect(getImpactScopeLabel(ImpactScope.SINGLE_FEATURE)).toBe('単一機能');
    expect(getImpactScopeLabel(ImpactScope.MULTIPLE_FEATURES)).toBe('複数機能');
    expect(getImpactScopeLabel(ImpactScope.MODULE)).toBe('モジュール全体');
    expect(getImpactScopeLabel(ImpactScope.SYSTEM_WIDE)).toBe('システム全体');
  });
});

describe('getSelectionReasonLabel', () => {
  it('should return correct label for each selection reason', () => {
    expect(getSelectionReasonLabel(SelectionReasonType.DIRECT_IMPACT)).toBe('直接影響');
    expect(getSelectionReasonLabel(SelectionReasonType.INDIRECT_IMPACT)).toBe('間接影響');
    expect(getSelectionReasonLabel(SelectionReasonType.REGRESSION_RISK)).toBe('回帰リスク');
    expect(getSelectionReasonLabel(SelectionReasonType.HISTORICAL_FAILURE)).toBe('過去の障害');
    expect(getSelectionReasonLabel(SelectionReasonType.RELATED_FEATURE)).toBe('関連機能');
    expect(getSelectionReasonLabel(SelectionReasonType.HIGH_PRIORITY)).toBe('高優先度');
    expect(getSelectionReasonLabel(SelectionReasonType.REQUIREMENT_COVERAGE)).toBe(
      '要件カバレッジ'
    );
    expect(getSelectionReasonLabel(SelectionReasonType.RISK_BASED)).toBe('リスクベース');
  });
});

describe('getSelectionStatusLabel', () => {
  it('should return correct label for each selection status', () => {
    expect(getSelectionStatusLabel(SelectionStatus.RECOMMENDED)).toBe('推奨');
    expect(getSelectionStatusLabel(SelectionStatus.OPTIONAL)).toBe('オプション');
    expect(getSelectionStatusLabel(SelectionStatus.EXCLUDED)).toBe('除外');
    expect(getSelectionStatusLabel(SelectionStatus.MANUALLY_SELECTED)).toBe('手動選択');
  });
});

describe('getSelectionStatusColor', () => {
  it('should return correct color for each selection status', () => {
    expect(getSelectionStatusColor(SelectionStatus.RECOMMENDED)).toBe('green');
    expect(getSelectionStatusColor(SelectionStatus.OPTIONAL)).toBe('blue');
    expect(getSelectionStatusColor(SelectionStatus.EXCLUDED)).toBe('gray');
    expect(getSelectionStatusColor(SelectionStatus.MANUALLY_SELECTED)).toBe('purple');
  });
});

// ====================================
// Factory Functions Tests
// ====================================

describe('createEmptyChangeItem', () => {
  it('should create an empty change item with default values', () => {
    const item = createEmptyChangeItem();

    expect(item.type).toBe(ChangeType.CODE);
    expect(item.name).toBe('');
    expect(item.severity).toBe(ChangeSeverity.MEDIUM);
    expect(item.affectedModules).toEqual([]);
    expect(item.affectedFeatures).toEqual([]);
  });
});

describe('createEmptyChangeSet', () => {
  it('should create an empty change set with default values', () => {
    const changeSet = createEmptyChangeSet();

    expect(changeSet.name).toBe('');
    expect(changeSet.changes).toEqual([]);
    expect(changeSet.scope).toBe(ImpactScope.SINGLE_FEATURE);
  });
});

// ====================================
// Calculation Functions Tests
// ====================================

describe('calculatePriorityScore', () => {
  it('should return 0 for empty reasons', () => {
    const score = calculatePriorityScore([]);
    expect(score).toBe(0);
  });

  it('should calculate score based on reasons and weights', () => {
    const reasons: SelectionReason[] = [
      {
        type: SelectionReasonType.DIRECT_IMPACT,
        description: 'Direct impact',
        confidence: 0.9,
      },
    ];

    const score = calculatePriorityScore(reasons);
    // 0.9 * 1.0 = 0.9, 0.9/1 * 100 = 90
    expect(score).toBe(90);
  });

  it('should handle multiple reasons', () => {
    const reasons: SelectionReason[] = [
      {
        type: SelectionReasonType.DIRECT_IMPACT,
        description: 'Direct impact',
        confidence: 0.8,
      },
      {
        type: SelectionReasonType.INDIRECT_IMPACT,
        description: 'Indirect impact',
        confidence: 0.5,
      },
    ];

    const score = calculatePriorityScore(reasons);
    // (0.8 * 1.0 + 0.5 * 0.6) / 2 * 100 = (0.8 + 0.3) / 2 * 100 = 55
    expect(score).toBe(55);
  });

  it('should cap score at 100', () => {
    const reasons: SelectionReason[] = [
      {
        type: SelectionReasonType.DIRECT_IMPACT,
        description: 'Direct impact',
        confidence: 1.5, // Unrealistic but tests cap
      },
    ];

    const score = calculatePriorityScore(reasons);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should use custom weights', () => {
    const reasons: SelectionReason[] = [
      {
        type: SelectionReasonType.DIRECT_IMPACT,
        description: 'Direct impact',
        confidence: 1.0,
      },
    ];

    const customWeights = {
      [SelectionReasonType.DIRECT_IMPACT]: 0.5,
    };

    const score = calculatePriorityScore(reasons, customWeights);
    expect(score).toBe(50);
  });
});

describe('calculateSelectionSummary', () => {
  it('should return empty summary for empty selections', () => {
    const summary = calculateSelectionSummary([]);

    expect(summary.totalTestCases).toBe(0);
    expect(summary.recommendedCount).toBe(0);
    expect(summary.optionalCount).toBe(0);
    expect(summary.excludedCount).toBe(0);
    expect(summary.manuallySelectedCount).toBe(0);
    expect(summary.estimatedTotalDuration).toBe(0);
    expect(summary.riskScore).toBe(0);
  });

  it('should correctly count by status', () => {
    const selections: TestCaseSelection[] = [
      {
        testCaseId: '1',
        testCaseName: 'Test 1',
        status: SelectionStatus.RECOMMENDED,
        priorityScore: 80,
        reasons: [],
      },
      {
        testCaseId: '2',
        testCaseName: 'Test 2',
        status: SelectionStatus.RECOMMENDED,
        priorityScore: 75,
        reasons: [],
      },
      {
        testCaseId: '3',
        testCaseName: 'Test 3',
        status: SelectionStatus.OPTIONAL,
        priorityScore: 50,
        reasons: [],
      },
      {
        testCaseId: '4',
        testCaseName: 'Test 4',
        status: SelectionStatus.EXCLUDED,
        priorityScore: 20,
        reasons: [],
      },
      {
        testCaseId: '5',
        testCaseName: 'Test 5',
        status: SelectionStatus.MANUALLY_SELECTED,
        priorityScore: 60,
        reasons: [],
      },
    ];

    const summary = calculateSelectionSummary(selections);

    expect(summary.totalTestCases).toBe(5);
    expect(summary.recommendedCount).toBe(2);
    expect(summary.optionalCount).toBe(1);
    expect(summary.excludedCount).toBe(1);
    expect(summary.manuallySelectedCount).toBe(1);
  });

  it('should sum estimated durations', () => {
    const selections: TestCaseSelection[] = [
      {
        testCaseId: '1',
        testCaseName: 'Test 1',
        status: SelectionStatus.RECOMMENDED,
        priorityScore: 80,
        reasons: [],
        estimatedDuration: 30,
      },
      {
        testCaseId: '2',
        testCaseName: 'Test 2',
        status: SelectionStatus.RECOMMENDED,
        priorityScore: 75,
        reasons: [],
        estimatedDuration: 45,
      },
    ];

    const summary = calculateSelectionSummary(selections);
    expect(summary.estimatedTotalDuration).toBe(75);
  });

  it('should count by reason type', () => {
    const selections: TestCaseSelection[] = [
      {
        testCaseId: '1',
        testCaseName: 'Test 1',
        status: SelectionStatus.RECOMMENDED,
        priorityScore: 80,
        reasons: [
          { type: SelectionReasonType.DIRECT_IMPACT, description: '', confidence: 0.9 },
          { type: SelectionReasonType.REGRESSION_RISK, description: '', confidence: 0.7 },
        ],
      },
      {
        testCaseId: '2',
        testCaseName: 'Test 2',
        status: SelectionStatus.RECOMMENDED,
        priorityScore: 75,
        reasons: [{ type: SelectionReasonType.DIRECT_IMPACT, description: '', confidence: 0.8 }],
      },
    ];

    const summary = calculateSelectionSummary(selections);
    expect(summary.coverageByReason[SelectionReasonType.DIRECT_IMPACT]).toBe(2);
    expect(summary.coverageByReason[SelectionReasonType.REGRESSION_RISK]).toBe(1);
  });

  it('should calculate risk score from historical failure rate', () => {
    const selections: TestCaseSelection[] = [
      {
        testCaseId: '1',
        testCaseName: 'Test 1',
        status: SelectionStatus.RECOMMENDED,
        priorityScore: 80,
        reasons: [],
        historicalFailureRate: 30,
      },
      {
        testCaseId: '2',
        testCaseName: 'Test 2',
        status: SelectionStatus.RECOMMENDED,
        priorityScore: 75,
        reasons: [],
        historicalFailureRate: 50,
      },
    ];

    const summary = calculateSelectionSummary(selections);
    expect(summary.riskScore).toBe(40); // (30 + 50) / 2 = 40
  });
});

// ====================================
// Validation Functions Tests
// ====================================

describe('validateChangeItem', () => {
  it('should validate a valid change item', () => {
    const item = {
      type: ChangeType.CODE,
      name: 'Test Change',
      severity: ChangeSeverity.MEDIUM,
      affectedModules: ['module1'],
      affectedFeatures: ['feature1'],
    };

    const result = validateChangeItem(item);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail if name is empty', () => {
    const item = {
      type: ChangeType.CODE,
      name: '',
      severity: ChangeSeverity.MEDIUM,
      affectedModules: [],
      affectedFeatures: [],
    };

    const result = validateChangeItem(item);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('変更名は必須です');
  });

  it('should fail if name is whitespace only', () => {
    const item = {
      type: ChangeType.CODE,
      name: '   ',
      severity: ChangeSeverity.MEDIUM,
      affectedModules: [],
      affectedFeatures: [],
    };

    const result = validateChangeItem(item);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('変更名は必須です');
  });

  it('should fail if type is invalid', () => {
    const item = {
      type: 'INVALID' as ChangeType,
      name: 'Test',
      severity: ChangeSeverity.MEDIUM,
      affectedModules: [],
      affectedFeatures: [],
    };

    const result = validateChangeItem(item);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('無効な変更タイプです');
  });

  it('should fail if severity is invalid', () => {
    const item = {
      type: ChangeType.CODE,
      name: 'Test',
      severity: 'INVALID' as ChangeSeverity,
      affectedModules: [],
      affectedFeatures: [],
    };

    const result = validateChangeItem(item);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('無効な深刻度です');
  });
});

describe('validateChangeSet', () => {
  it('should validate a valid change set', () => {
    const changeSet = {
      name: 'Test Change Set',
      changes: [
        {
          type: ChangeType.CODE,
          name: 'Change 1',
          severity: ChangeSeverity.MEDIUM,
          affectedModules: [],
          affectedFeatures: [],
        },
      ],
      scope: ImpactScope.SINGLE_FEATURE,
    };

    const result = validateChangeSet(changeSet);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail if name is empty', () => {
    const changeSet = {
      name: '',
      changes: [
        {
          type: ChangeType.CODE,
          name: 'Change 1',
          severity: ChangeSeverity.MEDIUM,
          affectedModules: [],
          affectedFeatures: [],
        },
      ],
      scope: ImpactScope.SINGLE_FEATURE,
    };

    const result = validateChangeSet(changeSet);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('変更セット名は必須です');
  });

  it('should fail if no changes', () => {
    const changeSet = {
      name: 'Test',
      changes: [],
      scope: ImpactScope.SINGLE_FEATURE,
    };

    const result = validateChangeSet(changeSet);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('少なくとも1つの変更項目が必要です');
  });

  it('should fail if scope is invalid', () => {
    const changeSet = {
      name: 'Test',
      changes: [
        {
          type: ChangeType.CODE,
          name: 'Change 1',
          severity: ChangeSeverity.MEDIUM,
          affectedModules: [],
          affectedFeatures: [],
        },
      ],
      scope: 'INVALID' as ImpactScope,
    };

    const result = validateChangeSet(changeSet);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('無効な影響スコープです');
  });

  it('should include change item validation errors', () => {
    const changeSet = {
      name: 'Test',
      changes: [
        {
          type: ChangeType.CODE,
          name: '',
          severity: ChangeSeverity.MEDIUM,
          affectedModules: [],
          affectedFeatures: [],
        },
      ],
      scope: ImpactScope.SINGLE_FEATURE,
    };

    const result = validateChangeSet(changeSet);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('変更項目1: 変更名は必須です');
  });
});

// ====================================
// Utility Functions Tests
// ====================================

describe('formatDuration', () => {
  it('should format minutes under 60', () => {
    expect(formatDuration(30)).toBe('30分');
    expect(formatDuration(59)).toBe('59分');
  });

  it('should format full hours', () => {
    expect(formatDuration(60)).toBe('1時間');
    expect(formatDuration(120)).toBe('2時間');
  });

  it('should format hours and minutes', () => {
    expect(formatDuration(90)).toBe('1時間30分');
    expect(formatDuration(150)).toBe('2時間30分');
  });
});

describe('getImpactLevelValue', () => {
  it('should return correct numeric values', () => {
    expect(getImpactLevelValue('HIGH')).toBe(3);
    expect(getImpactLevelValue('MEDIUM')).toBe(2);
    expect(getImpactLevelValue('LOW')).toBe(1);
  });

  it('should return 0 for unknown level', () => {
    expect(getImpactLevelValue('UNKNOWN' as 'HIGH')).toBe(0);
  });
});

describe('getSeverityValue', () => {
  it('should return correct numeric values', () => {
    expect(getSeverityValue(ChangeSeverity.CRITICAL)).toBe(4);
    expect(getSeverityValue(ChangeSeverity.HIGH)).toBe(3);
    expect(getSeverityValue(ChangeSeverity.MEDIUM)).toBe(2);
    expect(getSeverityValue(ChangeSeverity.LOW)).toBe(1);
  });
});
