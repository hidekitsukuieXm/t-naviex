'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Link2, AlertTriangle, ArrowRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CASE_DEPENDENCY_TYPE,
  CASE_DEPENDENCY_TYPE_LABELS,
  CASE_DEPENDENCY_TYPE_DESCRIPTIONS,
} from '@/types/case-dependency';
import type { CaseDependencyWithRelations, CaseDependencyType } from '@/types/case-dependency';

interface TestCaseOption {
  id: string;
  title: string;
  priority: string;
  sectionName?: string;
}

interface CaseDependencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testSpecId: string;
  testCaseId: string;
  testCaseTitle: string;
  onDependenciesChanged?: () => void;
}

export function CaseDependencyDialog({
  open,
  onOpenChange,
  testSpecId,
  testCaseId,
  testCaseTitle,
  onDependenciesChanged,
}: CaseDependencyDialogProps) {
  const { toast } = useToast();
  const [dependencies, setDependencies] = useState<CaseDependencyWithRelations[]>([]);
  const [availableCases, setAvailableCases] = useState<TestCaseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add form state
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [dependencyType, setDependencyType] = useState<CaseDependencyType>(
    CASE_DEPENDENCY_TYPE.REQUIRES
  );
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [depsRes, casesRes] = await Promise.all([
        fetch(`/api/test-specs/${testSpecId}/cases/${testCaseId}/dependencies`),
        fetch(`/api/test-specs/${testSpecId}/cases?limit=1000`),
      ]);

      if (depsRes.ok) {
        const depsData = await depsRes.json();
        setDependencies(depsData);
      }

      if (casesRes.ok) {
        const casesData = await casesRes.json();
        // Filter out current test case
        const cases = (casesData.data || casesData || [])
          .filter((c: { id: string }) => c.id !== testCaseId)
          .map(
            (c: { id: string; title: string; priority: string; section?: { name: string } }) => ({
              id: c.id,
              title: c.title,
              priority: c.priority,
              sectionName: c.section?.name,
            })
          );
        setAvailableCases(cases);
      }
    } catch (err) {
      console.error('Failed to fetch dependencies:', err);
      toast({
        title: 'エラー',
        description: 'データの取得に失敗しました。',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [testSpecId, testCaseId, toast]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: fetch data when dialog opens
      fetchData();
    }
  }, [open, fetchData]);

  const handleAddDependency = async () => {
    if (!selectedCaseId) {
      toast({
        title: 'エラー',
        description: '依存先テストケースを選択してください。',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch(
        `/api/test-specs/${testSpecId}/cases/${testCaseId}/dependencies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dependsOnId: selectedCaseId,
            dependencyType,
            description: description.trim() || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '依存関係の追加に失敗しました。');
      }

      toast({
        title: '追加完了',
        description: '依存関係を追加しました。',
      });

      // Reset form
      setSelectedCaseId('');
      setDependencyType(CASE_DEPENDENCY_TYPE.REQUIRES);
      setDescription('');

      // Refresh dependencies
      fetchData();
      onDependenciesChanged?.();
    } catch (err) {
      toast({
        title: 'エラー',
        description: err instanceof Error ? err.message : 'エラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteDependency = async (dependencyId: string) => {
    setDeletingId(dependencyId);
    try {
      const response = await fetch(
        `/api/test-specs/${testSpecId}/cases/${testCaseId}/dependencies/${dependencyId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '依存関係の削除に失敗しました。');
      }

      toast({
        title: '削除完了',
        description: '依存関係を削除しました。',
      });

      // Refresh dependencies
      fetchData();
      onDependenciesChanged?.();
    } catch (err) {
      toast({
        title: 'エラー',
        description: err instanceof Error ? err.message : 'エラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Filter available cases that are not already dependencies
  const existingDependencyIds = new Set(dependencies.map((d) => d.dependsOnId));
  const filteredCases = availableCases
    .filter((c) => !existingDependencyIds.has(c.id))
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return c.title.toLowerCase().includes(query) || c.sectionName?.toLowerCase().includes(query);
    });

  const getTypeColor = (type: CaseDependencyType) => {
    switch (type) {
      case 'BLOCKS':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'REQUIRES':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'RELATED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-5" />
            依存関係管理
          </DialogTitle>
          <DialogDescription className="truncate">テストケース: {testCaseTitle}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Existing dependencies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">現在の依存関係</Label>
                <Badge variant="secondary">{dependencies.length}件</Badge>
              </div>
              {dependencies.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  <AlertTriangle className="mx-auto mb-2 size-6" />
                  依存関係がありません
                </div>
              ) : (
                <ScrollArea className="h-48">
                  <div className="space-y-2 pr-4">
                    {dependencies.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm font-medium">
                              {dep.dependsOn.title}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn('text-xs', getTypeColor(dep.dependencyType))}
                            >
                              {CASE_DEPENDENCY_TYPE_LABELS[dep.dependencyType]}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {dep.dependsOn.priority}
                            </Badge>
                            {dep.description && (
                              <span className="truncate text-xs text-muted-foreground">
                                {dep.description}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDependency(dep.id)}
                          disabled={deletingId === dep.id}
                        >
                          {deletingId === dep.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <Separator />

            {/* Add new dependency */}
            <div className="space-y-4">
              <Label className="text-base font-medium">依存関係を追加</Label>
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="テストケースを検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Test case selection */}
                <div className="space-y-2">
                  <Label>依存先テストケース</Label>
                  <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="テストケースを選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCases.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          追加可能なテストケースがありません
                        </div>
                      ) : (
                        filteredCases.slice(0, 50).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              <span className="truncate">{c.title}</span>
                              <Badge variant="secondary" className="text-xs">
                                {c.priority}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dependency type */}
                <div className="space-y-2">
                  <Label>依存関係タイプ</Label>
                  <Select
                    value={dependencyType}
                    onValueChange={(v) => setDependencyType(v as CaseDependencyType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CASE_DEPENDENCY_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div>
                            <div>{label}</div>
                            <div className="text-xs text-muted-foreground">
                              {CASE_DEPENDENCY_TYPE_DESCRIPTIONS[value as CaseDependencyType]}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>説明（任意）</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="依存関係の説明..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
          <Button onClick={handleAddDependency} disabled={isAdding || !selectedCaseId}>
            {isAdding ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
