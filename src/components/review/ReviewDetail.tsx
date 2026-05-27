/**
 * Review Detail Component
 *
 * レビュー詳細表示コンポーネント
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { TestCaseReview, ReviewHistory } from '@/types/review';
import {
  ReviewStatus,
  getReviewStatusLabel,
  getReviewStatusColor,
  getReviewPriorityLabel,
  getReviewPriorityColor,
  getReviewActionLabel,
  getReviewActionColor,
  isOverdue,
  getDaysUntilDue,
  formatReviewDate,
  getRelativeTime,
} from '@/types/review';

interface ReviewDetailProps {
  reviewId: string;
  onBack?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export function ReviewDetail({
  reviewId,
  onBack,
  onApprove,
  onReject,
}: ReviewDetailProps): React.ReactElement {
  const [review, setReview] = useState<TestCaseReview | null>(null);
  const [history, setHistory] = useState<ReviewHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const hasFetchedRef = useRef(false);

  const fetchReview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [reviewRes, historyRes] = await Promise.all([
        fetch(`/api/reviews/${reviewId}`),
        fetch(`/api/reviews/${reviewId}/history`),
      ]);

      if (!reviewRes.ok) {
        throw new Error('Failed to fetch review');
      }

      const reviewData = await reviewRes.json();
      setReview(reviewData.review);

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.histories || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'レビューの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchReview();
  }, [fetchReview]);

  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!review) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });

      if (!response.ok) {
        throw new Error('Failed to process decision');
      }

      const data = await response.json();
      setReview(data.review);

      if (decision === 'approve') {
        onApprove?.();
      } else {
        onReject?.();
      }

      // 履歴を再取得
      const historyRes = await fetch(`/api/reviews/${reviewId}/history`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.histories || []);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '処理に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleReopen = async () => {
    if (!review) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' }),
      });

      if (!response.ok) {
        throw new Error('Failed to reopen review');
      }

      const data = await response.json();
      setReview(data.review);

      // 履歴を再取得
      const historyRes = await fetch(`/api/reviews/${reviewId}/history`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.histories || []);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '処理に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!review) return;

    if (!confirm('このレビューをキャンセルしますか？')) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel review');
      }

      const data = await response.json();
      setReview(data.review);

      // 履歴を再取得
      const historyRes = await fetch(`/api/reviews/${reviewId}/history`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.histories || []);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '処理に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error || 'レビューが見つかりません'}</p>
        {onBack && (
          <button onClick={onBack} className="mt-2 text-sm text-red-600 hover:underline">
            戻る
          </button>
        )}
      </div>
    );
  }

  const canDecide =
    review.status === ReviewStatus.PENDING || review.status === ReviewStatus.IN_REVIEW;
  const canReopen =
    review.status === ReviewStatus.APPROVED || review.status === ReviewStatus.REJECTED;
  const canCancel =
    review.status === ReviewStatus.PENDING || review.status === ReviewStatus.IN_REVIEW;
  const daysUntilDue = getDaysUntilDue(review.dueDate);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        {onBack && (
          <button onClick={onBack} className="text-gray-600 hover:text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            戻る
          </button>
        )}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getReviewStatusColor(review.status)}`}
          >
            {getReviewStatusLabel(review.status)}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getReviewPriorityColor(review.priority)}`}
          >
            {getReviewPriorityLabel(review.priority)}
          </span>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="bg-white border rounded-lg p-6">
        <h1 className="text-xl font-bold text-gray-900">{review.title}</h1>
        {review.testCaseTitle && (
          <p className="mt-1 text-sm text-gray-500">テストケース: {review.testCaseTitle}</p>
        )}
        {review.description && (
          <p className="mt-4 text-gray-600 whitespace-pre-wrap">{review.description}</p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">作成日時:</span>
            <span className="ml-2 text-gray-900">{formatReviewDate(review.createdAt)}</span>
          </div>
          {review.dueDate && (
            <div>
              <span className="text-gray-500">期限:</span>
              <span
                className={`ml-2 ${isOverdue(review.dueDate) ? 'text-red-600 font-medium' : 'text-gray-900'}`}
              >
                {formatReviewDate(review.dueDate)}
                {daysUntilDue !== null && (
                  <span className="ml-2">
                    {daysUntilDue < 0
                      ? `(${Math.abs(daysUntilDue)}日超過)`
                      : daysUntilDue === 0
                        ? '(本日)'
                        : `(残り${daysUntilDue}日)`}
                  </span>
                )}
              </span>
            </div>
          )}
          {review.reviewedAt && (
            <div>
              <span className="text-gray-500">レビュー日時:</span>
              <span className="ml-2 text-gray-900">{formatReviewDate(review.reviewedAt)}</span>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="mt-6 flex flex-wrap gap-2">
          {canDecide && (
            <>
              <button
                onClick={() => handleDecision('approve')}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {processing ? '処理中...' : '承認'}
              </button>
              <button
                onClick={() => handleDecision('reject')}
                disabled={processing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing ? '処理中...' : '却下'}
              </button>
            </>
          )}
          {canReopen && (
            <button
              onClick={handleReopen}
              disabled={processing}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {processing ? '処理中...' : '再オープン'}
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={processing}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {processing ? '処理中...' : 'キャンセル'}
            </button>
          )}
        </div>
      </div>

      {/* 履歴 */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">履歴</h2>
        {history.length === 0 ? (
          <p className="text-gray-500">履歴がありません</p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                <div
                  className={`w-2 h-2 mt-2 rounded-full ${getReviewActionColor(item.action).replace('text-', 'bg-')}`}
                />
                <div className="flex-1">
                  <p className={`font-medium ${getReviewActionColor(item.action)}`}>
                    {getReviewActionLabel(item.action)}
                  </p>
                  <p className="text-sm text-gray-500">{getRelativeTime(item.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
