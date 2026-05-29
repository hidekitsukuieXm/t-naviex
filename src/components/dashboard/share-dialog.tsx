'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, ExternalLink, Globe, GlobeLock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DashboardSafe } from '@/types/dashboard';

interface ShareDialogProps {
  dashboard: DashboardSafe;
  onShare: () => Promise<void>;
  onRevoke: () => Promise<void>;
}

export function ShareDialog({ dashboard, onShare, onRevoke }: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const shareUrl = dashboard.shareToken
    ? `${window.location.origin}/shared/dashboard/${dashboard.shareToken}`
    : null;

  const handleShare = async () => {
    setIsLoading(true);
    try {
      await onShare();
      toast({
        title: '成功',
        description: '共有URLを生成しました',
      });
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '共有URLの生成に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async () => {
    setIsLoading(true);
    try {
      await onRevoke();
      toast({
        title: '成功',
        description: '共有を解除しました',
      });
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '共有の解除に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'コピーしました',
        description: 'URLをクリップボードにコピーしました',
      });
    } catch {
      toast({
        title: 'エラー',
        description: 'URLのコピーに失敗しました',
        variant: 'destructive',
      });
    }
  };

  const handleOpenUrl = () => {
    if (!shareUrl) return;
    window.open(shareUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            {dashboard.isPublic ? (
              <>
                <Globe className="mr-2 h-4 w-4" />
                共有中
              </>
            ) : (
              <>
                <GlobeLock className="mr-2 h-4 w-4" />
                共有
              </>
            )}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ダッシュボードを共有</DialogTitle>
          <DialogDescription>
            {dashboard.isPublic
              ? 'このダッシュボードは公開されています。URLを知っている人は誰でもアクセスできます。'
              : '共有URLを生成すると、認証なしでダッシュボードを閲覧できるようになります。'}
          </DialogDescription>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-url">共有URL</Label>
              <div className="flex items-center gap-2">
                <Input id="share-url" value={shareUrl} readOnly className="text-sm" />
                <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleOpenUrl}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-muted-foreground">
            <p>共有URLがまだ生成されていません。</p>
            <p className="text-sm">「URLを生成」をクリックして共有を開始してください。</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {shareUrl ? (
            <Button variant="destructive" onClick={handleRevoke} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              共有を解除
            </Button>
          ) : (
            <Button onClick={handleShare} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              URLを生成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
