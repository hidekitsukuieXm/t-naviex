'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  type WatchlistEntityType,
  type WatchStatus,
  WATCHLIST_ENTITY_TYPE_LABELS,
} from '@/types/watchlist';

interface WatchButtonProps {
  entityType: WatchlistEntityType;
  entityId: string;
  entityName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showSettings?: boolean;
}

export function WatchButton({
  entityType,
  entityId,
  entityName,
  variant = 'outline',
  size = 'sm',
  showSettings = true,
}: WatchButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [watchStatus, setWatchStatus] = useState<WatchStatus>({
    isWatching: false,
    item: null,
  });
  const [isOpen, setIsOpen] = useState(false);

  // ウォッチ状態を取得
  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(
          `/api/watchlist/status?entityType=${entityType}&entityId=${entityId}`
        );
        if (response.ok) {
          const data = await response.json();
          setWatchStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch watch status:', error);
      }
    })();
  }, [entityType, entityId]);

  // ウォッチ/アンウォッチ切り替え
  const handleToggleWatch = useCallback(async () => {
    setIsLoading(true);
    try {
      if (watchStatus.isWatching && watchStatus.item) {
        // アンウォッチ
        const response = await fetch(`/api/watchlist/${watchStatus.item.id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setWatchStatus({ isWatching: false, item: null });
        }
      } else {
        // ウォッチ
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType,
            entityId,
            notifyEmail: true,
            notifyInApp: true,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setWatchStatus({ isWatching: true, item: data });
        }
      }
    } catch (error) {
      console.error('Failed to toggle watch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [watchStatus, entityType, entityId]);

  // 通知設定の更新
  const handleUpdateNotification = useCallback(
    async (key: 'notifyEmail' | 'notifyInApp', value: boolean) => {
      if (!watchStatus.item) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/watchlist/${watchStatus.item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: value }),
        });
        if (response.ok) {
          const data = await response.json();
          setWatchStatus({ isWatching: true, item: data });
        }
      } catch (error) {
        console.error('Failed to update notification settings:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [watchStatus.item]
  );

  const buttonContent = watchStatus.isWatching ? (
    <>
      <EyeIcon className="h-4 w-4 mr-1" />
      ウォッチ中
    </>
  ) : (
    <>
      <EyeOffIcon className="h-4 w-4 mr-1" />
      ウォッチ
    </>
  );

  // 設定不要の場合は単純なボタン
  if (!showSettings || !watchStatus.isWatching) {
    return (
      <Button
        variant={watchStatus.isWatching ? 'default' : variant}
        size={size}
        onClick={handleToggleWatch}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <SpinnerIcon className="h-4 w-4 mr-1 animate-spin" />
            処理中...
          </>
        ) : (
          buttonContent
        )}
      </Button>
    );
  }

  // ウォッチ中で設定可能な場合はポップオーバー付き
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="default" size={size} disabled={isLoading}>
          {isLoading ? (
            <>
              <SpinnerIcon className="h-4 w-4 mr-1 animate-spin" />
              処理中...
            </>
          ) : (
            buttonContent
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-1">ウォッチ設定</h4>
            <p className="text-sm text-muted-foreground">
              {WATCHLIST_ENTITY_TYPE_LABELS[entityType]}
              {entityName && `: ${entityName}`}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifyEmail" className="text-sm">
                メール通知
              </Label>
              <Switch
                id="notifyEmail"
                checked={watchStatus.item?.notifyEmail ?? true}
                onCheckedChange={(checked) => handleUpdateNotification('notifyEmail', checked)}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notifyInApp" className="text-sm">
                アプリ内通知
              </Label>
              <Switch
                id="notifyInApp"
                checked={watchStatus.item?.notifyInApp ?? true}
                onCheckedChange={(checked) => handleUpdateNotification('notifyInApp', checked)}
                disabled={isLoading}
              />
            </div>
          </div>

          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => {
              handleToggleWatch();
              setIsOpen(false);
            }}
            disabled={isLoading}
          >
            ウォッチ解除
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// アイコンコンポーネント
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
