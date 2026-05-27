'use client';
'use no memo';

/**
 * Combination Result Table Component
 *
 * 生成された組合せの一覧表示
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Download, Search, CheckSquare, Square } from 'lucide-react';
import { Combination, CombinatorialParameter, combinationsToCsv } from '@/types/combinatorial';

interface CombinationResultTableProps {
  combinations: Combination[];
  parameters: CombinatorialParameter[];
  onSelectionChange?: (combinations: Combination[]) => void;
  readOnly?: boolean;
}

export function CombinationResultTable({
  combinations,
  parameters,
  onSelectionChange,
  readOnly,
}: CombinationResultTableProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(combinations.filter((c) => c.isSelected).map((c) => c.id))
  );

  // フィルタリングされた組合せ
  const filteredCombinations = useMemo(() => {
    if (!search) return combinations;

    const searchLower = search.toLowerCase();
    return combinations.filter((combo) =>
      combo.values.some(
        (v) =>
          v.value.toLowerCase().includes(searchLower) ||
          v.parameterName.toLowerCase().includes(searchLower)
      )
    );
  }, [combinations, search]);

  // 選択を切り替え
  const toggleSelection = (comboId: string) => {
    if (readOnly) return;

    const newSelection = new Set(selectedIds);
    if (newSelection.has(comboId)) {
      newSelection.delete(comboId);
    } else {
      newSelection.add(comboId);
    }
    setSelectedIds(newSelection);

    if (onSelectionChange) {
      const updatedCombinations = combinations.map((c) => ({
        ...c,
        isSelected: newSelection.has(c.id),
      }));
      onSelectionChange(updatedCombinations);
    }
  };

  // 全選択/全解除
  const toggleAll = () => {
    if (readOnly) return;

    const allSelected = filteredCombinations.every((c) => selectedIds.has(c.id));
    const newSelection = new Set(selectedIds);

    if (allSelected) {
      filteredCombinations.forEach((c) => newSelection.delete(c.id));
    } else {
      filteredCombinations.forEach((c) => newSelection.add(c.id));
    }

    setSelectedIds(newSelection);

    if (onSelectionChange) {
      const updatedCombinations = combinations.map((c) => ({
        ...c,
        isSelected: newSelection.has(c.id),
      }));
      onSelectionChange(updatedCombinations);
    }
  };

  // CSVエクスポート
  const handleExportCsv = () => {
    const selectedCombinations = combinations.filter((c) => selectedIds.has(c.id));
    const csv = combinationsToCsv(
      selectedCombinations.length > 0 ? selectedCombinations : combinations,
      parameters
    );
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'combinations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const allSelected =
    filteredCombinations.length > 0 && filteredCombinations.every((c) => selectedIds.has(c.id));

  return (
    <div className="space-y-3">
      {/* ツールバー */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="検索..."
              className="pl-8 h-8 w-48"
            />
          </div>

          <Badge variant="secondary">
            {filteredCombinations.length} / {combinations.length} 件
          </Badge>

          {!readOnly && <Badge variant="outline">{selectedIds.size} 件選択中</Badge>}
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <Button type="button" variant="outline" size="sm" onClick={toggleAll}>
              {allSelected ? (
                <>
                  <Square className="h-4 w-4 mr-1" />
                  全解除
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 mr-1" />
                  全選択
                </>
              )}
            </Button>
          )}

          <Button type="button" variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      {/* テーブル */}
      <ScrollArea className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {!readOnly && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    // indeterminate が使えない場合の代替
                    onCheckedChange={() => toggleAll()}
                  />
                </TableHead>
              )}
              <TableHead className="w-12">#</TableHead>
              {parameters.map((param) => (
                <TableHead key={param.id} className="min-w-[100px]">
                  {param.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCombinations.map((combo) => (
              <TableRow key={combo.id} className={selectedIds.has(combo.id) ? 'bg-muted/50' : ''}>
                {!readOnly && (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(combo.id)}
                      onCheckedChange={() => toggleSelection(combo.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {combo.index + 1}
                </TableCell>
                {parameters.map((param) => {
                  const value = combo.values.find((v) => v.parameterId === param.id);
                  return <TableCell key={param.id}>{value?.value || '-'}</TableCell>;
                })}
              </TableRow>
            ))}

            {filteredCombinations.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={parameters.length + (readOnly ? 1 : 2)}
                  className="text-center text-muted-foreground py-8"
                >
                  {search ? '検索結果がありません' : '組合せがありません'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export default CombinationResultTable;
