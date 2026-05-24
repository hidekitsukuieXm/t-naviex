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
import { TestSpecForm, type TestSpecFormData } from './test-spec-form';

interface TestSpecCreateDialogProps {
  projectId: string;
  onSuccess?: () => void;
}

export function TestSpecCreateDialog({ projectId, onSuccess }: TestSpecCreateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: TestSpecFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/test-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          projectId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'テスト仕様書の作成に失敗しました。');
      }

      setOpen(false);
      router.refresh();
      onSuccess?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 size-4" />
            新規テスト仕様書
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>新規テスト仕様書作成</DialogTitle>
          <DialogDescription>新しいテスト仕様書の情報を入力してください。</DialogDescription>
        </DialogHeader>
        <TestSpecForm
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
