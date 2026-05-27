'use client';
'use no memo';

/**
 * Matrix Expand Dialog
 *
 * マトリクスからテストケースを展開するダイアログ
 */

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Expand,
  Loader2,
  Grid3X3,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MatrixDefinition,
  MatrixExpansionStrategy,
  MatrixCell,
  getExpansionStrategyLabel,
  getCellValueLabel,
  getCellValueColor,
  generateTestCaseTitle,
  DEFAULT_TITLE_TEMPLATE,
} from '@/types/matrix';

interface MatrixExpandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matrix: MatrixDefinition | null;
  onExpand: (options: ExpandOptions) => Promise<void>;
}

interface ExpandOptions {
  strategy: MatrixExpansionStrategy;
  selectedCells?: { rowIndex: number; columnIndex: number }[];
  titleTemplate: string;
  createTestCases: boolean;
}

const STRATEGIES: { value: MatrixExpansionStrategy; icon: React.ReactNode }[] = [
  {
    value: 'YES_CELLS_ONLY',
    icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  },
  {
    value: 'NON_EMPTY_CELLS',
    icon: <MinusCircle className="h-4 w-4 text-blue-500" />,
  },
  {
    value: 'ALL_COMBINATIONS',
    icon: <Grid3X3 className="h-4 w-4 text-purple-500" />,
  },
  {
    value: 'MANUAL_SELECTION',
    icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  },
];

export function MatrixExpandDialog({
  open,
  onOpenChange,
  matrix,
  onExpand,
}: MatrixExpandDialogProps) {
  const [strategy, setStrategy] = useState<MatrixExpansionStrategy>('YES_CELLS_ONLY');
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [titleTemplate, setTitleTemplate] = useState(DEFAULT_TITLE_TEMPLATE);
  const [createTestCases, setCreateTestCases] = useState(true);
  const [expanding, setExpanding] = useState(false);

  // 展開対象のセルを計算
  const targetCells = useMemo(() => {
    if (!matrix) return [];

    const cells: { rowIndex: number; columnIndex: number; cell: MatrixCell }[] = [];

    for (let ri = 0; ri < matrix.cells.length; ri++) {
      for (let ci = 0; ci < matrix.cells[ri].length; ci++) {
        const cell = matrix.cells[ri][ci];
        let include = false;

        switch (strategy) {
          case 'ALL_COMBINATIONS':
            include = true;
            break;
          case 'YES_CELLS_ONLY':
            include = cell.value === 'YES';
            break;
          case 'NON_EMPTY_CELLS':
            include = cell.value !== 'EMPTY';
            break;
          case 'MANUAL_SELECTION':
            include = selectedCells.has(`${ri}-${ci}`);
            break;
        }

        if (include) {
          cells.push({ rowIndex: ri, columnIndex: ci, cell });
        }
      }
    }

    return cells;
  }, [matrix, strategy, selectedCells]);

  // 全選択/全解除
  const toggleAllCells = useCallback(() => {
    if (!matrix) return;

    if (selectedCells.size === matrix.cells.length * matrix.cells[0]?.length) {
      setSelectedCells(new Set());
    } else {
      const all = new Set<string>();
      for (let ri = 0; ri < matrix.cells.length; ri++) {
        for (let ci = 0; ci < matrix.cells[ri].length; ci++) {
          all.add(`${ri}-${ci}`);
        }
      }
      setSelectedCells(all);
    }
  }, [matrix, selectedCells]);

  // セル選択をトグル
  const toggleCell = useCallback((rowIndex: number, colIndex: number) => {
    const key = `${rowIndex}-${colIndex}`;
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // 展開実行
  const handleExpand = async () => {
    setExpanding(true);
    try {
      await onExpand({
        strategy,
        selectedCells:
          strategy === 'MANUAL_SELECTION'
            ? Array.from(selectedCells).map((key) => {
                const [ri, ci] = key.split('-').map(Number);
                return { rowIndex: ri, columnIndex: ci };
              })
            : undefined,
        titleTemplate,
        createTestCases,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to expand matrix:', error);
    } finally {
      setExpanding(false);
    }
  };

  if (!matrix) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Expand className="h-5 w-5" />
            テストケースを展開
          </DialogTitle>
          <DialogDescription>マトリクスからテストケースを生成します</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6 py-4">
          {/* 展開戦略 */}
          <div className="space-y-3">
            <Label>展開戦略</Label>
            <RadioGroup
              value={strategy}
              onValueChange={(v) => setStrategy(v as MatrixExpansionStrategy)}
            >
              <div className="grid grid-cols-2 gap-3">
                {STRATEGIES.map((s) => (
                  <label
                    key={s.value}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      strategy === s.value ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                    )}
                  >
                    <RadioGroupItem value={s.value} />
                    {s.icon}
                    <span className="text-sm font-medium">
                      {getExpansionStrategyLabel(s.value)}
                    </span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* 手動選択モード */}
          {strategy === 'MANUAL_SELECTION' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>セルを選択</Label>
                <Button variant="outline" size="sm" onClick={toggleAllCells}>
                  {selectedCells.size === matrix.cells.length * (matrix.cells[0]?.length || 0)
                    ? '全解除'
                    : '全選択'}
                </Button>
              </div>
              <Card>
                <CardContent className="p-3">
                  <ScrollArea className="h-[200px]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="sticky left-0 top-0 bg-muted p-2 text-left">
                            {matrix.rowAxis.name} / {matrix.columnAxis.name}
                          </th>
                          {matrix.columnAxis.items.map((item) => (
                            <th key={item.id} className="sticky top-0 bg-muted p-2 text-center">
                              {item.value}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {matrix.rowAxis.items.map((rowItem, ri) => (
                          <tr key={rowItem.id}>
                            <td className="sticky left-0 bg-muted p-2 font-medium">
                              {rowItem.value}
                            </td>
                            {matrix.cells[ri]?.map((cell, ci) => (
                              <td key={`${ri}-${ci}`} className="p-1 text-center">
                                <div
                                  className={cn(
                                    'flex items-center justify-center gap-1 p-2 rounded cursor-pointer transition-colors',
                                    selectedCells.has(`${ri}-${ci}`)
                                      ? 'bg-primary/20 ring-2 ring-primary'
                                      : 'hover:bg-accent'
                                  )}
                                  style={{
                                    backgroundColor: selectedCells.has(`${ri}-${ci}`)
                                      ? undefined
                                      : getCellValueColor(cell.value) + '30',
                                  }}
                                  onClick={() => toggleCell(ri, ci)}
                                >
                                  <Checkbox
                                    checked={selectedCells.has(`${ri}-${ci}`)}
                                    onCheckedChange={() => toggleCell(ri, ci)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span className="text-xs">{getCellValueLabel(cell.value)}</span>
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {/* タイトルテンプレート */}
          <div className="space-y-3">
            <Label>タイトルテンプレート</Label>
            <Input
              value={titleTemplate}
              onChange={(e) => setTitleTemplate(e.target.value)}
              placeholder="{row} × {column}"
            />
            <p className="text-xs text-muted-foreground">
              使用可能な変数: {'{row}'} (行名), {'{column}'} (列名), {'{matrix}'} (マトリクス名)
            </p>
            {targetCells.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">プレビュー:</p>
                <p className="text-sm font-medium">
                  {generateTestCaseTitle(
                    titleTemplate,
                    matrix.rowAxis.items[targetCells[0].rowIndex],
                    matrix.columnAxis.items[targetCells[0].columnIndex],
                    matrix.name
                  )}
                </p>
              </div>
            )}
          </div>

          {/* オプション */}
          <div className="space-y-3">
            <Label>オプション</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="createTestCases"
                checked={createTestCases}
                onCheckedChange={(v) => setCreateTestCases(v === true)}
              />
              <label htmlFor="createTestCases" className="text-sm">
                実際のテストケースを作成する
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              オフの場合、展開リストのみが作成されます
            </p>
          </div>

          {/* 展開プレビュー */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>展開プレビュー</Label>
              <Badge variant="secondary">{targetCells.length}件</Badge>
            </div>
            <Card>
              <CardContent className="p-3">
                <ScrollArea className="h-[150px]">
                  {targetCells.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <XCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">展開対象のセルがありません</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {targetCells.slice(0, 10).map(({ rowIndex, columnIndex, cell }) => (
                        <div
                          key={`${rowIndex}-${columnIndex}`}
                          className="flex items-center justify-between p-2 rounded bg-muted/50"
                        >
                          <span className="text-sm">
                            {generateTestCaseTitle(
                              titleTemplate,
                              matrix.rowAxis.items[rowIndex],
                              matrix.columnAxis.items[columnIndex],
                              matrix.name
                            )}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{
                              backgroundColor: getCellValueColor(cell.value) + '30',
                            }}
                          >
                            {getCellValueLabel(cell.value)}
                          </Badge>
                        </div>
                      ))}
                      {targetCells.length > 10 && (
                        <p className="text-xs text-center text-muted-foreground py-2">
                          ... 他 {targetCells.length - 10} 件
                        </p>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleExpand} disabled={targetCells.length === 0 || expanding}>
            {expanding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {targetCells.length}件を展開
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MatrixExpandDialog;
