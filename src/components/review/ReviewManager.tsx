/**
 * Review Manager Component
 *
 * レビュー管理のメインコンポーネント
 */

'use client';

import React, { useState } from 'react';
import { ReviewList } from './ReviewList';
import { ReviewDetail } from './ReviewDetail';
import { ReviewComments } from './ReviewComments';
import { ReviewForm } from './ReviewForm';
import type { TestCaseReview } from '@/types/review';

type ViewMode = 'list' | 'detail' | 'create';

interface ReviewManagerProps {
  testCaseId: string;
  initialMode?: ViewMode;
}

export function ReviewManager({
  testCaseId,
  initialMode = 'list',
}: ReviewManagerProps): React.ReactElement {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [selectedReview, setSelectedReview] = useState<TestCaseReview | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectReview = (review: TestCaseReview) => {
    setSelectedReview(review);
    setMode('detail');
  };

  const handleCreateReview = () => {
    setMode('create');
  };

  const handleBackToList = () => {
    setSelectedReview(null);
    setMode('list');
    setRefreshKey((k) => k + 1);
  };

  const handleReviewCreated = () => {
    handleBackToList();
  };

  const handleReviewUpdated = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      {mode === 'list' && (
        <ReviewList
          key={refreshKey}
          testCaseId={testCaseId}
          onSelectReview={handleSelectReview}
          onCreateReview={handleCreateReview}
        />
      )}

      {mode === 'detail' && selectedReview && (
        <div className="space-y-6">
          <ReviewDetail
            reviewId={selectedReview.id}
            onBack={handleBackToList}
            onApprove={handleReviewUpdated}
            onReject={handleReviewUpdated}
          />
          <ReviewComments reviewId={selectedReview.id} />
        </div>
      )}

      {mode === 'create' && (
        <ReviewForm
          testCaseId={testCaseId}
          onSubmit={handleReviewCreated}
          onCancel={handleBackToList}
        />
      )}
    </div>
  );
}
