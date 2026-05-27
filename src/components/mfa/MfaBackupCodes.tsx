/**
 * MFA Backup Codes Component
 *
 * MFAバックアップコード表示コンポーネント
 */

'use client';

import React from 'react';

interface MfaBackupCodesProps {
  codes: string[];
  showCodes?: boolean;
  onToggleShow?: () => void;
}

export function MfaBackupCodes({
  codes,
  showCodes = false,
  onToggleShow,
}: MfaBackupCodesProps): React.ReactElement {
  const handleCopy = async () => {
    const text = codes.join('\n');
    await navigator.clipboard.writeText(text);
  };

  const handleDownload = () => {
    const text = `T-NaviEX MFA バックアップコード\n生成日時: ${new Date().toLocaleString('ja-JP')}\n\n${codes.join('\n')}\n\n注意: 各コードは1回のみ使用できます。`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mfa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>MFA バックアップコード</title>
            <style>
              body { font-family: monospace; padding: 20px; }
              h1 { font-size: 18px; }
              .codes { margin-top: 20px; }
              .code { padding: 8px; margin: 4px 0; background: #f5f5f5; }
            </style>
          </head>
          <body>
            <h1>T-NaviEX MFA バックアップコード</h1>
            <p>生成日時: ${new Date().toLocaleString('ja-JP')}</p>
            <div class="codes">
              ${codes.map((code) => `<div class="code">${code}</div>`).join('')}
            </div>
            <p style="margin-top: 20px;">注意: 各コードは1回のみ使用できます。</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="bg-gray-50 border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">バックアップコード</h4>
        {onToggleShow && (
          <button onClick={onToggleShow} className="text-sm text-blue-600 hover:text-blue-800">
            {showCodes ? '非表示' : '表示'}
          </button>
        )}
      </div>

      {showCodes ? (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {codes.map((code, index) => (
              <div
                key={index}
                className="px-3 py-2 bg-white border rounded font-mono text-sm text-center"
              >
                {code}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 px-3 py-2 text-sm border rounded hover:bg-gray-100 flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              コピー
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 px-3 py-2 text-sm border rounded hover:bg-gray-100 flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              ダウンロード
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 px-3 py-2 text-sm border rounded hover:bg-gray-100 flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              印刷
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-4 text-gray-500 text-sm">
          コードを表示するには「表示」をクリックしてください
        </div>
      )}
    </div>
  );
}
