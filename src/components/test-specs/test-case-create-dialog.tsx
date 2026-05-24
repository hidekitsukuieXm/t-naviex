'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TestCaseForm, type TestCaseFormData } from './test-case-form';
import { type TestSectionWithChildren } from '@/types/test-section';

interface TestCaseCreateDialogProps {
  testSpecId: string;
  sections?: TestSectionWithChildren[];
  defaultSectionId?: string | null;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function TestCaseCreateDialog({
  testSpecId,
  sections = [],
  defaultSectionId = null,
  onSuccess,
  trigger,
}: TestCaseCreateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: TestCaseFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/test-specs/${testSpecId}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          preconditions: data.preconditions || null,
          priority: data.priority,
          testType: data.testType,
          testTechnique: data.testTechnique,
          sectionId: data.sectionId,
          isMatrix: data.isMatrix,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'テストケースの作成に失敗しました。');
      }

      setOpen(false);
      router.refresh();
      onSuccess?.();
    } finally {
      setIsLoading(false);
    }
  };

  const defaultTrigger = (
    <Button>
      <Plus className="mr-2 size-4" />
      新規テストケース
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger || defaultTrigger} />
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>新規テストケース作成</DialogTitle>
          <DialogDescription>新しいテストケースの情報を入力してください。</DialogDescription>
        </DialogHeader>
        <TestCaseForm
          sections={sections}
          defaultSectionId={defaultSectionId}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
