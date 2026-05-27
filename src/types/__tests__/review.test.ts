/**
 * Review Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ReviewStatus,
  ReviewPriority,
  ReviewAction,
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
  calculateReviewStats,
  filterReviews,
  TestCaseReview,
  ReviewFilter,
} from '../review';

describe('review types', () => {
  // ====================================
  // Enum Tests
  // ====================================

  describe('ReviewStatus', () => {
    it('should have all expected values', () => {
      expect(ReviewStatus.PENDING).toBe('PENDING');
      expect(ReviewStatus.IN_REVIEW).toBe('IN_REVIEW');
      expect(ReviewStatus.APPROVED).toBe('APPROVED');
      expect(ReviewStatus.REJECTED).toBe('REJECTED');
      expect(ReviewStatus.CANCELLED).toBe('CANCELLED');
    });
  });

  describe('ReviewPriority', () => {
    it('should have all expected values', () => {
      expect(ReviewPriority.LOW).toBe('LOW');
      expect(ReviewPriority.MEDIUM).toBe('MEDIUM');
      expect(ReviewPriority.HIGH).toBe('HIGH');
      expect(ReviewPriority.URGENT).toBe('URGENT');
    });
  });

  describe('ReviewAction', () => {
    it('should have all expected values', () => {
      expect(ReviewAction.CREATED).toBe('CREATED');
      expect(ReviewAction.ASSIGNED).toBe('ASSIGNED');
      expect(ReviewAction.COMMENTED).toBe('COMMENTED');
      expect(ReviewAction.APPROVED).toBe('APPROVED');
      expect(ReviewAction.REJECTED).toBe('REJECTED');
      expect(ReviewAction.REOPENED).toBe('REOPENED');
      expect(ReviewAction.CANCELLED).toBe('CANCELLED');
      expect(ReviewAction.RESOLVED).toBe('RESOLVED');
    });
  });

  // ====================================
  // getReviewStatusLabel Tests
  // ====================================

  describe('getReviewStatusLabel', () => {
    it('should return correct labels', () => {
      expect(getReviewStatusLabel(ReviewStatus.PENDING)).toBe('未レビュー');
      expect(getReviewStatusLabel(ReviewStatus.IN_REVIEW)).toBe('レビュー中');
      expect(getReviewStatusLabel(ReviewStatus.APPROVED)).toBe('承認');
      expect(getReviewStatusLabel(ReviewStatus.REJECTED)).toBe('却下');
      expect(getReviewStatusLabel(ReviewStatus.CANCELLED)).toBe('キャンセル');
    });

    it('should return status itself for unknown status', () => {
      expect(getReviewStatusLabel('UNKNOWN' as ReviewStatus)).toBe('UNKNOWN');
    });
  });

  // ====================================
  // getReviewStatusColor Tests
  // ====================================

  describe('getReviewStatusColor', () => {
    it('should return correct colors', () => {
      expect(getReviewStatusColor(ReviewStatus.PENDING)).toContain('gray');
      expect(getReviewStatusColor(ReviewStatus.IN_REVIEW)).toContain('blue');
      expect(getReviewStatusColor(ReviewStatus.APPROVED)).toContain('green');
      expect(getReviewStatusColor(ReviewStatus.REJECTED)).toContain('red');
      expect(getReviewStatusColor(ReviewStatus.CANCELLED)).toContain('gray');
    });

    it('should return empty string for unknown status', () => {
      expect(getReviewStatusColor('UNKNOWN' as ReviewStatus)).toBe('');
    });
  });

  // ====================================
  // getReviewPriorityLabel Tests
  // ====================================

  describe('getReviewPriorityLabel', () => {
    it('should return correct labels', () => {
      expect(getReviewPriorityLabel(ReviewPriority.LOW)).toBe('低');
      expect(getReviewPriorityLabel(ReviewPriority.MEDIUM)).toBe('中');
      expect(getReviewPriorityLabel(ReviewPriority.HIGH)).toBe('高');
      expect(getReviewPriorityLabel(ReviewPriority.URGENT)).toBe('緊急');
    });

    it('should return priority itself for unknown priority', () => {
      expect(getReviewPriorityLabel('UNKNOWN' as ReviewPriority)).toBe('UNKNOWN');
    });
  });

  // ====================================
  // getReviewPriorityColor Tests
  // ====================================

  describe('getReviewPriorityColor', () => {
    it('should return correct colors', () => {
      expect(getReviewPriorityColor(ReviewPriority.LOW)).toContain('gray');
      expect(getReviewPriorityColor(ReviewPriority.MEDIUM)).toContain('blue');
      expect(getReviewPriorityColor(ReviewPriority.HIGH)).toContain('orange');
      expect(getReviewPriorityColor(ReviewPriority.URGENT)).toContain('red');
    });

    it('should return empty string for unknown priority', () => {
      expect(getReviewPriorityColor('UNKNOWN' as ReviewPriority)).toBe('');
    });
  });

  // ====================================
  // getReviewActionLabel Tests
  // ====================================

  describe('getReviewActionLabel', () => {
    it('should return correct labels', () => {
      expect(getReviewActionLabel(ReviewAction.CREATED)).toBe('レビュー作成');
      expect(getReviewActionLabel(ReviewAction.ASSIGNED)).toBe('レビュアー割当');
      expect(getReviewActionLabel(ReviewAction.COMMENTED)).toBe('コメント追加');
      expect(getReviewActionLabel(ReviewAction.APPROVED)).toBe('承認');
      expect(getReviewActionLabel(ReviewAction.REJECTED)).toBe('却下');
      expect(getReviewActionLabel(ReviewAction.REOPENED)).toBe('再オープン');
      expect(getReviewActionLabel(ReviewAction.CANCELLED)).toBe('キャンセル');
      expect(getReviewActionLabel(ReviewAction.RESOLVED)).toBe('コメント解決');
    });

    it('should return action itself for unknown action', () => {
      expect(getReviewActionLabel('UNKNOWN' as ReviewAction)).toBe('UNKNOWN');
    });
  });

  // ====================================
  // getReviewActionColor Tests
  // ====================================

  describe('getReviewActionColor', () => {
    it('should return correct colors', () => {
      expect(getReviewActionColor(ReviewAction.CREATED)).toContain('blue');
      expect(getReviewActionColor(ReviewAction.APPROVED)).toContain('green');
      expect(getReviewActionColor(ReviewAction.REJECTED)).toContain('red');
    });

    it('should return empty string for unknown action', () => {
      expect(getReviewActionColor('UNKNOWN' as ReviewAction)).toBe('');
    });
  });

  // ====================================
  // isOverdue Tests
  // ====================================

  describe('isOverdue', () => {
    it('should return false for undefined dueDate', () => {
      expect(isOverdue(undefined)).toBe(false);
    });

    it('should return true for past date', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(isOverdue(pastDate)).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(isOverdue(futureDate)).toBe(false);
    });
  });

  // ====================================
  // getDaysUntilDue Tests
  // ====================================

  describe('getDaysUntilDue', () => {
    it('should return null for undefined dueDate', () => {
      expect(getDaysUntilDue(undefined)).toBeNull();
    });

    it('should return positive number for future date', () => {
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const days = getDaysUntilDue(futureDate);
      expect(days).toBeGreaterThan(0);
    });

    it('should return negative number for past date', () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const days = getDaysUntilDue(pastDate);
      expect(days).toBeLessThan(0);
    });
  });

  // ====================================
  // formatReviewDate Tests
  // ====================================

  describe('formatReviewDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2026-05-27T10:30:00');
      const formatted = formatReviewDate(date);
      expect(formatted).toContain('2026');
      expect(formatted).toContain('05');
      expect(formatted).toContain('27');
    });

    it('should handle string dates', () => {
      const formatted = formatReviewDate('2026-05-27T10:30:00');
      expect(formatted).toContain('2026');
    });
  });

  // ====================================
  // getRelativeTime Tests
  // ====================================

  describe('getRelativeTime', () => {
    it('should return "たった今" for recent times', () => {
      const now = new Date();
      expect(getRelativeTime(now)).toBe('たった今');
    });

    it('should return minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      expect(getRelativeTime(date)).toContain('分前');
    });

    it('should return hours ago', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(getRelativeTime(date)).toContain('時間前');
    });

    it('should return days ago', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(getRelativeTime(date)).toContain('日前');
    });
  });

  // ====================================
  // calculateReviewStats Tests
  // ====================================

  describe('calculateReviewStats', () => {
    const createReview = (overrides: Partial<TestCaseReview> = {}): TestCaseReview => ({
      id: '1',
      testCaseId: 'tc1',
      requesterId: 'user1',
      status: ReviewStatus.PENDING,
      priority: ReviewPriority.MEDIUM,
      title: 'Test Review',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    it('should calculate correct stats', () => {
      const reviews: TestCaseReview[] = [
        createReview({ status: ReviewStatus.PENDING }),
        createReview({ status: ReviewStatus.IN_REVIEW }),
        createReview({ status: ReviewStatus.APPROVED }),
        createReview({ status: ReviewStatus.REJECTED }),
        createReview({ status: ReviewStatus.APPROVED }),
      ];

      const stats = calculateReviewStats(reviews);

      expect(stats.total).toBe(5);
      expect(stats.pending).toBe(1);
      expect(stats.inReview).toBe(1);
      expect(stats.approved).toBe(2);
      expect(stats.rejected).toBe(1);
    });

    it('should count overdue reviews', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const reviews: TestCaseReview[] = [
        createReview({ status: ReviewStatus.PENDING, dueDate: pastDate }),
        createReview({ status: ReviewStatus.IN_REVIEW, dueDate: pastDate }),
        createReview({ status: ReviewStatus.APPROVED, dueDate: pastDate }), // Not overdue (approved)
      ];

      const stats = calculateReviewStats(reviews);
      expect(stats.overdue).toBe(2);
    });

    it('should calculate average review time', () => {
      const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const reviewedAt = new Date();
      const reviews: TestCaseReview[] = [
        createReview({ status: ReviewStatus.APPROVED, createdAt, reviewedAt }),
      ];

      const stats = calculateReviewStats(reviews);
      expect(stats.avgReviewTime).toBeGreaterThan(0);
    });

    it('should handle empty reviews', () => {
      const stats = calculateReviewStats([]);
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.avgReviewTime).toBeUndefined();
    });
  });

  // ====================================
  // filterReviews Tests
  // ====================================

  describe('filterReviews', () => {
    const createReview = (overrides: Partial<TestCaseReview> = {}): TestCaseReview => ({
      id: '1',
      testCaseId: 'tc1',
      requesterId: 'user1',
      status: ReviewStatus.PENDING,
      priority: ReviewPriority.MEDIUM,
      title: 'Test Review',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    it('should filter by status', () => {
      const reviews: TestCaseReview[] = [
        createReview({ id: '1', status: ReviewStatus.PENDING }),
        createReview({ id: '2', status: ReviewStatus.APPROVED }),
        createReview({ id: '3', status: ReviewStatus.PENDING }),
      ];

      const filter: ReviewFilter = { status: [ReviewStatus.PENDING] };
      const filtered = filterReviews(reviews, filter);

      expect(filtered).toHaveLength(2);
      expect(filtered.every((r) => r.status === ReviewStatus.PENDING)).toBe(true);
    });

    it('should filter by priority', () => {
      const reviews: TestCaseReview[] = [
        createReview({ id: '1', priority: ReviewPriority.HIGH }),
        createReview({ id: '2', priority: ReviewPriority.LOW }),
        createReview({ id: '3', priority: ReviewPriority.URGENT }),
      ];

      const filter: ReviewFilter = { priority: [ReviewPriority.HIGH, ReviewPriority.URGENT] };
      const filtered = filterReviews(reviews, filter);

      expect(filtered).toHaveLength(2);
    });

    it('should filter by requesterId', () => {
      const reviews: TestCaseReview[] = [
        createReview({ id: '1', requesterId: 'user1' }),
        createReview({ id: '2', requesterId: 'user2' }),
        createReview({ id: '3', requesterId: 'user1' }),
      ];

      const filter: ReviewFilter = { requesterId: 'user1' };
      const filtered = filterReviews(reviews, filter);

      expect(filtered).toHaveLength(2);
    });

    it('should filter by reviewerId', () => {
      const reviews: TestCaseReview[] = [
        createReview({ id: '1', reviewerId: 'reviewer1' }),
        createReview({ id: '2', reviewerId: 'reviewer2' }),
        createReview({ id: '3', reviewerId: 'reviewer1' }),
      ];

      const filter: ReviewFilter = { reviewerId: 'reviewer1' };
      const filtered = filterReviews(reviews, filter);

      expect(filtered).toHaveLength(2);
    });

    it('should filter by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const reviews: TestCaseReview[] = [
        createReview({ id: '1', createdAt: now }),
        createReview({ id: '2', createdAt: yesterday }),
        createReview({ id: '3', createdAt: twoDaysAgo }),
      ];

      const filter: ReviewFilter = {
        fromDate: yesterday.toISOString(),
      };
      const filtered = filterReviews(reviews, filter);

      expect(filtered).toHaveLength(2);
    });

    it('should return all reviews when no filter', () => {
      const reviews: TestCaseReview[] = [createReview({ id: '1' }), createReview({ id: '2' })];

      const filtered = filterReviews(reviews, {});
      expect(filtered).toHaveLength(2);
    });
  });
});
