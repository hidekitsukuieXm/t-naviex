'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { Users, Loader2, UserPlus } from 'lucide-react';
import type { Role } from '@/types/role';

interface ProjectMemberInfo {
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  userEmail: string;
  roleId: string;
}

interface UserRoleAssignmentProps {
  role: Role;
  onSuccess?: () => void;
}

export function UserRoleAssignment({ role, onSuccess }: UserRoleAssignmentProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<ProjectMemberInfo[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [changingMember, setChangingMember] = useState<string | null>(null);

  const fetchRoleMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch role members (users with this role in any project)
      const response = await fetch(`/api/roles/${role.id}/members`);
      if (!response.ok) {
        throw new Error('ロールメンバーの取得に失敗しました。');
      }
      const data = await response.json();
      setMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [role.id]);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [membersRes, rolesRes] = await Promise.all([
          fetch(`/api/roles/${role.id}/members`),
          fetch('/api/roles'),
        ]);

        if (!isMounted) return;

        if (!membersRes.ok) {
          throw new Error('ロールメンバーの取得に失敗しました。');
        }

        const membersData = await membersRes.json();
        setMembers(membersData.members || []);

        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setAllRoles(rolesData.roles || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [open, role.id]);

  const handleRoleChange = async (projectId: string, userId: string, newRoleId: string) => {
    const memberKey = `${projectId}-${userId}`;
    setChangingMember(memberKey);

    try {
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: newRoleId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ロールの変更に失敗しました。');
      }

      // Refresh the members list
      await fetchRoleMembers();
      onSuccess?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setChangingMember(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Users className="mr-1 size-3" />
            メンバー
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            {role.displayName}のメンバー
          </DialogTitle>
          <DialogDescription>
            このロールが割り当てられているプロジェクトメンバーの一覧です。
            ロールを変更するには、プルダウンから新しいロールを選択してください。
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-destructive">{error}</div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Users className="mb-4 size-12" />
            <p>このロールが割り当てられているメンバーはいません。</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>プロジェクト</TableHead>
                <TableHead>ユーザー</TableHead>
                <TableHead>ロール</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const memberKey = `${member.projectId}-${member.userId}`;
                const isChanging = changingMember === memberKey;
                return (
                  <TableRow key={memberKey}>
                    <TableCell className="font-medium">{member.projectName}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.userName}</p>
                        <p className="text-xs text-muted-foreground">{member.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={member.roleId}
                        onValueChange={(newRoleId) =>
                          handleRoleChange(member.projectId, member.userId, newRoleId)
                        }
                        disabled={isChanging}
                      >
                        <SelectTrigger className="w-40">
                          {isChanging ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {allRoles.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
