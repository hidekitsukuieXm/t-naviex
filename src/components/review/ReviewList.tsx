/**
 * Review List Component
 *
 * テストケースレビュー一覧表示コンポーネント
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { TestCaseReview, ReviewFilter } from '@/types/review';
import {
  ReviewStatus,
  ReviewPriority,
  getReviewStatusLabel,
  getReviewStatusColor,
  getReviewPriorityLabel,
  getReviewPriorityColor,
  isOverdue,
  getRelativeTime,
} from '@/types/review';

interface ReviewListProps {
  testCaseId?: string;
  onSelectReview?: (review: TestCaseReview) => void;
  onCreateReview?: () => void;
}

export function ReviewList({
  testCaseId,
  onSelectReview,
  onCreateReview,
}: ReviewListProps): React.ReactElement {
  const [reviews, setReviews] = useState<TestCaseReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>({});

  const hasFetchedRef = useRef(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = testCaseId ? `/api/test-cases/${testCaseId}/reviews` : '/api/reviews';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'レビューの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [testCaseId]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchReviews();
  }, [fetchReviews]);

  const filteredReviews = reviews.filter((review) => {
    if (filter.status && filter.status.length > 0) {
      if (!filter.status.includes(review.status)) return false;
    }
    if (filter.priority && filter.priority.length > 0) {
      if (!filter.priority.includes(review.priority)) return false;
    }
    return true;
  });

  const handleStatusFilter = (status: ReviewStatus | null) => {
    setFilter((prev) => ({
      ...prev,
      status: status ? [status] : undefined,
    }));
  };

  const handlePriorityFilter = (priority: ReviewPriority | null) => {
    setFilter((prev) => ({
      ...prev,
      priority: priority ? [priority] : undefined,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button onClick={fetchReviews} className="mt-2 text-sm text-red-600 hover:underline">
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">レビュー一覧</h2>
        {onCreateReview && (
          <button
            onClick={onCreateReview}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            レビューを作成
          </button>
        )}
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filter.status?.[0] || ''}
          onChange={(e) =>
            handleStatusFilter(e.target.value ? (e.target.value as ReviewStatus) : null)
          }
          className="px-3 py-1.5 border rounded-lg text-sm"
        >
          <option value="">すべてのステータス</option>
          {Object.values(ReviewStatus).map((status) => (
            <option key={status} value={status}>
              {getReviewStatusLabel(status)}
            </option>
          ))}
        </select>

        <select
          value={filter.priority?.[0] || ''}
          onChange={(e) =>
            handlePriorityFilter(e.target.value ? (e.target.value as ReviewPriority) : null)
          }
          className="px-3 py-1.5 border rounded-lg text-sm"
        >
          <option value="">すべての優先度</option>
          {Object.values(ReviewPriority).map((priority) => (
            <option key={priority} value={priority}>
              {getReviewPriorityLabel(priority)}
            </option>
          ))}
        </select>
      </div>

      {/* レビュー一覧 */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">レビューがありません</div>
      ) : (
        <div className="space-y-2">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              onClick={() => onSelectReview?.(review)}
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getReviewStatusColor(review.status)}`}
                    >
                      {getReviewStatusLabel(review.status)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getReviewPriorityColor(review.priority)}`}
                    >
                      {getReviewPriorityLabel(review.priority)}
                    </span>
                    {review.dueDate && isOverdue(review.dueDate) && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium text-red-600 bg-red-100">
                        期限切れ
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 font-medium text-gray-900">{review.title}</h3>
                  {review.testCaseTitle && (
                    <p className="text-sm text-gray-500">テストケース: {review.testCaseTitle}</p>
                  )}
                  {review.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{review.description}</p>
                  )}
                </div>
                <div className="ml-4 text-right text-sm text-gray-500">
                  <p>{getRelativeTime(review.createdAt)}</p>
                  {review.commentCount !== undefined && (
                    <p className="mt-1">
                      <span className="inline-flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        {review.commentCount}
                      </span>
                      {review.unresolvedCount !== undefined && review.unresolvedCount > 0 && (
                        <span className="ml-2 text-orange-500">
                          ({review.unresolvedCount} 未解決)
                        </span>
                      )}
                    </p>
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
