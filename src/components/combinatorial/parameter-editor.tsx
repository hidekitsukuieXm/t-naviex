'use client';
'use no memo';

/**
 * Parameter Editor Component
 *
 * パラメータ・値の入力UI
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import {
  CombinatorialParameter,
  ParameterValue,
  createEmptyParameter,
  createEmptyParameterValue,
  validateParameter,
  calculateAllCombinationsCount,
  calculateAllPairsCount,
} from '@/types/combinatorial';

interface ParameterEditorProps {
  parameters: CombinatorialParameter[];
  onChange: (parameters: CombinatorialParameter[]) => void;
  readOnly?: boolean;
}

export function ParameterEditor({ parameters, onChange, readOnly }: ParameterEditorProps) {
  const [expandedParams, setExpandedParams] = useState<Set<string>>(
    new Set(parameters.map((p) => p.id))
  );

  // パラメータを追加
  const handleAddParameter = useCallback(() => {
    const newParam = createEmptyParameter(parameters.length);
    onChange([...parameters, newParam]);
    setExpandedParams((prev) => new Set([...prev, newParam.id]));
  }, [parameters, onChange]);

  // パラメータを削除
  const handleRemoveParameter = useCallback(
    (paramId: string) => {
      onChange(parameters.filter((p) => p.id !== paramId).map((p, i) => ({ ...p, sortOrder: i })));
      setExpandedParams((prev) => {
        const next = new Set(prev);
        next.delete(paramId);
        return next;
      });
    },
    [parameters, onChange]
  );

  // パラメータを更新
  const handleUpdateParameter = useCallback(
    (paramId: string, updates: Partial<CombinatorialParameter>) => {
      onChange(parameters.map((p) => (p.id === paramId ? { ...p, ...updates } : p)));
    },
    [parameters, onChange]
  );

  // パラメータ値を追加
  const handleAddValue = useCallback(
    (paramId: string) => {
      const param = parameters.find((p) => p.id === paramId);
      if (!param) return;

      const newValue = createEmptyParameterValue();
      handleUpdateParameter(paramId, {
        values: [...param.values, newValue],
      });
    },
    [parameters, handleUpdateParameter]
  );

  // パラメータ値を削除
  const handleRemoveValue = useCallback(
    (paramId: string, valueId: string) => {
      const param = parameters.find((p) => p.id === paramId);
      if (!param) return;

      handleUpdateParameter(paramId, {
        values: param.values.filter((v) => v.id !== valueId),
      });
    },
    [parameters, handleUpdateParameter]
  );

  // パラメータ値を更新
  const handleUpdateValue = useCallback(
    (paramId: string, valueId: string, updates: Partial<ParameterValue>) => {
      const param = parameters.find((p) => p.id === paramId);
      if (!param) return;

      handleUpdateParameter(paramId, {
        values: param.values.map((v) => (v.id === valueId ? { ...v, ...updates } : v)),
      });
    },
    [parameters, handleUpdateParameter]
  );

  // 展開/折りたたみを切り替え
  const toggleExpand = useCallback((paramId: string) => {
    setExpandedParams((prev) => {
      const next = new Set(prev);
      if (next.has(paramId)) {
        next.delete(paramId);
      } else {
        next.add(paramId);
      }
      return next;
    });
  }, []);

  // 統計情報
  const stats = {
    allCombinations: calculateAllCombinationsCount(parameters),
    allPairs: calculateAllPairsCount(parameters),
    paramCount: parameters.length,
    totalValues: parameters.reduce((acc, p) => acc + p.values.length, 0),
  };

  return (
    <div className="space-y-4">
      {/* 統計サマリー */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">パラメータ: {stats.paramCount}</Badge>
        <Badge variant="outline">総値数: {stats.totalValues}</Badge>
        <Badge variant="outline">全組合せ: {stats.allCombinations.toLocaleString()}</Badge>
        <Badge variant="outline">総ペア数: {stats.allPairs.toLocaleString()}</Badge>
      </div>

      {/* パラメータ一覧 */}
      <div className="space-y-3">
        {parameters.map((param) => {
          const validation = validateParameter(param);
          const isExpanded = expandedParams.has(param.id);

          return (
            <Card key={param.id} className={!validation.valid ? 'border-destructive' : ''}>
              <CardHeader className="p-3">
                <div className="flex items-center gap-2">
                  {!readOnly && (
                    <button
                      type="button"
                      className="cursor-grab text-muted-foreground hover:text-foreground"
                      title="ドラッグして並べ替え"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleExpand(param.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  <div className="flex-1 flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">
                      {readOnly ? (
                        param.name
                      ) : (
                        <Input
                          value={param.name}
                          onChange={(e) =>
                            handleUpdateParameter(param.id, { name: e.target.value })
                          }
                          placeholder="パラメータ名"
                          className="h-7 w-40"
                        />
                      )}
                    </CardTitle>

                    <Badge variant="secondary" className="text-xs">
                      {param.values.length}値
                    </Badge>

                    {!validation.valid && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <ul className="text-xs">
                              {validation.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  {!readOnly && parameters.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveParameter(param.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="p-3 pt-0">
                  {/* 説明 */}
                  {!readOnly && (
                    <div className="mb-3">
                      <Label className="text-xs text-muted-foreground">説明（任意）</Label>
                      <Input
                        value={param.description || ''}
                        onChange={(e) =>
                          handleUpdateParameter(param.id, { description: e.target.value })
                        }
                        placeholder="このパラメータの説明"
                        className="h-7 text-sm mt-1"
                      />
                    </div>
                  )}

                  {/* 値一覧 */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">値</Label>
                    <div className="flex flex-wrap gap-2">
                      {param.values.map((value) => (
                        <div key={value.id} className="flex items-center gap-1">
                          {readOnly ? (
                            <Badge variant="outline">{value.value}</Badge>
                          ) : (
                            <>
                              <Input
                                value={value.value}
                                onChange={(e) =>
                                  handleUpdateValue(param.id, value.id, { value: e.target.value })
                                }
                                placeholder="値"
                                className="h-7 w-24 text-sm"
                              />
                              {param.values.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveValue(param.id, value.id)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      ))}

                      {!readOnly && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddValue(param.id)}
                          className="h-7"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          値を追加
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* パラメータ追加ボタン */}
      {!readOnly && (
        <Button type="button" variant="outline" onClick={handleAddParameter} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          パラメータを追加
        </Button>
      )}
    </div>
  );
}

export default ParameterEditor;
