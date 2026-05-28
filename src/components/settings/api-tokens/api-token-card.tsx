'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Key, MoreVertical, Trash2, Ban, Clock, Activity, Shield } from 'lucide-react';
import {
  type ApiToken,
  API_TOKEN_SCOPE_LABELS,
  isTokenValid,
  getTokenRemainingDays,
  type ApiTokenScope,
} from '@/types/api-token';

// 相対時間フォーマット（簡易実装）
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `${diffSec}秒前`;
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 30) return `${diffDay}日前`;
  return formatDate(date);
}

// 日付フォーマット（yyyy/MM/dd）
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

// 日時フォーマット（yyyy/MM/dd HH:mm）
function formatDateTime(date: Date): string {
  const dateStr = formatDate(date);
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hour}:${minute}`;
}

interface ApiTokenCardProps {
  token: ApiToken;
  onRevoke: (id: string, reason?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ApiTokenCard({ token, onRevoke, onDelete }: ApiTokenCardProps) {
  const [isRevoking, setIsRevoking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isValid = isTokenValid(token);
  const remainingDays = getTokenRemainingDays(token);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      await onRevoke(token.id);
      setShowRevokeDialog(false);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(token.id);
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = () => {
    if (token.revokedAt) {
      return <Badge variant="destructive">失効済み</Badge>;
    }
    if (!token.isActive) {
      return <Badge variant="secondary">無効</Badge>;
    }
    if (token.expiresAt && new Date(token.expiresAt) <= new Date()) {
      return <Badge variant="destructive">期限切れ</Badge>;
    }
    if (remainingDays !== null && remainingDays <= 7) {
      return <Badge variant="warning">まもなく期限切れ</Badge>;
    }
    return <Badge variant="success">有効</Badge>;
  };

  const getExpirationText = () => {
    if (!token.expiresAt) {
      return '無期限';
    }
    const date = new Date(token.expiresAt);
    if (date <= new Date()) {
      return `${formatDate(date)} に期限切れ`;
    }
    return `${formatDate(date)} まで有効`;
  };

  const getLastUsedText = () => {
    if (!token.lastUsedAt) {
      return '未使用';
    }
    return formatRelativeTime(new Date(token.lastUsedAt));
  };

  return (
    <>
      <Card className={!isValid ? 'opacity-60' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">{token.name}</CardTitle>
                <CardDescription className="font-mono text-xs">
                  {token.tokenPrefix}...
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">メニューを開く</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isValid && (
                    <>
                      <DropdownMenuItem onClick={() => setShowRevokeDialog(true)}>
                        <Ban className="mr-2 h-4 w-4" />
                        トークンを失効
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* スコープ */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              スコープ
            </div>
            <div className="flex flex-wrap gap-1">
              {token.scopes.slice(0, 3).map((scope) => (
                <Badge key={scope} variant="outline" className="text-xs">
                  {API_TOKEN_SCOPE_LABELS[scope as ApiTokenScope]}
                </Badge>
              ))}
              {token.scopes.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{token.scopes.length - 3}
                </Badge>
              )}
            </div>
          </div>

          {/* メタ情報 */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                有効期限
              </div>
              <div>{getExpirationText()}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Activity className="h-3 w-3" />
                最終使用
              </div>
              <div>{getLastUsedText()}</div>
            </div>
          </div>

          {/* 失効理由 */}
          {token.revokedAt && token.revokedReason && (
            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              失効理由: {token.revokedReason}
            </div>
          )}

          {/* 作成日時 */}
          <div className="text-xs text-muted-foreground">
            作成: {formatDateTime(new Date(token.createdAt))}
          </div>
        </CardContent>
      </Card>

      {/* 失効確認ダイアログ */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>トークンを失効しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              トークン「{token.name}」を失効すると、このトークンを使用したAPIアクセスはできなくなります。
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? '失効中...' : '失効する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>トークンを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              トークン「{token.name}」を完全に削除します。
              使用ログも含めて全てのデータが削除されます。
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '削除中...' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
