'use client';
'use no memo';

/**
 * Matrix Editor Component
 *
 * マトリクス形式テストケースの編集UI
 */

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Download,
  Upload,
  Grid3X3,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Save,
  Expand,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MatrixDefinition,
  MatrixAxisItem,
  MatrixCell,
  MatrixCellValue,
  getCellValueLabel,
  getCellValueColor,
  calculateMatrixStats,
} from '@/types/matrix';

interface MatrixEditorProps {
  matrix: MatrixDefinition | null;
  onChange: (matrix: MatrixDefinition) => void;
  onSave?: () => Promise<void>;
  onExpand?: () => void;
  onExportCsv?: () => void;
  onImportExcel?: (file: File) => void;
  readOnly?: boolean;
  className?: string;
}

const CELL_VALUES: MatrixCellValue[] = ['EMPTY', 'YES', 'NO', 'NA', 'PASS', 'FAIL', 'PENDING'];

export function MatrixEditor({
  matrix,
  onChange,
  onSave,
  onExpand,
  onExportCsv,
  onImportExcel,
  readOnly = false,
  className,
}: MatrixEditorProps) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingHeader, setEditingHeader] = useState<{
    type: 'row' | 'column';
    index: number;
  } | null>(null);
  const [editingAxisName, setEditingAxisName] = useState<'row' | 'column' | null>(null);
  const [showCellDialog, setShowCellDialog] = useState(false);
  const [cellNotes, setCellNotes] = useState('');
  const [showStats, setShowStats] = useState(true);

  // 統計計算
  const stats = useMemo(() => (matrix ? calculateMatrixStats(matrix) : null), [matrix]);

  // セル値を更新
  const updateCellValue = useCallback(
    (rowIndex: number, colIndex: number, value: MatrixCellValue) => {
      if (!matrix || readOnly) return;

      const newCells = matrix.cells.map((row, ri) =>
        row.map((cell, ci) => (ri === rowIndex && ci === colIndex ? { ...cell, value } : cell))
      );

      onChange({
        ...matrix,
        cells: newCells,
        updatedAt: new Date(),
      });
    },
    [matrix, onChange, readOnly]
  );

  // セルノートを更新
  const updateCellNotes = useCallback(
    (rowIndex: number, colIndex: number, notes: string) => {
      if (!matrix || readOnly) return;

      const newCells = matrix.cells.map((row, ri) =>
        row.map((cell, ci) => (ri === rowIndex && ci === colIndex ? { ...cell, notes } : cell))
      );

      onChange({
        ...matrix,
        cells: newCells,
        updatedAt: new Date(),
      });
    },
    [matrix, onChange, readOnly]
  );

  // 行を追加
  const addRow = useCallback(() => {
    if (!matrix || readOnly) return;

    const newRowItem: MatrixAxisItem = {
      id: `row_${Date.now()}`,
      value: `行 ${matrix.rowAxis.items.length + 1}`,
      sortOrder: matrix.rowAxis.items.length,
    };

    const newRowCells: MatrixCell[] = matrix.columnAxis.items.map((_, colIndex) => ({
      rowIndex: matrix.rowAxis.items.length,
      columnIndex: colIndex,
      value: 'EMPTY' as MatrixCellValue,
    }));

    onChange({
      ...matrix,
      rowAxis: {
        ...matrix.rowAxis,
        items: [...matrix.rowAxis.items, newRowItem],
      },
      cells: [...matrix.cells, newRowCells],
      updatedAt: new Date(),
    });
  }, [matrix, onChange, readOnly]);

  // 列を追加
  const addColumn = useCallback(() => {
    if (!matrix || readOnly) return;

    const newColItem: MatrixAxisItem = {
      id: `col_${Date.now()}`,
      value: `列 ${matrix.columnAxis.items.length + 1}`,
      sortOrder: matrix.columnAxis.items.length,
    };

    const newCells = matrix.cells.map((row, rowIndex) => [
      ...row,
      {
        rowIndex,
        columnIndex: matrix.columnAxis.items.length,
        value: 'EMPTY' as MatrixCellValue,
      },
    ]);

    onChange({
      ...matrix,
      columnAxis: {
        ...matrix.columnAxis,
        items: [...matrix.columnAxis.items, newColItem],
      },
      cells: newCells,
      updatedAt: new Date(),
    });
  }, [matrix, onChange, readOnly]);

  // 行を削除
  const removeRow = useCallback(
    (index: number) => {
      if (!matrix || readOnly || matrix.rowAxis.items.length <= 1) return;

      onChange({
        ...matrix,
        rowAxis: {
          ...matrix.rowAxis,
          items: matrix.rowAxis.items.filter((_, i) => i !== index),
        },
        cells: matrix.cells.filter((_, i) => i !== index),
        updatedAt: new Date(),
      });
    },
    [matrix, onChange, readOnly]
  );

  // 列を削除
  const removeColumn = useCallback(
    (index: number) => {
      if (!matrix || readOnly || matrix.columnAxis.items.length <= 1) return;

      onChange({
        ...matrix,
        columnAxis: {
          ...matrix.columnAxis,
          items: matrix.columnAxis.items.filter((_, i) => i !== index),
        },
        cells: matrix.cells.map((row) => row.filter((_, i) => i !== index)),
        updatedAt: new Date(),
      });
    },
    [matrix, onChange, readOnly]
  );

  // 行ヘッダーを更新
  const updateRowHeader = useCallback(
    (index: number, value: string) => {
      if (!matrix || readOnly) return;

      onChange({
        ...matrix,
        rowAxis: {
          ...matrix.rowAxis,
          items: matrix.rowAxis.items.map((item, i) => (i === index ? { ...item, value } : item)),
        },
        updatedAt: new Date(),
      });
    },
    [matrix, onChange, readOnly]
  );

  // 列ヘッダーを更新
  const updateColumnHeader = useCallback(
    (index: number, value: string) => {
      if (!matrix || readOnly) return;

      onChange({
        ...matrix,
        columnAxis: {
          ...matrix.columnAxis,
          items: matrix.columnAxis.items.map((item, i) =>
            i === index ? { ...item, value } : item
          ),
        },
        updatedAt: new Date(),
      });
    },
    [matrix, onChange, readOnly]
  );

  // 軸名を更新
  const updateAxisName = useCallback(
    (type: 'row' | 'column', name: string) => {
      if (!matrix || readOnly) return;

      if (type === 'row') {
        onChange({
          ...matrix,
          rowAxis: { ...matrix.rowAxis, name },
          updatedAt: new Date(),
        });
      } else {
        onChange({
          ...matrix,
          columnAxis: { ...matrix.columnAxis, name },
          updatedAt: new Date(),
        });
      }
    },
    [matrix, onChange, readOnly]
  );

  // セルダイアログを開く
  const openCellDialog = useCallback(
    (rowIndex: number, colIndex: number) => {
      if (!matrix) return;
      setSelectedCell({ row: rowIndex, col: colIndex });
      setCellNotes(matrix.cells[rowIndex]?.[colIndex]?.notes || '');
      setShowCellDialog(true);
    },
    [matrix]
  );

  // セルダイアログを保存
  const saveCellDialog = useCallback(() => {
    if (selectedCell) {
      updateCellNotes(selectedCell.row, selectedCell.col, cellNotes);
    }
    setShowCellDialog(false);
    setSelectedCell(null);
  }, [selectedCell, cellNotes, updateCellNotes]);

  // ファイルインポート
  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onImportExcel) {
        onImportExcel(file);
      }
      e.target.value = '';
    },
    [onImportExcel]
  );

  if (!matrix) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Grid3X3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>マトリクスが設定されていません</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              {matrix.name}
            </CardTitle>
            {matrix.description && (
              <CardDescription className="mt-1">{matrix.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 統計トグル */}
            <Button variant="ghost" size="sm" onClick={() => setShowStats(!showStats)}>
              {showStats ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              統計
            </Button>

            {/* アクションメニュー */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!readOnly && (
                  <>
                    <DropdownMenuItem onClick={addRow}>
                      <Plus className="h-4 w-4 mr-2" />
                      行を追加
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={addColumn}>
                      <Plus className="h-4 w-4 mr-2" />
                      列を追加
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {onExportCsv && (
                  <DropdownMenuItem onClick={onExportCsv}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV出力
                  </DropdownMenuItem>
                )}
                {onImportExcel && !readOnly && (
                  <DropdownMenuItem
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.xlsx,.xls';
                      input.onchange = (e) =>
                        handleFileImport(e as unknown as React.ChangeEvent<HTMLInputElement>);
                      input.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Excelインポート
                  </DropdownMenuItem>
                )}
                {onExpand && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onExpand}>
                      <Expand className="h-4 w-4 mr-2" />
                      テストケース展開
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {onSave && !readOnly && (
              <Button size="sm" onClick={onSave}>
                <Save className="h-4 w-4 mr-2" />
                保存
              </Button>
            )}
          </div>
        </div>

        {/* 統計パネル */}
        {showStats && stats && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
            <Badge variant="outline">全{stats.totalCells}セル</Badge>
            {stats.yesCells > 0 && (
              <Badge className="bg-green-500/10 text-green-600 border-green-200">
                YES: {stats.yesCells}
              </Badge>
            )}
            {stats.noCells > 0 && (
              <Badge className="bg-red-500/10 text-red-600 border-red-200">
                NO: {stats.noCells}
              </Badge>
            )}
            {stats.naCells > 0 && (
              <Badge className="bg-gray-500/10 text-gray-600 border-gray-200">
                N/A: {stats.naCells}
              </Badge>
            )}
            {stats.passedCells > 0 && (
              <Badge className="bg-green-500/10 text-green-600 border-green-200">
                合格: {stats.passedCells}
              </Badge>
            )}
            {stats.failedCells > 0 && (
              <Badge className="bg-red-500/10 text-red-600 border-red-200">
                不合格: {stats.failedCells}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {/* 左上コーナー（軸名） */}
                <th className="sticky left-0 top-0 z-20 bg-muted border-b border-r p-2 min-w-[120px]">
                  <div className="flex flex-col gap-1">
                    {editingAxisName === 'row' ? (
                      <Input
                        value={matrix.rowAxis.name}
                        onChange={(e) => updateAxisName('row', e.target.value)}
                        onBlur={() => setEditingAxisName(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingAxisName(null)}
                        autoFocus
                        className="h-6 text-xs"
                      />
                    ) : (
                      <span
                        className="text-xs font-medium cursor-pointer hover:text-primary"
                        onClick={() => !readOnly && setEditingAxisName('row')}
                      >
                        {matrix.rowAxis.name} ↓
                      </span>
                    )}
                    {editingAxisName === 'column' ? (
                      <Input
                        value={matrix.columnAxis.name}
                        onChange={(e) => updateAxisName('column', e.target.value)}
                        onBlur={() => setEditingAxisName(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingAxisName(null)}
                        autoFocus
                        className="h-6 text-xs"
                      />
                    ) : (
                      <span
                        className="text-xs font-medium cursor-pointer hover:text-primary"
                        onClick={() => !readOnly && setEditingAxisName('column')}
                      >
                        {matrix.columnAxis.name} →
                      </span>
                    )}
                  </div>
                </th>

                {/* 列ヘッダー */}
                {matrix.columnAxis.items.map((item, colIndex) => (
                  <th
                    key={item.id}
                    className="sticky top-0 z-10 bg-muted border-b p-2 min-w-[100px]"
                  >
                    <div className="flex items-center justify-between gap-1">
                      {editingHeader?.type === 'column' && editingHeader.index === colIndex ? (
                        <Input
                          value={item.value}
                          onChange={(e) => updateColumnHeader(colIndex, e.target.value)}
                          onBlur={() => setEditingHeader(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingHeader(null)}
                          autoFocus
                          className="h-7 text-sm"
                        />
                      ) : (
                        <span
                          className="text-sm font-medium cursor-pointer hover:text-primary truncate"
                          onClick={() =>
                            !readOnly && setEditingHeader({ type: 'column', index: colIndex })
                          }
                          title={item.value}
                        >
                          {item.value}
                        </span>
                      )}
                      {!readOnly && matrix.columnAxis.items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-50 hover:opacity-100"
                          onClick={() => removeColumn(colIndex)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </th>
                ))}

                {/* 列追加ボタン */}
                {!readOnly && (
                  <th className="sticky top-0 z-10 bg-muted border-b p-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={addColumn}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {matrix.rowAxis.items.map((rowItem, rowIndex) => (
                <tr key={rowItem.id}>
                  {/* 行ヘッダー */}
                  <th className="sticky left-0 z-10 bg-muted border-r p-2">
                    <div className="flex items-center justify-between gap-1">
                      {editingHeader?.type === 'row' && editingHeader.index === rowIndex ? (
                        <Input
                          value={rowItem.value}
                          onChange={(e) => updateRowHeader(rowIndex, e.target.value)}
                          onBlur={() => setEditingHeader(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingHeader(null)}
                          autoFocus
                          className="h-7 text-sm"
                        />
                      ) : (
                        <span
                          className="text-sm font-medium cursor-pointer hover:text-primary truncate"
                          onClick={() =>
                            !readOnly && setEditingHeader({ type: 'row', index: rowIndex })
                          }
                          title={rowItem.value}
                        >
                          {rowItem.value}
                        </span>
                      )}
                      {!readOnly && matrix.rowAxis.items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-50 hover:opacity-100"
                          onClick={() => removeRow(rowIndex)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </th>

                  {/* セル */}
                  {matrix.cells[rowIndex]?.map((cell, colIndex) => (
                    <td key={`${rowIndex}-${colIndex}`} className="border p-1 text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative">
                              <Select
                                value={cell.value}
                                onValueChange={(value) =>
                                  updateCellValue(rowIndex, colIndex, value as MatrixCellValue)
                                }
                                disabled={readOnly}
                              >
                                <SelectTrigger
                                  className="h-8 w-full text-xs border-0 focus:ring-0"
                                  style={{
                                    backgroundColor: getCellValueColor(cell.value) + '30',
                                  }}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CELL_VALUES.map((v) => (
                                    <SelectItem key={v} value={v}>
                                      <span className="flex items-center gap-2">
                                        <span
                                          className="w-3 h-3 rounded"
                                          style={{
                                            backgroundColor: getCellValueColor(v),
                                          }}
                                        />
                                        {getCellValueLabel(v)}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {/* ノートインジケーター */}
                              {cell.notes && (
                                <button
                                  className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-bl cursor-pointer"
                                  onClick={() => openCellDialog(rowIndex, colIndex)}
                                />
                              )}
                              {/* 詳細ボタン */}
                              {!readOnly && (
                                <button
                                  className="absolute bottom-0 right-0 opacity-0 hover:opacity-100 transition-opacity p-0.5"
                                  onClick={() => openCellDialog(rowIndex, colIndex)}
                                >
                                  <Settings className="h-3 w-3 text-muted-foreground" />
                                </button>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">
                              {rowItem.value} × {matrix.columnAxis.items[colIndex]?.value}
                            </p>
                            {cell.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{cell.notes}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  ))}

                  {/* 空セル（列追加用） */}
                  {!readOnly && <td className="border p-1" />}
                </tr>
              ))}

              {/* 行追加 */}
              {!readOnly && (
                <tr>
                  <td className="sticky left-0 bg-muted border-r p-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={addRow}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </td>
                  {matrix.columnAxis.items.map((_, colIndex) => (
                    <td key={colIndex} className="border p-1" />
                  ))}
                  <td className="border p-1" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* セル詳細ダイアログ */}
      <Dialog open={showCellDialog} onOpenChange={setShowCellDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>セル詳細</DialogTitle>
          </DialogHeader>
          {selectedCell && matrix.cells[selectedCell.row]?.[selectedCell.col] && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">位置</p>
                <p className="text-sm text-muted-foreground">
                  {matrix.rowAxis.items[selectedCell.row]?.value} ×{' '}
                  {matrix.columnAxis.items[selectedCell.col]?.value}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">値</p>
                <Select
                  value={matrix.cells[selectedCell.row][selectedCell.col].value}
                  onValueChange={(value) =>
                    updateCellValue(selectedCell.row, selectedCell.col, value as MatrixCellValue)
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CELL_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: getCellValueColor(v) }}
                          />
                          {getCellValueLabel(v)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">メモ</p>
                <Textarea
                  value={cellNotes}
                  onChange={(e) => setCellNotes(e.target.value)}
                  placeholder="セルに関するメモを入力..."
                  rows={3}
                  disabled={readOnly}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCellDialog(false)}>
              キャンセル
            </Button>
            {!readOnly && <Button onClick={saveCellDialog}>保存</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default MatrixEditor;
