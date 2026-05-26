'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RequirementType,
  RequirementTypeLabels,
  RequirementStatus,
  RequirementStatusLabels,
  RequirementPriority,
  RequirementPriorityLabels,
  type RequirementSafe,
} from '@/types/requirement';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  code: z
    .string()
    .min(1, 'コードは必須です')
    .max(50, 'コードは50文字以内で入力してください')
    .regex(/^[A-Z0-9_-]+$/, 'コードは英大文字・数字・ハイフン・アンダースコアのみ使用可能です'),
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(500, 'タイトルは500文字以内で入力してください'),
  description: z.string().max(10000).optional().nullable(),
  content: z.string().optional().nullable(),
  type: z.nativeEnum(RequirementType),
  status: z.nativeEnum(RequirementStatus),
  priority: z.nativeEnum(RequirementPriority),
  version: z.string().max(50).optional().nullable(),
  source: z.string().max(500).optional().nullable(),
  rationale: z.string().max(10000).optional().nullable(),
  acceptance: z.string().max(10000).optional().nullable(),
  parentId: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface RequirementFormProps {
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel: () => void;
  defaultValues?: Partial<FormValues>;
  isLoading?: boolean;
  parentOptions?: Array<{ id: string; code: string; title: string }>;
  requirement?: RequirementSafe;
}

export function RequirementForm({
  onSubmit,
  onCancel,
  defaultValues,
  isLoading,
  parentOptions = [],
  requirement,
}: RequirementFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: defaultValues?.code ?? '',
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      content: defaultValues?.content ?? '',
      type: defaultValues?.type ?? RequirementType.FUNCTIONAL,
      status: defaultValues?.status ?? RequirementStatus.DRAFT,
      priority: defaultValues?.priority ?? RequirementPriority.SHOULD_HAVE,
      version: defaultValues?.version ?? '',
      source: defaultValues?.source ?? '',
      rationale: defaultValues?.rationale ?? '',
      acceptance: defaultValues?.acceptance ?? '',
      parentId: defaultValues?.parentId ?? null,
    },
  });

  const handleSubmit = async (data: FormValues) => {
    try {
      await onSubmit(data);
    } catch {
      // Error handling is done in parent component
    }
  };

  const isEditing = !!requirement;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>コード *</FormLabel>
                <FormControl>
                  <Input placeholder="REQ-001" {...field} />
                </FormControl>
                <FormDescription>英大文字・数字・ハイフン・アンダースコアのみ</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>親要求仕様</FormLabel>
                <Select
                  value={field.value ?? 'none'}
                  onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="親要求仕様を選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">なし（ルートレベル）</SelectItem>
                    {parentOptions
                      .filter((opt) => !requirement || opt.id !== requirement.id)
                      .map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          [{opt.code}] {opt.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>タイトル *</FormLabel>
              <FormControl>
                <Input placeholder="要求仕様のタイトルを入力" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="要求仕様の概要を入力"
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>詳細内容（Markdown）</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="詳細な要求仕様内容をMarkdown形式で入力"
                  rows={6}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>Markdown記法が使用できます</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>種別</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(RequirementTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ステータス</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(RequirementStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>優先度</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(RequirementPriorityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="version"
            render={({ field }) => (
              <FormItem>
                <FormLabel>バージョン</FormLabel>
                <FormControl>
                  <Input placeholder="v1.0" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>出典</FormLabel>
                <FormControl>
                  <Input placeholder="要求の出典元" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="rationale"
          render={({ field }) => (
            <FormItem>
              <FormLabel>根拠・理由</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="この要求が必要な理由"
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="acceptance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>受入基準</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="この要求が満たされたかどうかを判断する基準"
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            キャンセル
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEditing ? '更新' : '作成'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
