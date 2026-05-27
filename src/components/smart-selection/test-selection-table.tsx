'use client';
'use no memo';

/**
 * Test Selection Table Component
 *
 * テストケース選択結果テーブル
 */

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Download,
  Search,
  Filter,
} from 'lucide-react';
import {
  TestCaseSelection,
  SelectionSummary,
  SelectionStatus,
  getSelectionStatusLabel,
  getSelectionStatusColor,
  getSelectionReasonLabel,
  formatDuration,
} from '@/types/smart-test-selection';

interface TestSelectionTableProps {
  selections: TestCaseSelection[];
  summary: SelectionSummary;
  onSelectionChange?: (testCaseId: string, status: SelectionStatus) => void;
  onGenerateTestSet?: (selectedIds: string[]) => void;
}

export function TestSelectionTable({
  selections,
  summary,
  onSelectionChange,
  onGenerateTestSet,
}: TestSelectionTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(
      selections.filter((s) => s.status === SelectionStatus.RECOMMENDED).map((s) => s.testCaseId)
    )
  );

  // フィルタリング
  const filteredSelections = useMemo(() => {
    return selections.filter((selection) => {
      // 検索クエリ
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !selection.testCaseName.toLowerCase().includes(query) &&
          !selection.testSpecName?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // ステータスフィルター
      if (statusFilter !== 'all' && selection.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [selections, searchQuery, statusFilter]);

  // 選択切り替え
  const handleToggleSelection = useCallback((testCaseId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(testCaseId)) {
        next.delete(testCaseId);
      } else {
        next.add(testCaseId);
      }
      return next;
    });
  }, []);

  // 全選択/全解除
  const handleToggleAll = useCallback(() => {
    if (selectedIds.size === filteredSelections.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSelections.map((s) => s.testCaseId)));
    }
  }, [filteredSelections, selectedIds.size]);

  // テストセット生成
  const handleGenerateTestSet = useCallback(() => {
    if (onGenerateTestSet && selectedIds.size > 0) {
      onGenerateTestSet(Array.from(selectedIds));
    }
  }, [onGenerateTestSet, selectedIds]);

  // CSV出力
  const handleExportCsv = useCallback(() => {
    const headers = [
      'テストケース名',
      'テスト仕様書',
      'ステータス',
      '優先度スコア',
      '選択理由',
      '推定時間',
      '最終結果',
      '失敗率',
    ];
    const rows = filteredSelections.map((s) => [
      s.testCaseName,
      s.testSpecName || '',
      getSelectionStatusLabel(s.status),
      s.priorityScore.toString(),
      s.reasons.map((r) => getSelectionReasonLabel(r.type)).join('; '),
      s.estimatedDuration ? formatDuration(s.estimatedDuration) : '',
      s.lastResult || '',
      s.historicalFailureRate ? `${s.historicalFailureRate}%` : '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-selection-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredSelections]);

  return (
    <div className="space-y-4">
      {/* サマリーカード */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">推奨</p>
              <p className="text-2xl font-bold text-green-600">{summary.recommendedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">オプション</p>
              <p className="text-2xl font-bold text-blue-600">{summary.optionalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">除外</p>
              <p className="text-2xl font-bold text-gray-600">{summary.excludedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">推定時間</p>
              <p className="text-2xl font-bold">{formatDuration(summary.estimatedTotalDuration)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ツールバー */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">テストケース選択</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selectedIds.size} 選択中</Badge>
              <Button size="sm" variant="outline" onClick={handleExportCsv}>
                <Download className="h-4 w-4 mr-1" />
                CSV出力
              </Button>
              {onGenerateTestSet && (
                <Button size="sm" onClick={handleGenerateTestSet} disabled={selectedIds.size === 0}>
                  テストセット生成
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* フィルター */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="テストケース名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {Object.values(SelectionStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {getSelectionStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* テーブル */}
          <ScrollArea className="h-96 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        selectedIds.size === filteredSelections.length &&
                        filteredSelections.length > 0
                      }
                      onCheckedChange={handleToggleAll}
                    />
                  </TableHead>
                  <TableHead>テストケース</TableHead>
                  <TableHead className="w-24">ステータス</TableHead>
                  <TableHead className="w-20 text-center">優先度</TableHead>
                  <TableHead className="w-32">選択理由</TableHead>
                  <TableHead className="w-20 text-center">推定時間</TableHead>
                  <TableHead className="w-20 text-center">最終結果</TableHead>
                  <TableHead className="w-20 text-center">失敗率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSelections.map((selection) => (
                  <TestSelectionRow
                    key={selection.testCaseId}
                    selection={selection}
                    isSelected={selectedIds.has(selection.testCaseId)}
                    onToggle={() => handleToggleSelection(selection.testCaseId)}
                    onStatusChange={
                      onSelectionChange
                        ? (status) => onSelectionChange(selection.testCaseId, status)
                        : undefined
                    }
                  />
                ))}
                {filteredSelections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      テストケースがありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface TestSelectionRowProps {
  selection: TestCaseSelection;
  isSelected: boolean;
  onToggle: () => void;
  onStatusChange?: (status: SelectionStatus) => void;
}

function TestSelectionRow({
  selection,
  isSelected,
  onToggle,
  onStatusChange,
}: TestSelectionRowProps) {
  const statusColor = getSelectionStatusColor(selection.status);

  const ResultIcon =
    selection.lastResult === 'PASSED'
      ? CheckCircle2
      : selection.lastResult === 'FAILED'
        ? XCircle
        : AlertCircle;

  const resultColor =
    selection.lastResult === 'PASSED'
      ? 'text-green-600'
      : selection.lastResult === 'FAILED'
        ? 'text-red-600'
        : 'text-gray-400';

  return (
    <TableRow>
      <TableCell>
        <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-sm">{selection.testCaseName}</p>
          {selection.testSpecName && (
            <p className="text-xs text-muted-foreground">{selection.testSpecName}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        {onStatusChange ? (
          <Select
            value={selection.status}
            onValueChange={(value) => onStatusChange(value as SelectionStatus)}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(SelectionStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {getSelectionStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge
            variant="outline"
            style={{ borderColor: statusColor, color: statusColor }}
            className="text-xs"
          >
            {getSelectionStatusLabel(selection.status)}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <TrendingUp className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-medium">{selection.priorityScore}</span>
        </div>
      </TableCell>
      <TableCell>
        <TooltipProvider>
          <div className="flex flex-wrap gap-1">
            {selection.reasons.slice(0, 2).map((reason, i) => (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs cursor-help">
                    {getSelectionReasonLabel(reason.type).slice(0, 4)}...
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{getSelectionReasonLabel(reason.type)}</p>
                  <p className="text-xs">{reason.description}</p>
                  <p className="text-xs">信頼度: {Math.round(reason.confidence * 100)}%</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {selection.reasons.length > 2 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs cursor-help">
                    +{selection.reasons.length - 2}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {selection.reasons.slice(2).map((reason, i) => (
                    <p key={i} className="text-xs">
                      {getSelectionReasonLabel(reason.type)}
                    </p>
                  ))}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-center">
        {selection.estimatedDuration ? (
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(selection.estimatedDuration)}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <ResultIcon className={`h-4 w-4 mx-auto ${resultColor}`} />
      </TableCell>
      <TableCell className="text-center">
        {selection.historicalFailureRate !== undefined ? (
          <span
            className={`text-sm font-medium ${
              selection.historicalFailureRate >= 30
                ? 'text-red-600'
                : selection.historicalFailureRate >= 10
                  ? 'text-yellow-600'
                  : 'text-green-600'
            }`}
          >
            {selection.historicalFailureRate}%
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export default TestSelectionTable;
