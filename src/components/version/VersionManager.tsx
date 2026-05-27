'use client';

/**
 * VersionManager Component
 *
 * バージョン管理の統合コンポーネント
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { VersionList } from './VersionList';
import { VersionDetail } from './VersionDetail';
import { VersionComparison } from './VersionComparison';
import { VersionRestore } from './VersionRestore';
import { TestSpecVersion } from '@/types/version-management';

type ViewMode = 'list' | 'detail' | 'comparison';

interface VersionManagerProps {
  testSpecId: string;
  currentVersion?: string;
  onVersionCreated?: () => void;
}

export function VersionManager({
  testSpecId,
  currentVersion,
  onVersionCreated,
}: VersionManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedVersion, setSelectedVersion] = useState<TestSpecVersion | null>(null);
  const [comparisonVersions, setComparisonVersions] = useState<{
    source: string;
    target: string;
  } | null>(null);
  const [restoreVersion, setRestoreVersion] = useState<TestSpecVersion | null>(null);
  const [key, setKey] = useState(0);

  const handleSelectVersion = useCallback((version: TestSpecVersion) => {
    setSelectedVersion(version);
    setViewMode('detail');
  }, []);

  const handleCompare = useCallback((sourceId: string, targetId: string) => {
    setComparisonVersions({ source: sourceId, target: targetId });
    setViewMode('comparison');
  }, []);

  const handleRestore = useCallback((version: TestSpecVersion) => {
    setRestoreVersion(version);
  }, []);

  const handleRestored = useCallback(() => {
    setRestoreVersion(null);
    setKey((prev) => prev + 1);
    onVersionCreated?.();
  }, [onVersionCreated]);

  const handleBack = useCallback(() => {
    setViewMode('list');
    setSelectedVersion(null);
    setComparisonVersions(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* ナビゲーション */}
      {viewMode !== 'list' && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            ← バージョン一覧に戻る
          </Button>
        </div>
      )}

      {/* メインコンテンツ */}
      {viewMode === 'list' && (
        <VersionList
          key={key}
          testSpecId={testSpecId}
          currentVersion={currentVersion}
          onSelectVersion={handleSelectVersion}
          onCompare={handleCompare}
          onRestore={handleRestore}
        />
      )}

      {viewMode === 'detail' && selectedVersion && (
        <VersionDetail
          testSpecId={testSpecId}
          versionId={selectedVersion.id}
          onClose={handleBack}
          onRestore={handleRestore}
        />
      )}

      {viewMode === 'comparison' && comparisonVersions && (
        <VersionComparison
          testSpecId={testSpecId}
          sourceVersionId={comparisonVersions.source}
          targetVersionId={comparisonVersions.target}
          onClose={handleBack}
        />
      )}

      {/* 復元ダイアログ */}
      {restoreVersion && (
        <VersionRestore
          testSpecId={testSpecId}
          version={restoreVersion}
          open={!!restoreVersion}
          onOpenChange={(open) => !open && setRestoreVersion(null)}
          onRestored={handleRestored}
        />
      )}
    </div>
  );
}

export default VersionManager;
