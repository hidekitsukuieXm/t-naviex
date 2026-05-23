'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, LogOut, RefreshCw } from 'lucide-react';

interface SessionTimeoutWarningDialogProps {
  open: boolean;
  remainingSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionTimeoutWarningDialog({
  open,
  remainingSeconds,
  onExtend,
  onLogout,
}: SessionTimeoutWarningDialogProps) {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}分${secs.toString().padStart(2, '0')}秒`;
    }
    return `${secs}秒`;
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="size-5 text-yellow-500" />
            セッションタイムアウト警告
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>セキュリティのため、まもなくセッションがタイムアウトします。</p>
            <p className="text-2xl font-bold text-center text-destructive">
              残り {formatTime(remainingSeconds)}
            </p>
            <p>作業を続ける場合は「セッションを延長」をクリックしてください。</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onLogout} className="gap-2">
            <LogOut className="size-4" />
            ログアウト
          </AlertDialogCancel>
          <AlertDialogAction onClick={onExtend} className="gap-2">
            <RefreshCw className="size-4" />
            セッションを延長
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
