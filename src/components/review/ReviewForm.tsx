/**
 * Review Form Component
 *
 * レビュー作成・編集フォームコンポーネント
 */

'use client';

import React, { useState } from 'react';
import type { CreateReviewRequest, TestCaseReview } from '@/types/review';
import { ReviewPriority, getReviewPriorityLabel } from '@/types/review';

interface ReviewFormProps {
  testCaseId: string;
  review?: TestCaseReview;
  onSubmit?: (review: TestCaseReview) => void;
  onCancel?: () => void;
}

export function ReviewForm({
  testCaseId,
  review,
  onSubmit,
  onCancel,
}: ReviewFormProps): React.ReactElement {
  const [title, setTitle] = useState(review?.title || '');
  const [description, setDescription] = useState(review?.description || '');
  const [priority, setPriority] = useState<ReviewPriority>(
    review?.priority || ReviewPriority.MEDIUM
  );
  const [dueDate, setDueDate] = useState(
    review?.dueDate ? new Date(review.dueDate).toISOString().split('T')[0] : ''
  );
  const [reviewerId, setReviewerId] = useState(review?.reviewerId || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!review;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('タイトルは必須です');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const url = isEdit ? `/api/reviews/${review.id}` : `/api/test-cases/${testCaseId}/reviews`;

      const method = isEdit ? 'PATCH' : 'POST';

      const data: CreateReviewRequest | Partial<CreateReviewRequest> = {
        testCaseId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        reviewerId: reviewerId || undefined,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save review');
      }

      const result = await response.json();
      onSubmit?.(result.review);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">
        {isEdit ? 'レビューを編集' : '新規レビュー作成'}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* タイトル */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="レビューのタイトルを入力"
          />
        </div>

        {/* 説明 */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            説明
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="レビューの詳細な説明を入力"
          />
        </div>

        {/* 優先度 */}
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
            優先度
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as ReviewPriority)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.values(ReviewPriority).map((p) => (
              <option key={p} value={p}>
                {getReviewPriorityLabel(p)}
              </option>
            ))}
          </select>
        </div>

        {/* 期限 */}
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
            期限
          </label>
          <input
            type="date"
            id="dueDate"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* レビュアー */}
        <div>
          <label htmlFor="reviewerId" className="block text-sm font-medium text-gray-700 mb-1">
            レビュアーID
          </label>
          <input
            type="text"
            id="reviewerId"
            value={reviewerId}
            onChange={(e) => setReviewerId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="レビュアーのIDを入力"
          />
          <p className="mt-1 text-xs text-gray-500">空白のままにすると、後から割り当てできます</p>
        </div>

        {/* ボタン */}
        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              キャンセル
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? '保存中...' : isEdit ? '更新' : '作成'}
          </button>
        </div>
      </form>
    </div>
  );
}
