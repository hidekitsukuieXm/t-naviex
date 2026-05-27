/**
 * Review Comments Component
 *
 * レビューコメント表示・入力コンポーネント
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ReviewComment } from '@/types/review';
import { getRelativeTime } from '@/types/review';

interface ReviewCommentsProps {
  reviewId: string;
  readOnly?: boolean;
}

export function ReviewComments({
  reviewId,
  readOnly = false,
}: ReviewCommentsProps): React.ReactElement {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const hasFetchedRef = useRef(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reviews/${reviewId}/comments`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'コメントの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      setNewComment('');
      await fetchComments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'コメントの追加に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim(), parentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to add reply');
      }

      setReplyTo(null);
      setReplyContent('');
      await fetchComments();
    } catch (err) {
      alert(err instanceof Error ? err.message : '返信の追加に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (commentId: string, resolve: boolean) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          action: resolve ? 'resolve' : 'unresolve',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update comment');
      }

      await fetchComments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'コメントの更新に失敗しました');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('このコメントを削除しますか？')) return;

    try {
      const response = await fetch(`/api/reviews/${reviewId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      await fetchComments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'コメントの削除に失敗しました');
    }
  };

  const renderComment = (comment: ReviewComment, isReply = false) => (
    <div
      key={comment.id}
      className={`${isReply ? 'ml-8 mt-2' : 'border-b pb-4'} ${
        comment.isResolved ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {comment.authorName || `User ${comment.authorId}`}
            </span>
            <span className="text-sm text-gray-500">{getRelativeTime(comment.createdAt)}</span>
            {comment.isResolved && (
              <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-600">
                解決済み
              </span>
            )}
          </div>
          <p className="mt-1 text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          {comment.lineRef && <p className="mt-1 text-xs text-gray-500">参照: {comment.lineRef}</p>}

          {!readOnly && (
            <div className="mt-2 flex items-center gap-4 text-sm">
              {!isReply && (
                <button
                  onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                  className="text-blue-600 hover:underline"
                >
                  返信
                </button>
              )}
              <button
                onClick={() => handleResolve(comment.id, !comment.isResolved)}
                className="text-gray-600 hover:underline"
              >
                {comment.isResolved ? '未解決に戻す' : '解決済みにする'}
              </button>
              <button
                onClick={() => handleDelete(comment.id)}
                className="text-red-600 hover:underline"
              >
                削除
              </button>
            </div>
          )}

          {/* 返信入力 */}
          {replyTo === comment.id && (
            <div className="mt-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="返信を入力..."
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                rows={2}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleReply(comment.id)}
                  disabled={!replyContent.trim() || submitting}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '送信中...' : '返信'}
                </button>
                <button
                  onClick={() => {
                    setReplyTo(null);
                    setReplyContent('');
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* 返信一覧 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

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
        <button onClick={fetchComments} className="mt-2 text-sm text-red-600 hover:underline">
          再試行
        </button>
      </div>
    );
  }

  const unresolvedCount = comments.filter((c) => !c.isResolved).length;

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">コメント ({comments.length})</h2>
        {unresolvedCount > 0 && (
          <span className="text-sm text-orange-600">{unresolvedCount}件 未解決</span>
        )}
      </div>

      {/* コメント一覧 */}
      <div className="space-y-4 mb-6">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">コメントはありません</p>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>

      {/* 新規コメント入力 */}
      {!readOnly && (
        <form onSubmit={handleSubmit} className="border-t pt-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="コメントを入力..."
            className="w-full px-3 py-2 border rounded-lg resize-none"
            rows={3}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '送信中...' : 'コメントを追加'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
