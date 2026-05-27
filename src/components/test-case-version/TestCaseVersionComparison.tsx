'use client';

/**
 * TestCaseVersionComparison Component
 *
 * テストケースバージョン間の差分を表示するコンポーネント
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  TestCaseVersionComparison as ComparisonType,
  getStepChangeTypeLabel,
  getStepChangeTypeColor,
  StepChangeType,
} from '@/types/test-case-version';

interface TestCaseVersionComparisonProps {
  testCaseId: string;
  sourceVersionId: string;
  targetVersionId: string;
  onClose?: () => void;
}

export function TestCaseVersionComparison({
  testCaseId,
  sourceVersionId,
  targetVersionId,
  onClose,
}: TestCaseVersionComparisonProps) {
  const [comparison, setComparison] = useState<ComparisonType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          sourceVersionId,
          targetVersionId,
        });
        const response = await fetch(`/api/test-cases/${testCaseId}/versions/compare?${params}`);

        if (cancelled) return;

        if (!response.ok) {
          throw new Error('バージョン比較の取得に失敗しました');
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
  }, [testCaseId, sourceVersionId, targetVersionId]);

  const handleRetry = () => {
    retryRef.current();
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
          <h3 className="text-lg font-semibold">バージョン比較</h3>
          <p className="text-sm text-gray-500">
            v{comparison.targetVersion} → v{comparison.sourceVersion}
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            閉じる
          </Button>
        )}
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <div className="text-2xl font-bold">{summary.fieldsChanged}</div>
          <div className="text-sm text-gray-500">フィールド変更</div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{summary.stepsAdded}</div>
          <div className="text-sm text-gray-500">ステップ追加</div>
        </div>
        <div className="p-3 bg-red-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">{summary.stepsRemoved}</div>
          <div className="text-sm text-gray-500">ステップ削除</div>
        </div>
        <div className="p-3 bg-yellow-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600">{summary.stepsModified}</div>
          <div className="text-sm text-gray-500">ステップ変更</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-600">{summary.stepsUnchanged}</div>
          <div className="text-sm text-gray-500">変更なし</div>
        </div>
      </div>

      {/* フィールド変更 */}
      {comparison.fieldChanges.length > 0 && (
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3">フィールド変更</h4>
          <div className="space-y-3">
            {comparison.fieldChanges.map((change, index) => (
              <div key={index} className="p-3 bg-yellow-50 rounded">
                <div className="font-medium text-sm">{change.fieldLabel}</div>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">変更前:</span>
                    <div className="p-2 bg-red-50 rounded mt-1 line-through text-red-700">
                      {formatValue(change.previousValue)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">変更後:</span>
                    <div className="p-2 bg-green-50 rounded mt-1 text-green-700">
                      {formatValue(change.currentValue)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ステップ変更 */}
      {comparison.stepChanges.length > 0 && (
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3">テストステップ変更</h4>
          <div className="space-y-3">
            {comparison.stepChanges
              .filter((change) => change.changeType !== StepChangeType.UNCHANGED)
              .map((change, index) => (
                <div
                  key={index}
                  className={`p-3 rounded ${getStepChangeTypeColor(change.changeType)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">ステップ {change.stepNumber}</span>
                    <span className="text-sm px-2 py-0.5 rounded bg-white/50">
                      {getStepChangeTypeLabel(change.changeType)}
                    </span>
                  </div>

                  {change.changeType === StepChangeType.ADDED && change.currentStep && (
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-xs opacity-70">操作:</span>
                        <p>{change.currentStep.action}</p>
                      </div>
                      <div>
                        <span className="text-xs opacity-70">期待結果:</span>
                        <p>{change.currentStep.expectedResult}</p>
                      </div>
                    </div>
                  )}

                  {change.changeType === StepChangeType.REMOVED && change.previousStep && (
                    <div className="text-sm space-y-1 line-through opacity-70">
                      <div>
                        <span className="text-xs">操作:</span>
                        <p>{change.previousStep.action}</p>
                      </div>
                      <div>
                        <span className="text-xs">期待結果:</span>
                        <p>{change.previousStep.expectedResult}</p>
                      </div>
                    </div>
                  )}

                  {change.changeType === StepChangeType.MODIFIED && change.fieldChanges && (
                    <div className="text-sm space-y-2">
                      {change.fieldChanges.map((fieldChange, idx) => (
                        <div key={idx} className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-xs opacity-70">
                              {fieldChange.field === 'action' ? '操作' : '期待結果'} (前):
                            </span>
                            <p className="line-through opacity-70">{fieldChange.previous}</p>
                          </div>
                          <div>
                            <span className="text-xs opacity-70">
                              {fieldChange.field === 'action' ? '操作' : '期待結果'} (後):
                            </span>
                            <p>{fieldChange.current}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {!summary.hasChanges && <div className="p-8 text-center text-gray-500">変更はありません</div>}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '(なし)';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
}
