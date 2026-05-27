'use client';

/**
 * VersionList Component
 *
 * バージョン履歴一覧を表示するコンポーネント
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { TestSpecVersion, getChangeTypeColor } from '@/types/version-management';

interface VersionListProps {
  testSpecId: string;
  currentVersion?: string;
  onSelectVersion?: (version: TestSpecVersion) => void;
  onCompare?: (sourceId: string, targetId: string) => void;
  onRestore?: (version: TestSpecVersion) => void;
}

export function VersionList({
  testSpecId,
  currentVersion,
  onSelectVersion,
  onCompare,
  onRestore,
}: VersionListProps) {
  const [versions, setVersions] = useState<TestSpecVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const retryRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/test-specs/${testSpecId}/versions`);

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
  }, [testSpecId]);

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={handleRetry} className="mt-2">
          再試行
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">バージョン履歴</h3>
        <div className="flex items-center gap-2">
          {selectedVersions.length === 2 && (
            <Button variant="outline" size="sm" onClick={handleCompare}>
              選択したバージョンを比較
            </Button>
          )}
          {selectedVersions.length > 0 && (
            <span className="text-sm text-gray-500">{selectedVersions.length}件選択中</span>
          )}
        </div>
      </div>

      {/* 現在のバージョン表示 */}
      {currentVersion && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">現在のバージョン:</span>
              <span className={`ml-2 font-medium ${getChangeTypeColor('UNCHANGED')}`}>
                {currentVersion}
              </span>
            </div>
            {onCompare && versions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCompare('current', versions[0].id)}
              >
                最新バージョンと比較
              </Button>
            )}
          </div>
        </div>
      )}

      {/* バージョン一覧 */}
      {versions.length === 0 ? (
        <div className="text-center p-8 text-gray-500">バージョン履歴がありません</div>
      ) : (
        <div className="space-y-2">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className={`p-4 border rounded-lg transition-colors ${
                selectedVersions.includes(version.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedVersions.includes(version.id)}
                    onChange={() => handleVersionSelect(version.id)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">v{version.version}</span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                          最新
                        </span>
                      )}
                    </div>
                    {version.changeNote && (
                      <p className="text-sm text-gray-600 mt-1">{version.changeNote}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{formatDate(version.createdAt)}</span>
                      {version.sectionCount !== undefined && (
                        <span>{version.sectionCount}セクション</span>
                      )}
                      {version.testCaseCount !== undefined && (
                        <span>{version.testCaseCount}テストケース</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onSelectVersion && (
                    <Button variant="ghost" size="sm" onClick={() => onSelectVersion(version)}>
                      詳細
                    </Button>
                  )}
                  {onRestore && version.sectionCount !== undefined && (
                    <Button variant="outline" size="sm" onClick={() => onRestore(version)}>
                      復元
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VersionList;
