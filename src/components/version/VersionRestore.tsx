'use client';

/**
 * VersionRestore Component
 *
 * バージョン復元ダイアログコンポーネント
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { TestSpecVersion, validateVersionString } from '@/types/version-management';

interface VersionRestoreProps {
  testSpecId: string;
  version: TestSpecVersion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored?: () => void;
}

export function VersionRestore({
  testSpecId,
  version,
  open,
  onOpenChange,
  onRestored,
}: VersionRestoreProps) {
  const [createNewVersion, setCreateNewVersion] = useState(true);
  const [newVersionNumber, setNewVersionNumber] = useState('');
  const [changeNote, setChangeNote] = useState(`バージョン ${version.version} から復元`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRestore = async () => {
    // バリデーション
    if (createNewVersion && newVersionNumber) {
      const validation = validateVersionString(newVersionNumber);
      if (!validation.valid) {
        setError(validation.message || 'バージョン番号が無効です');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/test-specs/${testSpecId}/versions/${version.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createNewVersion,
          newVersionNumber: createNewVersion ? newVersionNumber : undefined,
          changeNote,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '復元に失敗しました');
      }

      onOpenChange(false);
      onRestored?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>バージョンを復元</DialogTitle>
        <DialogDescription>
          選択したバージョンの状態にテスト仕様書を復元します。
          現在のセクションとテストケースは削除され、スナップショットの内容で置き換えられます。
        </DialogDescription>

        <div className="space-y-4 mt-4">
          {/* 復元元バージョン情報 */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm">
              <span className="text-gray-500">復元元バージョン: </span>
              <span className="font-medium">{version.version}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">{formatDate(version.createdAt)}</div>
            {version.sectionCount !== undefined && (
              <div className="text-xs text-gray-500 mt-1">
                {version.sectionCount}セクション、{version.testCaseCount}テストケース
              </div>
            )}
          </div>

          {/* 新しいバージョン作成オプション */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={createNewVersion}
                onChange={(e) => setCreateNewVersion(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <span className="text-sm">復元後に新しいバージョンを作成</span>
            </label>

            {createNewVersion && (
              <div className="pl-6 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    新しいバージョン番号
                  </label>
                  <input
                    type="text"
                    value={newVersionNumber}
                    onChange={(e) => setNewVersionNumber(e.target.value)}
                    placeholder="例: 1.0.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">変更メモ</label>
                  <textarea
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 警告 */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              <strong>注意:</strong> この操作は現在のテスト仕様書の内容を完全に置き換えます。
              この操作は取り消せません。
            </p>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <DialogClose render={<Button variant="outline" disabled={loading} />}>
            キャンセル
          </DialogClose>
          <Button
            onClick={handleRestore}
            disabled={loading || (createNewVersion && !newVersionNumber)}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? '復元中...' : '復元する'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default VersionRestore;
