'use client';
'use no memo';

/**
 * Combinatorial Editor Component
 *
 * 組合せテスト統合エディタ
 */

import { useState, useCallback } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Play,
  Save,
  Loader2,
  Settings,
  Table2,
  BarChart3,
  Grid3X3,
  Shuffle,
  Layers,
  Hash,
} from 'lucide-react';
import { ParameterEditor } from './parameter-editor';
import { CombinationResultTable } from './combination-result-table';
import { CoverageDisplay } from './coverage-display';
import {
  CombinatorialTestDefinition,
  CombinatorialParameter,
  CombinatorialMethod,
  Combination,
  CoverageSummary,
  GenerationStatistics,
  createEmptyParameter,
  getCombinatorialMethodLabel,
  getCombinatorialMethodDescription,
  STANDARD_ORTHOGONAL_ARRAYS,
} from '@/types/combinatorial';

interface CombinatorialEditorProps {
  projectId: number;
  definition?: CombinatorialTestDefinition;
  onSave?: (definition: CombinatorialTestDefinition) => Promise<void>;
  onGenerate?: (definitionId: string) => Promise<{
    combinations: Combination[];
    coverage: CoverageSummary;
    statistics: GenerationStatistics;
  }>;
  readOnly?: boolean;
}

const METHOD_OPTIONS: { value: CombinatorialMethod; icon: React.ReactNode }[] = [
  { value: 'PAIRWISE', icon: <Grid3X3 className="h-4 w-4" /> },
  { value: 'ALL_COMBINATIONS', icon: <Layers className="h-4 w-4" /> },
  { value: 'ORTHOGONAL_ARRAY', icon: <Table2 className="h-4 w-4" /> },
  { value: 'N_WISE', icon: <Hash className="h-4 w-4" /> },
];

export function CombinatorialEditor({
  projectId,
  definition,
  onSave,
  onGenerate,
  readOnly,
}: CombinatorialEditorProps) {
  // 基本情報
  const [name, setName] = useState(definition?.name || '');
  const [description, setDescription] = useState(definition?.description || '');
  const [method, setMethod] = useState<CombinatorialMethod>(definition?.method || 'PAIRWISE');
  const [nWiseLevel, setNWiseLevel] = useState(definition?.nWiseLevel || 3);
  const [orthogonalArrayId, setOrthogonalArrayId] = useState<string>('L4_2_3');

  // パラメータ
  const [parameters, setParameters] = useState<CombinatorialParameter[]>(
    definition?.parameters || [createEmptyParameter(0), createEmptyParameter(1)]
  );

  // 生成結果
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [coverage, setCoverage] = useState<CoverageSummary | null>(null);
  const [statistics, setStatistics] = useState<GenerationStatistics | null>(null);

  // UI状態
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('parameters');

  // 保存
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast.error('名前を入力してください');
      return;
    }

    if (parameters.length < 2) {
      toast.error('パラメータを2つ以上設定してください');
      return;
    }

    if (!onSave) return;

    setSaving(true);
    try {
      await onSave({
        id: definition?.id || '',
        projectId,
        name,
        description: description || undefined,
        method,
        nWiseLevel: method === 'N_WISE' ? nWiseLevel : undefined,
        parameters,
        constraints: definition?.constraints,
        metadata: definition?.metadata,
        createdAt: definition?.createdAt || new Date(),
        updatedAt: new Date(),
      });
      toast.success('保存しました');
    } catch (error) {
      toast.error('保存に失敗しました');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }, [name, description, method, nWiseLevel, parameters, definition, projectId, onSave]);

  // 組合せ生成
  const handleGenerate = useCallback(async () => {
    if (parameters.length < 2) {
      toast.error('パラメータを2つ以上設定してください');
      return;
    }

    // パラメータのバリデーション
    const emptyParams = parameters.filter(
      (p) => !p.name || p.values.length === 0 || p.values.some((v) => !v.value)
    );
    if (emptyParams.length > 0) {
      toast.error('空のパラメータまたは値があります');
      return;
    }

    setGenerating(true);
    try {
      if (onGenerate && definition?.id) {
        // API経由で生成
        const result = await onGenerate(definition.id);
        setCombinations(result.combinations);
        setCoverage(result.coverage);
        setStatistics(result.statistics);
      } else {
        // ローカルで生成（プレビュー用）
        const response = await fetch(`/api/projects/${projectId}/combinatorial`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name || '一時定義',
            parameters,
            method,
            nWiseLevel: method === 'N_WISE' ? nWiseLevel : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error('定義の作成に失敗しました');
        }

        const created = await response.json();

        // 組合せ生成
        const genResponse = await fetch(`/api/projects/${projectId}/combinatorial/${created.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate',
            method,
            nWiseLevel: method === 'N_WISE' ? nWiseLevel : undefined,
            orthogonalArrayId: method === 'ORTHOGONAL_ARRAY' ? orthogonalArrayId : undefined,
          }),
        });

        if (!genResponse.ok) {
          const error = await genResponse.json();
          throw new Error(error.error || '組合せ生成に失敗しました');
        }

        const result = await genResponse.json();
        setCombinations(result.combinations);
        setCoverage(result.coverage);
        setStatistics(result.statistics);

        // 一時定義を削除（プレビュー用なので）
        if (!definition?.id) {
          await fetch(`/api/projects/${projectId}/combinatorial/${created.id}`, {
            method: 'DELETE',
          });
        }
      }

      setActiveTab('results');
      toast.success('組合せを生成しました');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '組合せ生成に失敗しました');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  }, [parameters, method, nWiseLevel, orthogonalArrayId, onGenerate, definition, projectId, name]);

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">組合せテスト設計</h2>
          <p className="text-sm text-muted-foreground">
            パラメータと値を設定して、組合せを生成します
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && onSave && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              保存
            </Button>
          )}

          <Button onClick={handleGenerate} disabled={generating || parameters.length < 2}>
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            組合せ生成
          </Button>
        </div>
      </div>

      {/* 基本情報 */}
      {!readOnly && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              基本設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>名前 *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="組合せテスト定義の名前"
                />
              </div>

              <div className="space-y-2">
                <Label>組合せ手法</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as CombinatorialMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          {opt.icon}
                          <span>{getCombinatorialMethodLabel(opt.value)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {getCombinatorialMethodDescription(method)}
                </p>
              </div>
            </div>

            {/* N-wiseレベル */}
            {method === 'N_WISE' && (
              <div className="space-y-2">
                <Label>N-wiseレベル</Label>
                <Select
                  value={String(nWiseLevel)}
                  onValueChange={(v) => setNWiseLevel(parseInt(v, 10))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2-wise（ペアワイズ）</SelectItem>
                    <SelectItem value="3">3-wise</SelectItem>
                    <SelectItem value="4">4-wise</SelectItem>
                    <SelectItem value="5">5-wise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 直交表選択 */}
            {method === 'ORTHOGONAL_ARRAY' && (
              <div className="space-y-2">
                <Label>直交表</Label>
                <Select value={orthogonalArrayId} onValueChange={setOrthogonalArrayId}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_ORTHOGONAL_ARRAYS.map((oa) => (
                      <SelectItem key={oa.id} value={oa.id}>
                        <div className="flex items-center gap-2">
                          <span>{oa.notation}</span>
                          <Badge variant="outline" className="text-xs">
                            {oa.runs}行 × {oa.factors}列
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>説明</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="この組合せテストの説明"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* タブ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="parameters" className="flex items-center gap-2">
            <Shuffle className="h-4 w-4" />
            パラメータ
          </TabsTrigger>
          <TabsTrigger
            value="results"
            className="flex items-center gap-2"
            disabled={combinations.length === 0}
          >
            <Table2 className="h-4 w-4" />
            結果
            {combinations.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {combinations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="coverage" className="flex items-center gap-2" disabled={!coverage}>
            <BarChart3 className="h-4 w-4" />
            カバレッジ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parameters" className="mt-4">
          <ParameterEditor parameters={parameters} onChange={setParameters} readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          {combinations.length > 0 ? (
            <CombinationResultTable
              combinations={combinations}
              parameters={parameters}
              onSelectionChange={setCombinations}
              readOnly={readOnly}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Shuffle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>組合せを生成してください</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          {coverage && statistics ? (
            <CoverageDisplay coverage={coverage} statistics={statistics} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>組合せを生成するとカバレッジが表示されます</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CombinatorialEditor;
