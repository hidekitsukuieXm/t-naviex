'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  type AuditLog,
  type AuditAction,
  type AuditTargetType,
  type AuditActionCategory,
  AUDIT_ACTION_LABELS,
  AUDIT_TARGET_TYPE_LABELS,
  getActionCategory,
} from '@/types/audit-log';
import { Loader2, FileText, Search, X, Download, Calendar, Filter } from 'lucide-react';

interface AuditLogListResponse {
  auditLogs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 監査ログのキャッシュ
const auditLogsCache = new Map<string, { data: AuditLogListResponse; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

function getCacheKey(
  query: string,
  action: string,
  targetType: string,
  startDate: string,
  endDate: string,
  page: number
): string {
  return `${query}-${action}-${targetType}-${startDate}-${endDate}-${page}`;
}

// アクションカテゴリのカラー
function getActionCategoryColor(category: AuditActionCategory): string {
  switch (category) {
    case 'auth':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'user':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'role':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'project':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    case 'settings':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<AuditTargetType | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchAuditLogs = useCallback(async () => {
    const cacheKey = getCacheKey(
      debouncedQuery,
      actionFilter,
      targetTypeFilter,
      startDate,
      endDate,
      currentPage
    );
    const cached = auditLogsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      startTransition(() => {
        setAuditLogs(cached.data.auditLogs);
        setTotalPages(cached.data.totalPages);
        setTotal(cached.data.total);
        setIsLoading(false);
      });
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', limit.toString());

      if (debouncedQuery) {
        params.set('query', debouncedQuery);
      }

      if (actionFilter !== 'all') {
        params.set('action', actionFilter);
      }

      if (targetTypeFilter !== 'all') {
        params.set('targetType', targetTypeFilter);
      }

      if (startDate) {
        params.set('startDate', startDate);
      }

      if (endDate) {
        params.set('endDate', endDate);
      }

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            '監査ログを表示する権限がありません。システム管理者にお問い合わせください。'
          );
        }
        throw new Error('監査ログ一覧の取得に失敗しました。');
      }

      const data: AuditLogListResponse = await response.json();
      auditLogsCache.set(cacheKey, { data, timestamp: Date.now() });

      startTransition(() => {
        setAuditLogs(data.auditLogs);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setError(null);
        setIsLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        setIsLoading(false);
      });
    }
  }, [debouncedQuery, actionFilter, targetTypeFilter, startDate, endDate, currentPage]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleRefresh = () => {
    auditLogsCache.clear();
    fetchAuditLogs();
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      params.set('format', 'csv');

      if (actionFilter !== 'all') {
        params.set('action', actionFilter);
      }

      if (targetTypeFilter !== 'all') {
        params.set('targetType', targetTypeFilter);
      }

      if (startDate) {
        params.set('startDate', startDate);
      }

      if (endDate) {
        params.set('endDate', endDate);
      }

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('エクスポートに失敗しました。');
      }

      // レスポンスからBlobを取得
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // ダウンロードリンクを作成
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // キャッシュをクリアして再取得（エクスポート操作が記録されているため）
      auditLogsCache.clear();
      fetchAuditLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エクスポートに失敗しました。');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActionFilter('all');
    setTargetTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasFilters =
    searchQuery || actionFilter !== 'all' || targetTypeFilter !== 'all' || startDate || endDate;

  // アクション一覧（フィルター用）
  const actionOptions: AuditAction[] = [
    'LOGIN',
    'LOGOUT',
    'LOGIN_FAILED',
    'PASSWORD_CHANGE',
    'PASSWORD_RESET_REQUEST',
    'PASSWORD_RESET',
    'USER_CREATE',
    'USER_UPDATE',
    'USER_DELETE',
    'USER_LOCK',
    'USER_UNLOCK',
    'ROLE_CREATE',
    'ROLE_UPDATE',
    'ROLE_DELETE',
    'PROJECT_CREATE',
    'PROJECT_UPDATE',
    'PROJECT_DELETE',
    'PROJECT_MEMBER_ADD',
    'PROJECT_MEMBER_UPDATE',
    'PROJECT_MEMBER_REMOVE',
    'PASSWORD_POLICY_UPDATE',
    'SESSION_SETTINGS_UPDATE',
    'AUDIT_LOG_EXPORT',
  ];

  // ターゲットタイプ一覧（フィルター用）
  const targetTypeOptions: AuditTargetType[] = [
    'USER',
    'ROLE',
    'PROJECT',
    'PROJECT_MEMBER',
    'PASSWORD_POLICY',
    'SESSION_SETTINGS',
    'AUDIT_LOG',
    'SYSTEM',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">監査ログ</h1>
          <p className="text-muted-foreground">システムの操作履歴を確認できます。</p>
        </div>
        <Button onClick={handleExport} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Download className="mr-2 size-4" />
          )}
          CSVエクスポート
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>操作履歴</CardTitle>
          <CardDescription>
            ユーザーの操作履歴一覧です。{total > 0 && `（全${total}件）`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="mb-4 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ユーザー名またはメールアドレスで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  更新
                </Button>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-1 size-4" />
                    クリア
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <Select
                  value={actionFilter}
                  onValueChange={(value) => {
                    setActionFilter(value as AuditAction | 'all');
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="操作" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての操作</SelectItem>
                    {actionOptions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {AUDIT_ACTION_LABELS[action]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select
                value={targetTypeFilter}
                onValueChange={(value) => {
                  setTargetTypeFilter(value as AuditTargetType | 'all');
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="対象種別" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての種別</SelectItem>
                  {targetTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {AUDIT_TARGET_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-36"
                  placeholder="開始日"
                />
                <span className="text-muted-foreground">〜</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-36"
                  placeholder="終了日"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="mb-4 size-12" />
              {hasFilters ? (
                <>
                  <p>検索条件に一致する監査ログがありません。</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    フィルターをクリア
                  </Button>
                </>
              ) : (
                <p>監査ログがありません。</p>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">日時</TableHead>
                      <TableHead className="w-36">ユーザー</TableHead>
                      <TableHead className="w-40">操作</TableHead>
                      <TableHead className="w-28">対象種別</TableHead>
                      <TableHead className="w-32">IPアドレス</TableHead>
                      <TableHead>詳細</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => {
                      const category = getActionCategory(log.action);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">{formatDateTime(log.createdAt)}</TableCell>
                          <TableCell>
                            {log.userName ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-default truncate">{log.userName}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{log.userEmail}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={getActionCategoryColor(category)}>
                              {AUDIT_ACTION_LABELS[log.action]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {AUDIT_TARGET_TYPE_LABELS[log.targetType]}
                            </span>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">{log.ipAddress || '-'}</code>
                          </TableCell>
                          <TableCell>
                            {log.details ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-default truncate text-sm text-muted-foreground">
                                      {JSON.stringify(log.details).slice(0, 50)}...
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-md">
                                    <pre className="text-xs">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {total}件中 {(currentPage - 1) * limit + 1}-
                    {Math.min(currentPage * limit, total)}件を表示
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      前へ
                    </Button>
                    <span className="text-sm">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      次へ
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
