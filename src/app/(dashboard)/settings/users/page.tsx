'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
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
import {
  UserCreateDialog,
  UserEditDialog,
  UserDeleteDialog,
  UserStatusSelect,
} from '@/components/users';
import { type User, type UserStatus, USER_STATUS_LABELS } from '@/types/user';
import { Loader2, Users, Search, X } from 'lucide-react';

interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Cache for initial user fetch
const usersCache = new Map<string, { data: UserListResponse; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

function getCacheKey(query: string, status: string, page: number): string {
  return `${query}-${status}-${page}`;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
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
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchUsers = useCallback(async () => {
    const cacheKey = getCacheKey(debouncedQuery, statusFilter, currentPage);
    const cached = usersCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      startTransition(() => {
        setUsers(cached.data.users);
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

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error('ユーザー一覧の取得に失敗しました。');
      }

      const data: UserListResponse = await response.json();
      usersCache.set(cacheKey, { data, timestamp: Date.now() });

      startTransition(() => {
        setUsers(data.users);
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
  }, [debouncedQuery, statusFilter, currentPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRefresh = () => {
    // Clear cache and refetch
    usersCache.clear();
    fetchUsers();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const hasFilters = searchQuery || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ユーザー管理</h1>
          <p className="text-muted-foreground">ユーザーの一覧・追加・編集・削除ができます。</p>
        </div>
        <UserCreateDialog onSuccess={handleRefresh} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
          <CardDescription>
            登録されているユーザーの一覧です。{total > 0 && `（全${total}件）`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="名前またはメールアドレスで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as UserStatus | 'all');
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {(Object.entries(USER_STATUS_LABELS) as [UserStatus, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 size-4" />
                  クリア
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users className="mb-4 size-12" />
              {hasFilters ? (
                <>
                  <p>検索条件に一致するユーザーがいません。</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    フィルターをクリア
                  </Button>
                </>
              ) : (
                <>
                  <p>ユーザーがいません。</p>
                  <p className="text-sm">「新規ユーザー」ボタンから作成してください。</p>
                </>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>メールアドレス</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>作成日</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <UserStatusSelect
                          userId={user.id}
                          currentStatus={user.status}
                          onSuccess={handleRefresh}
                        />
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <UserEditDialog user={user} onSuccess={handleRefresh} />
                          <UserDeleteDialog
                            user={user}
                            onSuccess={handleRefresh}
                            disabled={session?.user?.id === user.id}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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
