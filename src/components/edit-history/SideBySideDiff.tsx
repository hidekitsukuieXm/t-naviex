'use client';

/**
 * SideBySideDiff Component
 *
 * サイドバイサイドの差分表示コンポーネント
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  ComparisonResult,
  DiffType,
  getDiffTypeColor,
  getDiffTypeLabel,
} from '@/types/edit-history';

interface SideBySideDiffProps {
  testCaseId: string;
  sourceId: string;
  targetId: string;
  type?: 'version' | 'history';
  onClose?: () => void;
}

export function SideBySideDiff({
  testCaseId,
  sourceId,
  targetId,
  type = 'version',
  onClose,
}: SideBySideDiffProps) {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const retryRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          type,
          sourceId,
          targetId,
        });
        const response = await fetch(
          `/api/test-cases/${testCaseId}/edit-history/compare?${params}`
        );

        if (cancelled) return;

        if (!response.ok) {
          throw new Error('比較の取得に失敗しました');
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
  }, [testCaseId, sourceId, targetId, type]);

  const handleRetry = () => {
    retryRef.current();
  };

  const toggleField = (fieldName: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={handleRetry} className="mt-2">
          再試行
        </Button>
      </div>
    );
  }

  if (!comparison) {
    return <div className="p-8 text-center text-gray-500">比較結果が見つかりません</div>;
  }

  const { summary } = comparison;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">差分比較</h3>
          <p className="text-sm text-gray-500">
            {type === 'version' ? 'バージョン間の差分' : '編集履歴間の差分'}
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            閉じる
          </Button>
        )}
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-green-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{summary.addedFields}</div>
          <div className="text-sm text-gray-500">追加</div>
        </div>
        <div className="p-3 bg-red-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">{summary.removedFields}</div>
          <div className="text-sm text-gray-500">削除</div>
        </div>
        <div className="p-3 bg-yellow-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600">{summary.modifiedFields}</div>
          <div className="text-sm text-gray-500">変更</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-600">{summary.totalChanges}</div>
          <div className="text-sm text-gray-500">合計</div>
        </div>
      </div>

      {/* 差分一覧 */}
      {comparison.diffs.length > 0 ? (
        <div className="space-y-4">
          {comparison.diffs.map((diff, index) => {
            const isExpanded = expandedFields.has(diff.fieldName);
            const hasLineDiff = diff.previousLines || diff.currentLines;
            const diffType = !diff.previousValue
              ? DiffType.ADDED
              : !diff.currentValue
                ? DiffType.REMOVED
                : DiffType.MODIFIED;

            return (
              <div key={index} className="border rounded-lg overflow-hidden">
                {/* フィールドヘッダー */}
                <div
                  className={`p-3 flex items-center justify-between cursor-pointer ${
                    hasLineDiff ? 'hover:bg-gray-50' : ''
                  }`}
                  onClick={() => hasLineDiff && toggleField(diff.fieldName)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{diff.fieldLabel}</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${getDiffTypeColor(diffType)}`}>
                      {getDiffTypeLabel(diffType)}
                    </span>
                  </div>
                  {hasLineDiff && (
                    <span className="text-sm text-gray-500">{isExpanded ? '▼' : '▶'}</span>
                  )}
                </div>

                {/* サイドバイサイド差分 */}
                <div className="border-t">
                  {hasLineDiff && isExpanded ? (
                    // 行単位の差分表示
                    <div className="grid grid-cols-2 divide-x">
                      <div className="p-2">
                        <div className="text-xs text-gray-500 mb-1">変更前</div>
                        <div className="space-y-0.5 font-mono text-sm">
                          {diff.previousLines?.map((line, idx) => (
                            <div
                              key={idx}
                              className={`px-2 py-0.5 ${getLineBgColor(line.type, 'previous')}`}
                            >
                              <span className="text-gray-400 mr-2 select-none">
                                {line.lineNumber}
                              </span>
                              {line.content || ' '}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="text-xs text-gray-500 mb-1">変更後</div>
                        <div className="space-y-0.5 font-mono text-sm">
                          {diff.currentLines?.map((line, idx) => (
                            <div
                              key={idx}
                              className={`px-2 py-0.5 ${getLineBgColor(line.type, 'current')}`}
                            >
                              <span className="text-gray-400 mr-2 select-none">
                                {line.lineNumber}
                              </span>
                              {line.content || ' '}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // 単純な値の差分表示
                    <div className="grid grid-cols-2 divide-x">
                      <div className="p-3">
                        <div className="text-xs text-gray-500 mb-1">変更前</div>
                        <div
                          className={`p-2 rounded text-sm whitespace-pre-wrap ${
                            diffType === DiffType.REMOVED || diffType === DiffType.MODIFIED
                              ? 'bg-red-50'
                              : 'bg-gray-50'
                          }`}
                        >
                          {diff.previousValue || '(なし)'}
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="text-xs text-gray-500 mb-1">変更後</div>
                        <div
                          className={`p-2 rounded text-sm whitespace-pre-wrap ${
                            diffType === DiffType.ADDED || diffType === DiffType.MODIFIED
                              ? 'bg-green-50'
                              : 'bg-gray-50'
                          }`}
                        >
                          {diff.currentValue || '(なし)'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">変更はありません</div>
      )}
    </div>
  );
}

function getLineBgColor(type: DiffType, side: 'previous' | 'current'): string {
  switch (type) {
    case DiffType.ADDED:
      return side === 'current' ? 'bg-green-100' : '';
    case DiffType.REMOVED:
      return side === 'previous' ? 'bg-red-100' : '';
    case DiffType.MODIFIED:
      return side === 'previous' ? 'bg-red-50' : 'bg-green-50';
    default:
      return '';
  }
}
