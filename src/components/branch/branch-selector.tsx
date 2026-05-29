'use client';

/**
 * Branch Selector Component
 *
 * ブランチ選択ドロップダウン
 */

import { GitBranch, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Branch, BranchType, getBranchTypeLabel } from '@/types/branch';

interface BranchSelectorProps {
  branches: Branch[];
  selectedBranchId?: string;
  onSelect: (branchId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function BranchSelector({
  branches,
  selectedBranchId,
  onSelect,
  placeholder = 'ブランチを選択',
  disabled,
  className,
}: BranchSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  // ブランチをタイプ別にグループ化
  const groupedBranches = branches.reduce(
    (acc, branch) => {
      const type = branch.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(branch);
      return acc;
    },
    {} as Record<BranchType, Branch[]>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn('justify-between', className)}
          >
            <span className="flex items-center gap-2 truncate">
              <GitBranch className="h-4 w-4 shrink-0" />
              {selectedBranch ? (
                <>
                  <span className="truncate">{selectedBranch.name}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {getBranchTypeLabel(selectedBranch.type)}
                  </Badge>
                </>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="ブランチを検索..." />
          <CommandList>
            <CommandEmpty>ブランチが見つかりません</CommandEmpty>
            {Object.entries(groupedBranches).map(([type, branchList]) => (
              <CommandGroup key={type} heading={getBranchTypeLabel(type as BranchType)}>
                {branchList.map((branch) => (
                  <CommandItem
                    key={branch.id}
                    value={branch.name}
                    onSelect={() => {
                      onSelect(branch.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedBranchId === branch.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <GitBranch className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{branch.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default BranchSelector;
