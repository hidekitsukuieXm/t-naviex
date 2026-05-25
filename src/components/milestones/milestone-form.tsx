'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type Milestone,
  type MilestoneStatus,
  MILESTONE_STATUS,
  MILESTONE_STATUS_LABELS,
  MILESTONE_NAME_MAX_LENGTH,
  MILESTONE_DESCRIPTION_MAX_LENGTH,
  validateMilestoneName,
  validateMilestoneDescription,
  validateMilestoneDate,
} from '@/types/milestone';
import { Loader2 } from 'lucide-react';

export interface MilestoneFormData {
  name: string;
  description: string;
  status: MilestoneStatus;
  startDate: string;
  dueDate: string;
}

interface MilestoneFormProps {
  initialData?: Milestone;
  onSubmit: (data: MilestoneFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function MilestoneForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: MilestoneFormProps) {
  const [formData, setFormData] = useState<MilestoneFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    status: initialData?.status || MILESTONE_STATUS.PLANNED,
    startDate: initialData?.startDate || '',
    dueDate: initialData?.dueDate || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const nameResult = validateMilestoneName(formData.name);
    if (!nameResult.valid) {
      newErrors.name = nameResult.error!;
    }

    const descResult = validateMilestoneDescription(formData.description || null);
    if (!descResult.valid) {
      newErrors.description = descResult.error!;
    }

    if (formData.startDate) {
      const startResult = validateMilestoneDate(formData.startDate);
      if (!startResult.valid) {
        newErrors.startDate = startResult.error!;
      }
    }

    if (formData.dueDate) {
      const dueResult = validateMilestoneDate(formData.dueDate);
      if (!dueResult.valid) {
        newErrors.dueDate = dueResult.error!;
      }
    }

    // Check start date is before due date
    if (formData.startDate && formData.dueDate) {
      const start = new Date(formData.startDate);
      const due = new Date(formData.dueDate);
      if (start > due) {
        newErrors.dueDate = '期限日は開始日より後にしてください。';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit(formData);
  };

  const handleChange = (field: keyof MilestoneFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          マイルストーン名 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="例: Sprint 1"
          maxLength={MILESTONE_NAME_MAX_LENGTH}
          disabled={isSubmitting}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          {errors.name ? <span className="text-destructive">{errors.name}</span> : <span />}
          <span>
            {formData.name.length}/{MILESTONE_NAME_MAX_LENGTH}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="マイルストーンの説明を入力..."
          rows={3}
          maxLength={MILESTONE_DESCRIPTION_MAX_LENGTH}
          disabled={isSubmitting}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          {errors.description ? (
            <span className="text-destructive">{errors.description}</span>
          ) : (
            <span />
          )}
          <span>
            {formData.description.length}/{MILESTONE_DESCRIPTION_MAX_LENGTH}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="status">ステータス</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => handleChange('status', value as MilestoneStatus)}
          disabled={isSubmitting}
        >
          <SelectTrigger id="status">
            <SelectValue placeholder="ステータスを選択" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(MILESTONE_STATUS_LABELS) as [MilestoneStatus, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">開始日</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            disabled={isSubmitting}
          />
          {errors.startDate && <span className="text-xs text-destructive">{errors.startDate}</span>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">期限日</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => handleChange('dueDate', e.target.value)}
            disabled={isSubmitting}
          />
          {errors.dueDate && <span className="text-xs text-destructive">{errors.dueDate}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {initialData ? '更新' : '作成'}
        </Button>
      </div>
    </form>
  );
}
