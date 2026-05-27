'use client';
'use no memo';

/**
 * Path Generator Dialog
 *
 * 遷移パス生成ダイアログ
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitBranch, Loader2, CheckCircle2, Target, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TransitionDiagram,
  TransitionPath,
  CoverageType,
  getCoverageTypeLabel,
  pathToString,
} from '@/types/state-transition';

interface PathGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagram: TransitionDiagram | null;
  onGenerate: (options: GenerateOptions) => Promise<TransitionPath[]>;
}

interface GenerateOptions {
  coverageType: CoverageType;
  maxPathLength: number;
  includeLoops: boolean;
}

const COVERAGE_OPTIONS: { value: CoverageType; description: string; icon: React.ReactNode }[] = [
  {
    value: 'NODE',
    description: 'すべてのノード（状態/画面）を少なくとも1回通過',
    icon: <Target className="h-4 w-4 text-blue-500" />,
  },
  {
    value: 'EDGE',
    description: 'すべての遷移を少なくとも1回通過',
    icon: <Route className="h-4 w-4 text-green-500" />,
  },
  {
    value: 'PATH',
    description: 'すべての単純パスを生成（開始→終了）',
    icon: <GitBranch className="h-4 w-4 text-purple-500" />,
  },
];

export function PathGeneratorDialog({
  open,
  onOpenChange,
  diagram,
  onGenerate,
}: PathGeneratorDialogProps) {
  const [coverageType, setCoverageType] = useState<CoverageType>('NODE');
  const [maxPathLength, setMaxPathLength] = useState(20);
  const [generating, setGenerating] = useState(false);
  const [generatedPaths, setGeneratedPaths] = useState<TransitionPath[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const paths = await onGenerate({
        coverageType,
        maxPathLength,
        includeLoops: false,
      });
      setGeneratedPaths(paths);
      setShowResults(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setShowResults(false);
    setGeneratedPaths([]);
    onOpenChange(false);
  };

  if (!diagram) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            テストパスを生成
          </DialogTitle>
          <DialogDescription>遷移図からテストパスを自動生成します</DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <div className="flex-1 overflow-auto space-y-6 py-4">
            {/* カバレッジタイプ選択 */}
            <div className="space-y-3">
              <Label>カバレッジタイプ</Label>
              <RadioGroup
                value={coverageType}
                onValueChange={(v) => setCoverageType(v as CoverageType)}
              >
                <div className="space-y-2">
                  {COVERAGE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        coverageType === option.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent'
                      )}
                    >
                      <RadioGroupItem value={option.value} />
                      {option.icon}
                      <div className="flex-1">
                        <span className="font-medium">{getCoverageTypeLabel(option.value)}</span>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* オプション */}
            <div className="space-y-3">
              <Label>オプション</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Label className="w-32">最大パス長</Label>
                  <Input
                    type="number"
                    value={maxPathLength}
                    onChange={(e) => setMaxPathLength(parseInt(e.target.value) || 20)}
                    min={1}
                    max={100}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">ノード数</span>
                </div>
              </div>
            </div>

            {/* 図の情報 */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">対象の遷移図</h4>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">ノード: {diagram.nodes.length}</Badge>
                  <Badge variant="outline">遷移: {diagram.edges.length}</Badge>
                  <Badge variant="outline">
                    開始ノード: {diagram.nodes.filter((n) => n.type === 'START').length}
                  </Badge>
                  <Badge variant="outline">
                    終了ノード: {diagram.nodes.filter((n) => n.type === 'END').length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex-1 overflow-auto py-4">
            {/* 結果表示 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{generatedPaths.length}件のパスが生成されました</span>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {generatedPaths.map((path, index) => (
                    <Card key={path.id || index}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{path.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {path.length}ステップ
                              </Badge>
                              {path.isLoop && (
                                <Badge variant="outline" className="text-xs">
                                  ループ
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {pathToString(diagram, path)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            {showResults ? '閉じる' : 'キャンセル'}
          </Button>
          {!showResults && (
            <Button onClick={handleGenerate} disabled={generating}>
              {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              パスを生成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PathGeneratorDialog;
