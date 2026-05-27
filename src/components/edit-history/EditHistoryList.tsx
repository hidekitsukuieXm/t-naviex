'use client';

/**
 * EditHistoryList Component
 *
 * テストケースの編集履歴一覧を表示するコンポーネント
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  EditHistory,
  getOperationTypeLabel,
  getOperationTypeColor,
  getRelativeTime,
  formatEditDate,
} from '@/types/edit-history';

interface EditHistoryListProps {
  testCaseId: string;
  onSelectHistory?: (history: EditHistory) => void;
  onCompare?: (sourceId: string, targetId: string) => void;
}

export function EditHistoryList({ testCaseId, onSelectHistory, onCompare }: EditHistoryListProps) {
  const [histories, setHistories] = useState<EditHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHistories, setSelectedHistories] = useState<string[]>([]);
  const retryRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/test-cases/${testCaseId}/edit-history`);

        if (cancelled) return;

        if (!response.ok) {
          throw new Error('編集履歴の取得に失敗しました');
        }

        const data = await response.json();
        if (!cancelled) {
          setHistories(data.histories || []);
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
  }, [testCaseId]);

  const handleRetry = () => {
    retryRef.current();
  };

  const handleHistorySelect = (historyId: string) => {
    setSelectedHistories((prev) => {
      if (prev.includes(historyId)) {
        return prev.filter((id) => id !== historyId);
      }
      if (prev.length >= 2) {
        return [prev[1], historyId];
      }
      return [...prev, historyId];
    });
  };

  const handleCompare = () => {
    if (selectedHistories.length === 2 && onCompare) {
      onCompare(selectedHistories[0], selectedHistories[1]);
    }
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

  if (histories.length === 0) {
    return <div className="p-8 text-center text-gray-500">編集履歴がありません</div>;
  }

  return (
    <div className="space-y-4">
      {/* 比較ボタン */}
      {selectedHistories.length === 2 && (
        <div className="flex justify-end">
          <Button onClick={handleCompare} variant="default" size="sm">
            選択した履歴を比較
          </Button>
        </div>
      )}

      {/* 履歴一覧 */}
      <div className="space-y-2">
        {histories.map((history, index) => {
          const isSelected = selectedHistories.includes(history.id);
          const isFirst = index === 0;

          return (
            <div
              key={history.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleHistorySelect(history.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleHistorySelect(history.id)}
                    className="h-4 w-4 mt-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${getOperationTypeColor(
                          history.operation
                        )}`}
                      >
                        {getOperationTypeLabel(history.operation)}
                      </span>
                      {isFirst && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                          最新
                        </span>
                      )}
                    </div>
                    <div className="text-sm mt-1">{history.summary}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {history.editedByName && <span className="mr-2">{history.editedByName}</span>}
                      <span title={formatEditDate(history.editedAt)}>
                        {getRelativeTime(history.editedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {onSelectHistory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectHistory(history);
                    }}
                  >
                    詳細
                  </Button>
                )}
              </div>

              {/* フィールド変更のサマリー */}
              {history.fieldChanges.length > 0 && (
                <div className="mt-2 pl-7 flex flex-wrap gap-1">
                  {history.fieldChanges.slice(0, 5).map((change, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                      {change.fieldLabel}
                    </span>
                  ))}
                  {history.fieldChanges.length > 5 && (
                    <span className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                      +{history.fieldChanges.length - 5}件
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
