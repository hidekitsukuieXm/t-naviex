'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PatternOption {
  field: string;
  label: string;
  values: string[];
}

interface GeneratedPattern {
  name: string;
  configParams: Record<string, string>;
}

const DEFAULT_OPTIONS: PatternOption[] = [
  {
    field: 'os',
    label: 'OS',
    values: ['Windows', 'macOS', 'Linux', 'iOS', 'Android'],
  },
  {
    field: 'browser',
    label: 'ブラウザ',
    values: ['Chrome', 'Firefox', 'Safari', 'Edge'],
  },
  {
    field: 'deviceType',
    label: 'デバイスタイプ',
    values: ['desktop', 'tablet', 'mobile'],
  },
];

interface GeneratePatternsDialogProps {
  projectId: string;
  onSuccess: () => void;
}

export function GeneratePatternsDialog({ projectId, onSuccess }: GeneratePatternsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [options, setOptions] = useState<PatternOption[]>(DEFAULT_OPTIONS);
  const [selectedValues, setSelectedValues] = useState<Record<string, string[]>>({
    os: [],
    browser: [],
    deviceType: [],
  });
  const [generatedPatterns, setGeneratedPatterns] = useState<GeneratedPattern[]>([]);
  const [step, setStep] = useState<'select' | 'preview' | 'result'>('select');
  const { toast } = useToast();

  const handleAddValue = (field: string, value: string) => {
    if (!value.trim()) return;

    setOptions((prev) =>
      prev.map((opt) =>
        opt.field === field && !opt.values.includes(value.trim())
          ? { ...opt, values: [...opt.values, value.trim()] }
          : opt
      )
    );
  };

  const handleToggleValue = (field: string, value: string) => {
    setSelectedValues((prev) => {
      const current = prev[field] || [];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const generatePatterns = () => {
    const activeFields = Object.entries(selectedValues).filter(([, values]) => values.length > 0);

    if (activeFields.length === 0) {
      toast({
        title: '選択エラー',
        description: '少なくとも1つの値を選択してください。',
        variant: 'destructive',
      });
      return;
    }

    // Generate all combinations
    const patterns: GeneratedPattern[] = [];

    const generateCombinations = (currentIndex: number, currentParams: Record<string, string>) => {
      if (currentIndex >= activeFields.length) {
        // Create name from params
        const nameParts = activeFields.map(([field]) => currentParams[field]);
        patterns.push({
          name: nameParts.join(' + '),
          configParams: { ...currentParams },
        });
        return;
      }

      const [field, values] = activeFields[currentIndex];
      for (const value of values) {
        generateCombinations(currentIndex + 1, {
          ...currentParams,
          [field]: value,
        });
      }
    };

    generateCombinations(0, {});
    setGeneratedPatterns(patterns);
    setStep('preview');
  };

  const createConfigurations = async () => {
    setIsSubmitting(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const pattern of generatedPatterns) {
        try {
          const response = await fetch(`/api/projects/${projectId}/configurations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: pattern.name,
              configParams: pattern.configParams,
              isActive: true,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      if (errorCount > 0) {
        toast({
          title: '作成完了（一部エラー）',
          description: `${successCount}件作成、${errorCount}件エラー（名前重複等）`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: '作成完了',
          description: `${successCount}件のコンフィギュレーションを作成しました。`,
        });
      }

      setStep('result');
      onSuccess();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'エラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep('select');
    setSelectedValues({
      os: [],
      browser: [],
      deviceType: [],
    });
    setGeneratedPatterns([]);
  };

  const totalCombinations = Object.values(selectedValues).reduce(
    (acc, values) => (values.length > 0 ? acc * values.length : acc),
    Object.values(selectedValues).some((v) => v.length > 0) ? 1 : 0
  );

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Wand2 className="mr-2 size-4" />
            パターン生成
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>コンフィギュレーションパターン生成</DialogTitle>
          <DialogDescription>
            {step === 'select' &&
              '選択した値の組み合わせからコンフィギュレーションを一括生成します。'}
            {step === 'preview' && '生成されるコンフィギュレーションをプレビューしています。'}
            {step === 'result' && 'コンフィギュレーションの作成が完了しました。'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-6">
            {options.map((option) => (
              <div key={option.field} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{option.label}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="カスタム値を追加..."
                      className="h-8 w-40"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddValue(option.field, (e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    const isSelected = selectedValues[option.field]?.includes(value);
                    return (
                      <label
                        key={value}
                        className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 hover:bg-muted"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleValue(option.field, value)}
                        />
                        <span className="text-sm">{value}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {totalCombinations > 0 && (
              <div className="rounded-md bg-muted p-3 text-center">
                <span className="text-sm">
                  生成されるパターン数: <strong>{totalCombinations}</strong> 件
                </span>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              以下の{generatedPatterns.length}件のコンフィギュレーションが作成されます。
            </div>
            <ScrollArea className="h-[300px] rounded-md border">
              <div className="space-y-2 p-4">
                {generatedPatterns.map((pattern, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <span className="font-medium">{pattern.name}</span>
                    <div className="flex gap-1">
                      {Object.entries(pattern.configParams).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === 'result' && (
          <div className="py-8 text-center">
            <div className="mb-4 text-4xl">✓</div>
            <p className="text-lg font-medium">作成完了</p>
            <p className="text-sm text-muted-foreground">
              コンフィギュレーションが正常に作成されました。
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'select' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                キャンセル
              </Button>
              <Button onClick={generatePatterns} disabled={totalCombinations === 0}>
                プレビュー
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>
                戻る
              </Button>
              <Button onClick={createConfigurations} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {generatedPatterns.length}件を作成
              </Button>
            </>
          )}
          {step === 'result' && <Button onClick={handleClose}>閉じる</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
