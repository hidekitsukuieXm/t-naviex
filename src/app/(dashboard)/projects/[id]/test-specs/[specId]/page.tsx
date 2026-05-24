'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TestSpecHeader } from '@/components/test-specs/test-spec-header';
import { SortableSectionTree } from '@/components/test-specs/sortable-section-tree';
import { TestCaseList } from '@/components/test-specs/test-case-list';
import { type TestSpec } from '@/types/test-spec';
import { type TestSectionWithChildren } from '@/types/test-section';
import { Loader2 } from 'lucide-react';

interface TestSpecDetailPageProps {
  params: Promise<{ id: string; specId: string }>;
}

export default function TestSpecDetailPage({ params }: TestSpecDetailPageProps) {
  const { id: projectId, specId } = use(params);
  const [testSpec, setTestSpec] = useState<TestSpec | null>(null);
  const [sections, setSections] = useState<TestSectionWithChildren[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTestSpec = useCallback(async () => {
    try {
      const response = await fetch(`/api/test-specs/${specId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('テスト仕様書が見つかりません。');
        }
        throw new Error('テスト仕様書の取得に失敗しました。');
      }
      const data = await response.json();
      setTestSpec(data);
    } catch (err) {
      throw err;
    }
  }, [specId]);

  const fetchSections = useCallback(async () => {
    try {
      const response = await fetch(`/api/test-specs/${specId}/sections?format=tree`);
      if (!response.ok) {
        throw new Error('セクション一覧の取得に失敗しました。');
      }
      const data = await response.json();
      setSections(data.sections || []);
    } catch (err) {
      throw err;
    }
  }, [specId]);

  const handleMoveSection = useCallback(
    async (sectionId: string, newParentId: string | null, newSortOrder: number) => {
      try {
        const response = await fetch(`/api/test-specs/${specId}/sections/${sectionId}/move`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentId: newParentId,
            sortOrder: newSortOrder,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'セクションの移動に失敗しました。');
        }

        // Refetch sections to ensure consistency
        await fetchSections();
      } catch (err) {
        console.error('Failed to move section:', err);
        throw err;
      }
    },
    [specId, fetchSections]
  );

  const handleSectionsChange = useCallback((newSections: TestSectionWithChildren[]) => {
    setSections(newSections);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await Promise.all([fetchTestSpec(), fetchSections()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fetchTestSpec, fetchSections]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !testSpec) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-destructive">
              {error || 'テスト仕様書が見つかりません。'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      {/* Header */}
      <TestSpecHeader testSpec={testSpec} projectId={projectId} />

      {/* 2-Pane Layout */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left Pane - Section Tree */}
        <Card className="w-72 shrink-0 overflow-hidden">
          <CardContent className="h-full p-4">
            <SortableSectionTree
              sections={sections}
              testSpecId={specId}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
              onSectionsChange={handleSectionsChange}
              onMoveSection={handleMoveSection}
              disabled={testSpec.isLocked}
              className="h-full"
            />
          </CardContent>
        </Card>

        {/* Right Pane - Test Case List */}
        <div className="flex-1 overflow-hidden">
          <TestCaseList
            testSpecId={specId}
            selectedSectionId={selectedSectionId}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
