'use client';

/**
 * TestCaseVersionRestore Component
 *
 * テストケースバージョン復元のダイアログコンポーネント
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TestCaseVersion } from '@/types/test-case-version';

interface TestCaseVersionRestoreProps {
  testCaseId: string;
  version: TestCaseVersion;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TestCaseVersionRestore({
  testCaseId,
  version,
  onSuccess,
  onCancel,
}: TestCaseVersionRestoreProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createNewVersion, setCreateNewVersion] = useState(true);
  const [changeNote, setChangeNote] = useState(`バージョン ${version.version} から復元`);

  const handleRestore = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/test-cases/${testCaseId}/versions/${version.id}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          createNewVersion,
          changeNote: createNewVersion ? changeNote : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '復元に失敗しました');
      }

      onSuccess?.();
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">バージョン復元</h3>
        <p className="text-sm text-gray-500 mt-1">
          バージョン {version.version} ({formatDate(version.createdAt)}) に復元しますか?
        </p>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="text-sm text-yellow-800">
            <p className="font-medium">注意</p>
            <p className="mt-1">
              復元を実行すると、現在のテストケースの内容がバージョン {version.version}{' '}
              の内容に置き換わります。 テストステップ、タグなどの情報も復元されます。
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={createNewVersion}
            onChange={(e) => setCreateNewVersion(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm">復元後に新しいバージョンを作成する</span>
        </label>

        {createNewVersion && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">変更メモ</label>
            <input
              type="text"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="変更内容を入力..."
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          キャンセル
        </Button>
        <Button onClick={handleRestore} disabled={loading}>
          {loading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              復元中...
            </>
          ) : (
            '復元を実行'
          )}
        </Button>
      </div>
    </div>
  );
}
