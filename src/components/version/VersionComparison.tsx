'use client';

/**
 * VersionComparison Component
 *
 * バージョン間の差分を表示するコンポーネント
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  VersionComparison as VersionComparisonType,
  SectionChange,
  TestCaseChange,
  ChangeType,
  getChangeTypeLabel,
  getChangeTypeColor,
  getFieldLabel,
} from '@/types/version-management';

interface VersionComparisonProps {
  testSpecId: string;
  sourceVersionId: string;
  targetVersionId: string;
  onClose?: () => void;
}

export function VersionComparison({
  testSpecId,
  sourceVersionId,
  targetVersionId,
  onClose,
}: VersionComparisonProps) {
  const [comparison, setComparison] = useState<VersionComparisonType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChangeType | 'ALL'>('ALL');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const retryRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/test-specs/${testSpecId}/versions/compare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceVersionId, targetVersionId }),
        });

        if (cancelled) return;

        if (!response.ok) {
          throw new Error('バージョン比較に失敗しました');
        }

        const data = await response.json();
        if (!cancelled) {
          setComparison(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'エラーが発生しました');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    retryRef.current = fetchData;
    fetchData();

    return () => {
      cancelled = true;
    };
  }, [testSpecId, sourceVersionId, targetVersionId]);

  const handleRetry = () => {
    retryRef.current();
  };

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filterChanges = <T extends { changeType: ChangeType }>(changes: T[]): T[] => {
    if (filter === 'ALL') return changes;
    return changes.filter((c) => c.changeType === filter);
  };

  const renderChangeIcon = (changeType: ChangeType) => {
    switch (changeType) {
      case ChangeType.ADDED:
        return <span className="text-green-600 font-bold">+</span>;
      case ChangeType.REMOVED:
        return <span className="text-red-600 font-bold">-</span>;
      case ChangeType.MODIFIED:
        return <span className="text-yellow-600 font-bold">~</span>;
      default:
        return <span className="text-gray-400">=</span>;
    }
  };

  const renderSectionChange = (change: SectionChange) => {
    const isExpanded = expandedItems.has(`section-${change.sectionId}`);

    return (
      <div
        key={change.sectionId}
        className={`border rounded-lg ${getChangeTypeColor(change.changeType)} bg-opacity-20`}
      >
        <div
          className="flex items-center gap-2 p-3 cursor-pointer hover:bg-opacity-30"
          onClick={() => toggleItem(`section-${change.sectionId}`)}
        >
          {renderChangeIcon(change.changeType)}
          <span className="font-medium">{change.sectionName}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${getChangeTypeColor(change.changeType)}`}>
            {getChangeTypeLabel(change.changeType)}
          </span>
          {change.changes && change.changes.length > 0 && (
            <span className="text-xs text-gray-500 ml-auto">
              {isExpanded ? '▼' : '▶'} {change.changes.length}件の変更
            </span>
          )}
        </div>
        {isExpanded && change.changes && change.changes.length > 0 && (
          <div className="px-4 pb-3 space-y-1">
            {change.changes.map((c, i) => (
              <div key={i} className="text-sm text-gray-600 pl-4 border-l-2 border-gray-200">
                {c}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTestCaseChange = (change: TestCaseChange) => {
    const isExpanded = expandedItems.has(`tc-${change.testCaseId}`);

    return (
      <div
        key={change.testCaseId}
        className={`border rounded-lg ${getChangeTypeColor(change.changeType)} bg-opacity-20`}
      >
        <div
          className="flex items-center gap-2 p-3 cursor-pointer hover:bg-opacity-30"
          onClick={() => toggleItem(`tc-${change.testCaseId}`)}
        >
          {renderChangeIcon(change.changeType)}
          <span className="font-medium">{change.testCaseTitle}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${getChangeTypeColor(change.changeType)}`}>
            {getChangeTypeLabel(change.changeType)}
          </span>
          {change.fieldChanges && change.fieldChanges.length > 0 && (
            <span className="text-xs text-gray-500 ml-auto">
              {isExpanded ? '▼' : '▶'} {change.fieldChanges.length}件の変更
            </span>
          )}
        </div>
        {isExpanded && change.fieldChanges && change.fieldChanges.length > 0 && (
          <div className="px-4 pb-3 space-y-2">
            {change.fieldChanges.map((fc, i) => (
              <div key={i} className="text-sm pl-4 border-l-2 border-gray-200">
                <div className="font-medium text-gray-700">{getFieldLabel(fc.fieldName)}</div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="text-red-600 bg-red-50 p-2 rounded text-xs">
                    <span className="text-gray-500">変更前: </span>
                    {renderValue(fc.previousValue)}
                  </div>
                  <div className="text-green-600 bg-green-50 p-2 rounded text-xs">
                    <span className="text-gray-500">変更後: </span>
                    {renderValue(fc.currentValue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderValue = (value: unknown): string => {
    if (value === undefined || value === null) return '(なし)';
    if (Array.isArray(value)) {
      if (value.length === 0) return '(なし)';
      if (typeof value[0] === 'object') {
        return `${value.length}件`;
      }
      return value.join(', ');
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        <p>{error}</p>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={handleRetry}>
            再試行
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              閉じる
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!comparison) {
    return null;
  }

  const filteredSectionChanges = filterChanges(comparison.sectionChanges);
  const filteredTestCaseChanges = filterChanges(comparison.testCaseChanges);

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">バージョン比較</h3>
          <p className="text-sm text-gray-500">
            {comparison.sourceVersion} → {comparison.targetVersion}
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            閉じる
          </Button>
        )}
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <h4 className="font-medium text-sm mb-2">セクション</h4>
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
              +{comparison.summary.sectionsAdded}
            </span>
            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
              -{comparison.summary.sectionsRemoved}
            </span>
            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
              ~{comparison.summary.sectionsModified}
            </span>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
              ={comparison.summary.sectionsUnchanged}
            </span>
          </div>
        </div>
        <div>
          <h4 className="font-medium text-sm mb-2">テストケース</h4>
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
              +{comparison.summary.testCasesAdded}
            </span>
            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
              -{comparison.summary.testCasesRemoved}
            </span>
            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
              ~{comparison.summary.testCasesModified}
            </span>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
              ={comparison.summary.testCasesUnchanged}
            </span>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">フィルター:</span>
        {(
          [
            'ALL',
            ChangeType.ADDED,
            ChangeType.REMOVED,
            ChangeType.MODIFIED,
            ChangeType.UNCHANGED,
          ] as const
        ).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'すべて' : getChangeTypeLabel(f)}
          </Button>
        ))}
      </div>

      {/* セクション変更 */}
      {filteredSectionChanges.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">セクション変更 ({filteredSectionChanges.length}件)</h4>
          <div className="space-y-2">{filteredSectionChanges.map(renderSectionChange)}</div>
        </div>
      )}

      {/* テストケース変更 */}
      {filteredTestCaseChanges.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">
            テストケース変更 ({filteredTestCaseChanges.length}件)
          </h4>
          <div className="space-y-2">{filteredTestCaseChanges.map(renderTestCaseChange)}</div>
        </div>
      )}

      {/* 変更なし */}
      {filteredSectionChanges.length === 0 && filteredTestCaseChanges.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          {filter === 'ALL'
            ? '変更はありません'
            : `「${getChangeTypeLabel(filter as ChangeType)}」の項目はありません`}
        </div>
      )}
    </div>
  );
}

export default VersionComparison;
