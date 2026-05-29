'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Link2, Search, Loader2 } from 'lucide-react';

interface TestCase {
  id: string;
  title: string;
  testSpecId: string;
  testSpecTitle: string;
}

interface RequirementTestCaseLinkDialogProps {
  projectId: string;
  requirementId: string;
  linkedTestCaseIds: string[];
  onSuccess?: () => void;
}

export function RequirementTestCaseLinkDialog({
  projectId,
  requirementId,
  linkedTestCaseIds,
  onSuccess,
}: RequirementTestCaseLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    const fetchTestCases = async () => {
      setIsLoading(true);
      try {
        // Fetch all test specs for this project
        const specsRes = await fetch(`/api/projects/${projectId}/test-specs`);
        if (!specsRes.ok) throw new Error('テスト仕様書の取得に失敗しました。');
        const specsData = await specsRes.json();

        // Fetch test cases for each spec
        const allTestCases: TestCase[] = [];
        for (const spec of specsData.specs || []) {
          const casesRes = await fetch(`/api/test-specs/${spec.id}/cases`);
          if (casesRes.ok) {
            const casesData = await casesRes.json();
            const cases = casesData.testCases || [];
            cases.forEach((tc: { id: string; title: string }) => {
              allTestCases.push({
                id: tc.id,
                title: tc.title,
                testSpecId: spec.id,
                testSpecTitle: spec.title,
              });
            });
          }
        }

        if (isMounted) {
          setTestCases(allTestCases);
          setSelectedIds(new Set(linkedTestCaseIds));
        }
      } catch (error) {
        if (isMounted) {
          toast({
            title: 'エラー',
            description:
              error instanceof Error ? error.message : 'テストケースの取得に失敗しました。',
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTestCases();

    return () => {
      isMounted = false;
    };
  }, [open, projectId, linkedTestCaseIds, toast]);

  const handleToggle = (testCaseId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(testCaseId)) {
        next.delete(testCaseId);
      } else {
        next.add(testCaseId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Determine which test cases to link and unlink
      const originalIds = new Set(linkedTestCaseIds);
      const toLink = [...selectedIds].filter((id) => !originalIds.has(id));
      const toUnlink = [...originalIds].filter((id) => !selectedIds.has(id));

      // Link new test cases
      for (const testCaseId of toLink) {
        const res = await fetch(
          `/api/projects/${projectId}/requirements/${requirementId}/test-cases`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ testCaseId }),
          }
        );
        if (!res.ok) throw new Error('テストケースの紐付けに失敗しました。');
      }

      // Unlink removed test cases
      for (const testCaseId of toUnlink) {
        const res = await fetch(
          `/api/projects/${projectId}/requirements/${requirementId}/test-cases?testCaseId=${testCaseId}`,
          { method: 'DELETE' }
        );
        if (!res.ok) throw new Error('テストケースの紐付け解除に失敗しました。');
      }

      toast({
        title: '保存完了',
        description: 'テストケースの紐付けを更新しました。',
      });

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '保存に失敗しました。',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTestCases = testCases.filter(
    (tc) =>
      tc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.testSpecTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Link2 className="mr-2 size-4" />
            テストケース紐付け
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>テストケースの紐付け</DialogTitle>
          <DialogDescription>
            この要求仕様に紐付けるテストケースを選択してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="テストケースを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTestCases.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {searchQuery
                ? '検索条件に一致するテストケースがありません。'
                : 'テストケースがありません。'}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>テストケース</TableHead>
                    <TableHead>テスト仕様書</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTestCases.map((tc) => (
                    <TableRow
                      key={tc.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleToggle(tc.id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(tc.id)}
                          onCheckedChange={() => handleToggle(tc.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{tc.title}</TableCell>
                      <TableCell className="text-muted-foreground">{tc.testSpecTitle}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              {selectedIds.size}件のテストケースを選択中
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                保存
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
