'use client';

/**
 * Custom Field Renderer Component
 *
 * カスタムフィールドの動的レンダリングコンポーネント
 */

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CustomFieldType,
  CustomFieldDefinitionWithDetails,
  CustomFieldValueData,
  CustomFieldOption,
} from '@/types/custom-field';

// ========================================
// Types
// ========================================

export interface CustomFieldRendererProps {
  definition: CustomFieldDefinitionWithDetails;
  value: CustomFieldValueData;
  onChange: (value: CustomFieldValueData) => void;
  disabled?: boolean;
  error?: string;
}

export interface CustomFieldDisplayProps {
  definition: CustomFieldDefinitionWithDetails;
  value: CustomFieldValueData;
}

// ========================================
// Main Renderer Component
// ========================================

export function CustomFieldRenderer({
  definition,
  value,
  onChange,
  disabled = false,
  error,
}: CustomFieldRendererProps) {
  const fieldType = definition.fieldType as CustomFieldType;

  return (
    <div className="space-y-2">
      <Label
        htmlFor={`field-${definition.id}`}
        className={cn(
          definition.isRequired && "after:content-['*'] after:ml-0.5 after:text-red-500"
        )}
      >
        {definition.displayName}
      </Label>

      {renderField(fieldType, definition, value, onChange, disabled)}

      {definition.description && (
        <p className="text-xs text-muted-foreground">{definition.description}</p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ========================================
// Field Renderers
// ========================================

function renderField(
  fieldType: CustomFieldType,
  definition: CustomFieldDefinitionWithDetails,
  value: CustomFieldValueData,
  onChange: (value: CustomFieldValueData) => void,
  disabled: boolean
) {
  switch (fieldType) {
    case 'TEXT':
      return (
        <TextFieldRenderer
          definition={definition}
          value={value as string}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'NUMBER':
      return (
        <NumberFieldRenderer
          definition={definition}
          value={value as number}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'DATE':
      return (
        <DateFieldRenderer
          definition={definition}
          value={value as Date}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'SELECT_SINGLE':
      return (
        <SelectSingleRenderer
          definition={definition}
          value={value as string}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'SELECT_MULTI':
      return (
        <SelectMultiRenderer
          definition={definition}
          value={value as string[]}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'CHECKBOX':
      return (
        <CheckboxRenderer
          definition={definition}
          value={value as boolean}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'URL':
      return (
        <UrlFieldRenderer
          definition={definition}
          value={value as string}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'EMAIL':
      return (
        <EmailFieldRenderer
          definition={definition}
          value={value as string}
          onChange={onChange}
          disabled={disabled}
        />
      );
    default:
      return (
        <Input
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
  }
}

// ========================================
// Individual Field Renderers
// ========================================

interface FieldProps<T> {
  definition: CustomFieldDefinitionWithDetails;
  value: T;
  onChange: (value: CustomFieldValueData) => void;
  disabled: boolean;
}

function TextFieldRenderer({ definition, value, onChange, disabled }: FieldProps<string>) {
  return (
    <Input
      id={`field-${definition.id}`}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={definition.displayName}
    />
  );
}

function NumberFieldRenderer({ definition, value, onChange, disabled }: FieldProps<number>) {
  const rules = definition.validationRules as { min?: number; max?: number } | null;

  return (
    <Input
      id={`field-${definition.id}`}
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
      disabled={disabled}
      min={rules?.min}
      max={rules?.max}
      placeholder={definition.displayName}
    />
  );
}

function DateFieldRenderer({ definition, value, onChange, disabled }: FieldProps<Date>) {
  const [open, setOpen] = useState(false);
  const dateValue = value ? new Date(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={`field-${definition.id}`}
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !dateValue && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue ? format(dateValue, 'PPP', { locale: ja }) : '日付を選択'}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(date) => {
            onChange(date ?? null);
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function SelectSingleRenderer({ definition, value, onChange, disabled }: FieldProps<string>) {
  const options = (definition.options as CustomFieldOption[]) ?? [];

  return (
    <Select value={value ?? ''} onValueChange={(v) => onChange(v || null)} disabled={disabled}>
      <SelectTrigger id={`field-${definition.id}`}>
        <SelectValue placeholder="選択してください" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.value}>
            <div className="flex items-center gap-2">
              {option.color && (
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: option.color }} />
              )}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SelectMultiRenderer({ definition, value, onChange, disabled }: FieldProps<string[]>) {
  const options = (definition.options as CustomFieldOption[]) ?? [];
  const selectedValues = value ?? [];

  const handleToggle = useCallback(
    (optionValue: string) => {
      if (selectedValues.includes(optionValue)) {
        onChange(selectedValues.filter((v) => v !== optionValue));
      } else {
        onChange([...selectedValues, optionValue]);
      }
    },
    [selectedValues, onChange]
  );

  return (
    <div className="space-y-2">
      {options.map((option) => (
        <div key={option.id} className="flex items-center space-x-2">
          <Checkbox
            id={`field-${definition.id}-${option.id}`}
            checked={selectedValues.includes(option.value)}
            onCheckedChange={() => handleToggle(option.value)}
            disabled={disabled}
          />
          <Label
            htmlFor={`field-${definition.id}-${option.id}`}
            className="flex items-center gap-2 font-normal cursor-pointer"
          >
            {option.color && (
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: option.color }} />
            )}
            <span>{option.label}</span>
          </Label>
        </div>
      ))}
    </div>
  );
}

function CheckboxRenderer({ definition, value, onChange, disabled }: FieldProps<boolean>) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={`field-${definition.id}`}
        checked={value ?? false}
        onCheckedChange={(checked) => onChange(checked === true)}
        disabled={disabled}
      />
      <Label htmlFor={`field-${definition.id}`} className="font-normal cursor-pointer">
        {definition.displayName}
      </Label>
    </div>
  );
}

function UrlFieldRenderer({ definition, value, onChange, disabled }: FieldProps<string>) {
  return (
    <div className="flex gap-2">
      <Input
        id={`field-${definition.id}`}
        type="url"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="https://example.com"
        className="flex-1"
      />
      {value && (
        <a href={value} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="outline" size="icon">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      )}
    </div>
  );
}

function EmailFieldRenderer({ definition, value, onChange, disabled }: FieldProps<string>) {
  return (
    <Input
      id={`field-${definition.id}`}
      type="email"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="example@example.com"
    />
  );
}

// ========================================
// Display Component (Read-only)
// ========================================

export function CustomFieldDisplay({ definition, value }: CustomFieldDisplayProps) {
  const fieldType = definition.fieldType as CustomFieldType;

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{definition.displayName}</Label>
      <div className="text-sm">{renderDisplayValue(fieldType, definition, value)}</div>
    </div>
  );
}

function renderDisplayValue(
  fieldType: CustomFieldType,
  definition: CustomFieldDefinitionWithDetails,
  value: CustomFieldValueData
): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  switch (fieldType) {
    case 'TEXT':
    case 'EMAIL':
      return <span>{String(value)}</span>;

    case 'NUMBER':
      return <span>{Number(value).toLocaleString()}</span>;

    case 'DATE':
      return <span>{format(new Date(value as Date), 'PPP', { locale: ja })}</span>;

    case 'SELECT_SINGLE': {
      const options = (definition.options as CustomFieldOption[]) ?? [];
      const option = options.find((o) => o.value === value);
      return option ? (
        <Badge
          variant="secondary"
          style={option.color ? { backgroundColor: option.color, color: '#fff' } : undefined}
        >
          {option.label}
        </Badge>
      ) : (
        <span>{String(value)}</span>
      );
    }

    case 'SELECT_MULTI': {
      const options = (definition.options as CustomFieldOption[]) ?? [];
      const selectedValues = value as string[];
      return (
        <div className="flex flex-wrap gap-1">
          {selectedValues.map((v) => {
            const option = options.find((o) => o.value === v);
            return (
              <Badge
                key={v}
                variant="secondary"
                style={option?.color ? { backgroundColor: option.color, color: '#fff' } : undefined}
              >
                {option?.label ?? v}
              </Badge>
            );
          })}
        </div>
      );
    }

    case 'CHECKBOX':
      return <span>{value ? 'はい' : 'いいえ'}</span>;

    case 'URL':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline flex items-center gap-1"
        >
          {String(value)}
          <ExternalLink className="h-3 w-3" />
        </a>
      );

    default:
      return <span>{String(value)}</span>;
  }
}
