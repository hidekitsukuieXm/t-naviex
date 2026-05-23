'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RoleCreateDialog,
  RoleEditDialog,
  RoleDeleteDialog,
  RoleBadge,
  PermissionMatrix,
  UserRoleAssignment,
} from '@/components/roles';
import { type Role, type RoleListResponse } from '@/types/role';
import { Loader2, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Cache for initial role fetch
const rolesCache = new Map<string, { data: RoleListResponse; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  const fetchRoles = useCallback(async () => {
    const cacheKey = 'roles';
    const cached = rolesCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      startTransition(() => {
        setRoles(cached.data.roles);
        setIsLoading(false);
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/roles');
      if (!response.ok) {
        throw new Error('ロール一覧の取得に失敗しました。');
      }

      const data: RoleListResponse = await response.json();
      rolesCache.set(cacheKey, { data, timestamp: Date.now() });

      startTransition(() => {
        setRoles(data.roles);
        setError(null);
        setIsLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        setIsLoading(false);
      });
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleRefresh = () => {
    // Clear cache and refetch
    rolesCache.clear();
    fetchRoles();
  };

  const toggleExpanded = (roleId: string) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ロール・権限管理</h1>
          <p className="text-muted-foreground">
            ロールの一覧・作成・編集・削除と権限設定ができます。
          </p>
        </div>
        <RoleCreateDialog onSuccess={handleRefresh} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ロール一覧</CardTitle>
          <CardDescription>
            登録されているロールの一覧です。{roles.length > 0 && `（全${roles.length}件）`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Shield className="mb-4 size-12" />
              <p>ロールがありません。</p>
              <p className="text-sm">「新規ロール」ボタンから作成してください。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {roles.map((role) => {
                const isExpanded = expandedRoles.has(role.id);
                return (
                  <div key={role.id} className="rounded-lg border">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => toggleExpanded(role.id)}
                          aria-label={isExpanded ? '権限を閉じる' : '権限を表示'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </Button>
                        <div>
                          <div className="flex items-center gap-2">
                            <RoleBadge
                              displayName={role.displayName}
                              isSystemRole={role.isSystemRole}
                            />
                            <span className="text-sm text-muted-foreground">({role.name})</span>
                          </div>
                          {role.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            作成日: {formatDate(role.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserRoleAssignment role={role} onSuccess={handleRefresh} />
                        <RoleEditDialog role={role} onSuccess={handleRefresh} />
                        <RoleDeleteDialog
                          role={role}
                          onSuccess={handleRefresh}
                          disabled={role.isSystemRole}
                        />
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t p-4">
                        <h4 className="mb-3 text-sm font-medium">権限マトリクス</h4>
                        <PermissionMatrix permissions={role.permissions} readOnly />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
