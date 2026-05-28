'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  type TestRunAuditReview,
  type AuditModeSettings,
  type ReviewAuditData,
  AUDIT_REVIEW_STATUS_LABELS,
  DEFAULT_AUDIT_MODE_SETTINGS,
} from '@/types/audit-review';

interface AuditModeToggleProps {
  testRunId: string;
  reviews: TestRunAuditReview[];
  settings?: AuditModeSettings;
  onSettingsChange?: (settings: AuditModeSettings) => void;
  onRefresh: () => void;
  canReview?: boolean; // レビュー権限があるか
}

const TEST_RESULT_STATUSES = [
  { value: 'PASSED', label: '成功' },
  { value: 'FAILED', label: '失敗' },
  { value: 'BLOCKED', label: 'ブロック' },
  { value: 'SKIPPED', label: 'スキップ' },
];

export function AuditModeToggle({
  testRunId,
  reviews,
  settings = DEFAULT_AUDIT_MODE_SETTINGS,
  onSettingsChange,
  onRefresh,
  canReview = false,
}: AuditModeToggleProps) {
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<TestRunAuditReview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestComment, setRequestComment] = useState('');
  const [reviewData, setReviewData] = useState<ReviewAuditData>({
    status: 'APPROVED',
    reviewComment: '',
  });

  const pendingReview = reviews.find((r) => r.status === 'PENDING');

  const handleSettingsChange = useCallback(
    (key: keyof AuditModeSettings, value: unknown) => {
      if (onSettingsChange) {
        onSettingsChange({
          ...settings,
          [key]: value,
        });
      }
    },
    [onSettingsChange, settings]
  );

  const handleStatusToggle = useCallback(
    (status: string, checked: boolean) => {
      const currentStatuses = settings.requireReviewForStatus ?? [];
      const newStatuses = checked
        ? [...currentStatuses, status]
        : currentStatuses.filter((s) => s !== status);
      handleSettingsChange('requireReviewForStatus', newStatuses);
    },
    [handleSettingsChange, settings.requireReviewForStatus]
  );

  const handleRequestReview = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/test-runs/${testRunId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: requestComment || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'レビュー依頼に失敗しました。');
      }

      setIsRequestDialogOpen(false);
      setRequestComment('');
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'レビュー依頼に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  }, [onRefresh, requestComment, testRunId]);

  const handleOpenReview = useCallback((review: TestRunAuditReview) => {
    setSelectedReview(review);
    setReviewData({ status: 'APPROVED', reviewComment: '' });
    setError(null);
    setIsReviewDialogOpen(true);
  }, []);

  const handleSubmitReview = useCallback(async () => {
    if (!selectedReview) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/test-runs/${testRunId}/audit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          status: reviewData.status,
          reviewComment: reviewData.reviewComment || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'レビュー処理に失敗しました。');
      }

      setIsReviewDialogOpen(false);
      setSelectedReview(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'レビュー処理に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  }, [onRefresh, reviewData, selectedReview, testRunId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">{AUDIT_REVIEW_STATUS_LABELS.PENDING}</Badge>;
      case 'APPROVED':
        return (
          <Badge variant="default" className="bg-green-500">
            {AUDIT_REVIEW_STATUS_LABELS.APPROVED}
          </Badge>
        );
      case 'REJECTED':
        return <Badge variant="destructive">{AUDIT_REVIEW_STATUS_LABELS.REJECTED}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>監査（再鑑）モード</CardTitle>
            <CardDescription>テスト結果の承認ワークフローを設定します。</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="auditEnabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => handleSettingsChange('enabled', checked)}
              disabled={!onSettingsChange}
            />
            <Label htmlFor="auditEnabled">{settings.enabled ? '有効' : '無効'}</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 監査モード設定 */}
        {settings.enabled && onSettingsChange && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium">監査設定</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">レビュー必須のテスト結果</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {TEST_RESULT_STATUSES.map((status) => (
                    <div key={status.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={settings.requireReviewForStatus?.includes(status.value)}
                        onCheckedChange={(checked) =>
                          handleStatusToggle(status.value, checked === true)
                        }
                      />
                      <Label htmlFor={`status-${status.value}`} className="text-sm">
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="notifyOnRequest"
                  checked={settings.notifyOnRequest}
                  onCheckedChange={(checked) => handleSettingsChange('notifyOnRequest', checked)}
                />
                <Label htmlFor="notifyOnRequest" className="text-sm">
                  レビュー依頼時に通知
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="notifyOnReview"
                  checked={settings.notifyOnReview}
                  onCheckedChange={(checked) => handleSettingsChange('notifyOnReview', checked)}
                />
                <Label htmlFor="notifyOnReview" className="text-sm">
                  レビュー完了時に通知
                </Label>
              </div>
            </div>
          </div>
        )}

        {/* 現在のレビュー状態 */}
        {settings.enabled && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">レビュー履歴</h4>
              {!pendingReview && (
                <Button variant="outline" size="sm" onClick={() => setIsRequestDialogOpen(true)}>
                  レビュー依頼
                </Button>
              )}
            </div>

            {reviews.length === 0 ? (
              <p className="text-muted-foreground text-sm">レビュー履歴がありません。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>依頼日時</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>コメント</TableHead>
                    <TableHead>レビュー日時</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>{new Date(review.createdAt).toLocaleString('ja-JP')}</TableCell>
                      <TableCell>{getStatusBadge(review.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">{review.comment || '-'}</TableCell>
                      <TableCell>
                        {review.reviewedAt
                          ? new Date(review.reviewedAt).toLocaleString('ja-JP')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {review.status === 'PENDING' && canReview && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReview(review)}
                          >
                            レビュー
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* レビュー依頼ダイアログ */}
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>監査レビュー依頼</DialogTitle>
              <DialogDescription>このテストランの監査レビューを依頼します。</DialogDescription>
            </DialogHeader>

            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md">{error}</div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="requestComment">コメント（任意）</Label>
                <Textarea
                  id="requestComment"
                  value={requestComment}
                  onChange={(e) => setRequestComment(e.target.value)}
                  placeholder="レビュー依頼のコメントを入力..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleRequestReview} disabled={isSubmitting}>
                {isSubmitting ? '送信中...' : 'レビュー依頼'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* レビュー処理ダイアログ */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>監査レビュー</DialogTitle>
              <DialogDescription>このテストランを承認または却下します。</DialogDescription>
            </DialogHeader>

            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md">{error}</div>
            )}

            {selectedReview && (
              <div className="space-y-4">
                {selectedReview.comment && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">依頼コメント:</p>
                    <p className="text-sm">{selectedReview.comment}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>レビュー結果</Label>
                  <div className="flex gap-4">
                    <Button
                      variant={reviewData.status === 'APPROVED' ? 'default' : 'outline'}
                      onClick={() => setReviewData({ ...reviewData, status: 'APPROVED' })}
                      className={reviewData.status === 'APPROVED' ? 'bg-green-500' : ''}
                    >
                      承認
                    </Button>
                    <Button
                      variant={reviewData.status === 'REJECTED' ? 'destructive' : 'outline'}
                      onClick={() => setReviewData({ ...reviewData, status: 'REJECTED' })}
                    >
                      却下
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reviewComment">レビューコメント（任意）</Label>
                  <Textarea
                    id="reviewComment"
                    value={reviewData.reviewComment ?? ''}
                    onChange={(e) =>
                      setReviewData({ ...reviewData, reviewComment: e.target.value })
                    }
                    placeholder="レビューコメントを入力..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSubmitReview} disabled={isSubmitting}>
                {isSubmitting ? '処理中...' : '送信'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
