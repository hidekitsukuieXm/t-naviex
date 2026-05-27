'use client';

/**
 * TestCaseVersionList Component
 *
 * テストケースのバージョン履歴一覧を表示するコンポーネント
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { TestCaseVersion } from '@/types/test-case-version';

interface TestCaseVersionListProps {
  testCaseId: string;
  currentVersion?: number;
  onSelectVersion?: (version: TestCaseVersion) => void;
  onCompare?: (sourceId: string, targetId: string) => void;
  onRestore?: (version: TestCaseVersion) => void;
}

export function TestCaseVersionList({
  testCaseId,
  currentVersion,
  onSelectVersion,
  onCompare,
  onRestore,
}: TestCaseVersionListProps) {
  const [versions, setVersions] = useState<TestCaseVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const retryRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/test-cases/${testCaseId}/versions`);

        if (cancelled) return;

        if (!response.ok) {
          throw new Error('バージョン一覧の取得に失敗しました');
        }

        const data = await response.json();
        if (!cancelled) {
          setVersions(data.versions || []);
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

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2 && onCompare) {
      onCompare(selectedVersions[0], selectedVersions[1]);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
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

  if (versions.length === 0) {
    return <div className="p-8 text-center text-gray-500">バージョン履歴がありません</div>;
  }

  return (
    <div className="space-y-4">
      {/* 比較ボタン */}
      {selectedVersions.length === 2 && (
        <div className="flex justify-end">
          <Button onClick={handleCompare} variant="default" size="sm">
            選択したバージョンを比較
          </Button>
        </div>
      )}

      {/* バージョン一覧 */}
      <div className="space-y-2">
        {versions.map((version) => {
          const isSelected = selectedVersions.includes(version.id);
          const isCurrent = currentVersion === version.version;

          return (
            <div
              key={version.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleVersionSelect(version.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleVersionSelect(version.id)}
                    className="h-4 w-4"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">v{version.version}</span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                          現在
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{formatDate(version.createdAt)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onSelectVersion && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectVersion(version);
                      }}
                    >
                      詳細
                    </Button>
                  )}
                  {onRestore && !isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore(version);
                      }}
                    >
                      復元
                    </Button>
                  )}
                </div>
              </div>

              {version.changeNote && (
                <div className="mt-2 text-sm text-gray-600 pl-7">{version.changeNote}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
