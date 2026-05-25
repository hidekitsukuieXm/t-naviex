'use client';

import { useState, useCallback, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagBadge } from './tag-badge';
import { cn } from '@/lib/utils';
import type { Tag, TestCaseTagInfo } from '@/types/tag';

interface TagInputProps {
  projectId: string;
  selectedTags: TestCaseTagInfo[];
  availableTags: Tag[];
  onTagsChange: (tags: TestCaseTagInfo[]) => void;
  onCreateTag?: (name: string) => Promise<Tag | null>;
  disabled?: boolean;
  className?: string;
}

export function TagInput({
  selectedTags,
  availableTags,
  onTagsChange,
  onCreateTag,
  disabled = false,
  className,
}: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedTagIds = useMemo(() => new Set(selectedTags.map((t) => t.id)), [selectedTags]);

  const filteredTags = useMemo(() => {
    if (!search) return availableTags;
    const lowerSearch = search.toLowerCase();
    return availableTags.filter((tag) => tag.name.toLowerCase().includes(lowerSearch));
  }, [availableTags, search]);

  const canCreateTag = useMemo(() => {
    if (!search || !onCreateTag) return false;
    const trimmed = search.trim();
    if (trimmed.length === 0) return false;
    // Check if exact match already exists
    return !availableTags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase());
  }, [search, availableTags, onCreateTag]);

  const handleSelect = useCallback(
    (tag: Tag) => {
      const isSelected = selectedTagIds.has(tag.id);
      if (isSelected) {
        onTagsChange(selectedTags.filter((t) => t.id !== tag.id));
      } else {
        onTagsChange([...selectedTags, { id: tag.id, name: tag.name, color: tag.color }]);
      }
    },
    [selectedTags, selectedTagIds, onTagsChange]
  );

  const handleRemove = useCallback(
    (tagId: string) => {
      onTagsChange(selectedTags.filter((t) => t.id !== tagId));
    },
    [selectedTags, onTagsChange]
  );

  const handleCreate = useCallback(async () => {
    if (!onCreateTag || !canCreateTag) return;

    setIsCreating(true);
    try {
      const newTag = await onCreateTag(search.trim());
      if (newTag) {
        onTagsChange([...selectedTags, { id: newTag.id, name: newTag.name, color: newTag.color }]);
        setSearch('');
      }
    } finally {
      setIsCreating(false);
    }
  }, [onCreateTag, canCreateTag, search, selectedTags, onTagsChange]);

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          role="combobox"
          aria-expanded={open}
          className="inline-flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
        >
          <span className="text-muted-foreground">タグを選択...</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="タグを検索..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>
                {canCreateTag ? (
                  <button
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={handleCreate}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    「{search}」を作成
                  </button>
                ) : (
                  'タグが見つかりません。'
                )}
              </CommandEmpty>
              <CommandGroup>
                {filteredTags.map((tag) => (
                  <CommandItem key={tag.id} value={tag.id} onSelect={() => handleSelect(tag)}>
                    <Check
                      className={cn(
                        'mr-2 size-4',
                        selectedTagIds.has(tag.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span
                      className="mr-2 size-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              {canCreateTag && filteredTags.length > 0 && (
                <CommandGroup>
                  <CommandItem onSelect={handleCreate} disabled={isCreating}>
                    {isCreating ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 size-4" />
                    )}
                    「{search}」を作成
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              name={tag.name}
              color={tag.color}
              onRemove={disabled ? undefined : () => handleRemove(tag.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
