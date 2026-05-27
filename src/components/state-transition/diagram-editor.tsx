'use client';
'use no memo';

/**
 * Diagram Editor Component
 *
 * 状態遷移図・画面遷移図エディタ
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Trash2,
  Save,
  MoreVertical,
  CircleDot,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  GitBranch,
  Workflow,
  BarChart3,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TransitionDiagram,
  TransitionNode,
  TransitionEdge,
  NodeType,
  DiagramType,
  getNodeTypeLabel,
  getNodeTypeColor,
  getDiagramTypeLabel,
} from '@/types/state-transition';
import { DiagramCanvas } from './diagram-canvas';

interface DiagramEditorProps {
  diagram: TransitionDiagram | null;
  onChange: (diagram: TransitionDiagram) => void;
  onSave?: () => Promise<void>;
  onGeneratePaths?: () => void;
  onAnalyzeCoverage?: () => void;
  readOnly?: boolean;
  className?: string;
}

const NODE_TYPES: { value: NodeType; label: string; icon: React.ReactNode }[] = [
  { value: 'STATE', label: '状態', icon: <Square className="h-4 w-4" /> },
  { value: 'SCREEN', label: '画面', icon: <Square className="h-4 w-4" /> },
  { value: 'START', label: '開始', icon: <Circle className="h-4 w-4" /> },
  { value: 'END', label: '終了', icon: <CircleDot className="h-4 w-4" /> },
  { value: 'DECISION', label: '分岐', icon: <Diamond className="h-4 w-4" /> },
];

export function DiagramEditor({
  diagram,
  onChange,
  onSave,
  onGeneratePaths,
  onAnalyzeCoverage,
  readOnly = false,
  className,
}: DiagramEditorProps) {
  const [selectedNode, setSelectedNode] = useState<TransitionNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<TransitionEdge | null>(null);
  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [showEdgeDialog, setShowEdgeDialog] = useState(false);
  const [edgeCreationMode, setEdgeCreationMode] = useState(false);
  const [edgeSource, setEdgeSource] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ノード編集フォームの状態
  const [nodeForm, setNodeForm] = useState({
    name: '',
    type: 'STATE' as NodeType,
    description: '',
    entryAction: '',
    exitAction: '',
  });

  // エッジ編集フォームの状態
  const [edgeForm, setEdgeForm] = useState({
    label: '',
    trigger: '',
    guard: '',
    action: '',
  });

  // 統計
  const stats = useMemo(() => {
    if (!diagram) return null;
    return {
      nodeCount: diagram.nodes.length,
      edgeCount: diagram.edges.length,
      stateCount: diagram.nodes.filter((n) => n.type === 'STATE' || n.type === 'SCREEN').length,
    };
  }, [diagram]);

  // ユニークID生成
  const generateId = useCallback((prefix: string) => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // ノードを追加
  const addNode = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      if (!diagram || readOnly) return;

      const newNode: TransitionNode = {
        id: generateId('node'),
        name:
          type === 'START'
            ? '開始'
            : type === 'END'
              ? '終了'
              : `${getNodeTypeLabel(type)} ${diagram.nodes.length + 1}`,
        type,
        position,
        style: {
          shape:
            type === 'DECISION'
              ? 'diamond'
              : type === 'START' || type === 'END'
                ? 'circle'
                : 'rounded',
        },
      };

      onChange({
        ...diagram,
        nodes: [...diagram.nodes, newNode],
        updatedAt: new Date(),
      });

      return newNode;
    },
    [diagram, generateId, onChange, readOnly]
  );

  // ノードを更新
  const updateNode = useCallback(
    (nodeId: string, updates: Partial<TransitionNode>) => {
      if (!diagram || readOnly) return;

      onChange({
        ...diagram,
        nodes: diagram.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
        updatedAt: new Date(),
      });
    },
    [diagram, onChange, readOnly]
  );

  // ノードを削除
  const deleteNode = useCallback(
    (nodeId: string) => {
      if (!diagram || readOnly) return;

      onChange({
        ...diagram,
        nodes: diagram.nodes.filter((n) => n.id !== nodeId),
        edges: diagram.edges.filter((e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId),
        updatedAt: new Date(),
      });

      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }
    },
    [diagram, onChange, readOnly, selectedNode]
  );

  // エッジを追加
  const addEdge = useCallback(
    (sourceNodeId: string, targetNodeId: string) => {
      if (!diagram || readOnly) return;

      // 既存のエッジがあるかチェック
      const existingEdge = diagram.edges.find(
        (e) => e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId
      );

      if (existingEdge) return;

      const newEdge: TransitionEdge = {
        id: generateId('edge'),
        sourceNodeId,
        targetNodeId,
      };

      onChange({
        ...diagram,
        edges: [...diagram.edges, newEdge],
        updatedAt: new Date(),
      });

      return newEdge;
    },
    [diagram, generateId, onChange, readOnly]
  );

  // エッジを更新
  const updateEdge = useCallback(
    (edgeId: string, updates: Partial<TransitionEdge>) => {
      if (!diagram || readOnly) return;

      onChange({
        ...diagram,
        edges: diagram.edges.map((e) => (e.id === edgeId ? { ...e, ...updates } : e)),
        updatedAt: new Date(),
      });
    },
    [diagram, onChange, readOnly]
  );

  // エッジを削除
  const deleteEdge = useCallback(
    (edgeId: string) => {
      if (!diagram || readOnly) return;

      onChange({
        ...diagram,
        edges: diagram.edges.filter((e) => e.id !== edgeId),
        updatedAt: new Date(),
      });

      if (selectedEdge?.id === edgeId) {
        setSelectedEdge(null);
      }
    },
    [diagram, onChange, readOnly, selectedEdge]
  );

  // ノード選択ハンドラー
  const handleNodeSelect = useCallback(
    (node: TransitionNode) => {
      if (edgeCreationMode && edgeSource) {
        // エッジ作成モード
        if (edgeSource !== node.id) {
          addEdge(edgeSource, node.id);
        }
        setEdgeSource(null);
        setEdgeCreationMode(false);
      } else if (edgeCreationMode) {
        // エッジソース選択
        setEdgeSource(node.id);
      } else {
        setSelectedNode(node);
        setSelectedEdge(null);
        setNodeForm({
          name: node.name,
          type: node.type,
          description: node.description || '',
          entryAction: node.properties?.entryAction || '',
          exitAction: node.properties?.exitAction || '',
        });
      }
    },
    [addEdge, edgeCreationMode, edgeSource]
  );

  // エッジ選択ハンドラー
  const handleEdgeSelect = useCallback((edge: TransitionEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setEdgeForm({
      label: edge.label || '',
      trigger: edge.trigger || '',
      guard: edge.guard || '',
      action: edge.action || '',
    });
  }, []);

  // ノード位置更新ハンドラー
  const handleNodeMove = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      updateNode(nodeId, { position });
    },
    [updateNode]
  );

  // ノードダイアログを保存
  const saveNodeDialog = useCallback(() => {
    if (!selectedNode) return;

    updateNode(selectedNode.id, {
      name: nodeForm.name,
      type: nodeForm.type,
      description: nodeForm.description || undefined,
      properties: {
        ...selectedNode.properties,
        entryAction: nodeForm.entryAction || undefined,
        exitAction: nodeForm.exitAction || undefined,
      },
    });

    setShowNodeDialog(false);
  }, [nodeForm, selectedNode, updateNode]);

  // エッジダイアログを保存
  const saveEdgeDialog = useCallback(() => {
    if (!selectedEdge) return;

    updateEdge(selectedEdge.id, {
      label: edgeForm.label || undefined,
      trigger: edgeForm.trigger || undefined,
      guard: edgeForm.guard || undefined,
      action: edgeForm.action || undefined,
    });

    setShowEdgeDialog(false);
  }, [edgeForm, selectedEdge, updateEdge]);

  // 保存ハンドラー
  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }, [onSave]);

  if (!diagram) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <Workflow className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
        <p className="mt-4 text-muted-foreground">遷移図がありません</p>
      </Card>
    );
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              {diagram.name}
            </CardTitle>
            {diagram.description && (
              <CardDescription className="mt-1">{diagram.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{getDiagramTypeLabel(diagram.type)}</Badge>

            {/* アクションメニュー */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onGeneratePaths && (
                  <DropdownMenuItem onClick={onGeneratePaths}>
                    <GitBranch className="h-4 w-4 mr-2" />
                    パスを生成
                  </DropdownMenuItem>
                )}
                {onAnalyzeCoverage && (
                  <DropdownMenuItem onClick={onAnalyzeCoverage}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    カバレッジ分析
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  エクスポート
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 保存ボタン */}
            {onSave && !readOnly && (
              <Button onClick={handleSave} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-2" />
                {saving ? '保存中...' : '保存'}
              </Button>
            )}
          </div>
        </div>

        {/* 統計 */}
        {stats && (
          <div className="flex gap-2 mt-3">
            <Badge variant="secondary">ノード: {stats.nodeCount}</Badge>
            <Badge variant="secondary">遷移: {stats.edgeCount}</Badge>
            <Badge variant="secondary">
              {diagram.type === 'STATE_TRANSITION' ? '状態' : '画面'}: {stats.stateCount}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        {/* ツールバー */}
        {!readOnly && (
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50">
            <span className="text-sm text-muted-foreground mr-2">追加:</span>

            {NODE_TYPES.filter((t) => {
              if (diagram.type === 'SCREEN_TRANSITION') {
                return ['SCREEN', 'START', 'END', 'DECISION'].includes(t.value);
              }
              return ['STATE', 'START', 'END', 'DECISION'].includes(t.value);
            }).map((nodeType) => (
              <Button
                key={nodeType.value}
                variant="outline"
                size="sm"
                onClick={() => {
                  const node = addNode(nodeType.value, {
                    x: 200 + Math.random() * 200,
                    y: 150 + Math.random() * 100,
                  });
                  if (node) setSelectedNode(node);
                }}
              >
                {nodeType.icon}
                <span className="ml-1">{nodeType.label}</span>
              </Button>
            ))}

            <div className="flex-1" />

            <Button
              variant={edgeCreationMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setEdgeCreationMode(!edgeCreationMode);
                setEdgeSource(null);
              }}
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              遷移追加
            </Button>

            {edgeCreationMode && (
              <span className="text-sm text-muted-foreground">
                {edgeSource ? '遷移先を選択...' : '遷移元を選択...'}
              </span>
            )}
          </div>
        )}

        {/* キャンバス & プロパティパネル */}
        <div className="flex-1 flex overflow-hidden">
          {/* キャンバス */}
          <div className="flex-1 relative">
            <DiagramCanvas
              nodes={diagram.nodes}
              edges={diagram.edges}
              selectedNodeId={selectedNode?.id}
              selectedEdgeId={selectedEdge?.id}
              edgeCreationMode={edgeCreationMode}
              edgeSourceId={edgeSource}
              onNodeSelect={handleNodeSelect}
              onEdgeSelect={handleEdgeSelect}
              onNodeMove={handleNodeMove}
              onNodeDoubleClick={(node) => {
                setSelectedNode(node);
                setNodeForm({
                  name: node.name,
                  type: node.type,
                  description: node.description || '',
                  entryAction: node.properties?.entryAction || '',
                  exitAction: node.properties?.exitAction || '',
                });
                setShowNodeDialog(true);
              }}
              onEdgeDoubleClick={(edge) => {
                setSelectedEdge(edge);
                setEdgeForm({
                  label: edge.label || '',
                  trigger: edge.trigger || '',
                  guard: edge.guard || '',
                  action: edge.action || '',
                });
                setShowEdgeDialog(true);
              }}
              readOnly={readOnly}
            />
          </div>

          {/* プロパティパネル */}
          {(selectedNode || selectedEdge) && !readOnly && (
            <div className="w-64 border-l bg-muted/30 p-4 overflow-y-auto">
              {selectedNode && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">ノードプロパティ</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => deleteNode(selectedNode.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>名前</Label>
                    <Input
                      value={selectedNode.name}
                      onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>タイプ</Label>
                    <Badge style={{ backgroundColor: getNodeTypeColor(selectedNode.type) + '30' }}>
                      {getNodeTypeLabel(selectedNode.type)}
                    </Badge>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowNodeDialog(true)}
                  >
                    詳細を編集
                  </Button>
                </div>
              )}

              {selectedEdge && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">遷移プロパティ</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => deleteEdge(selectedEdge.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>ラベル</Label>
                    <Input
                      value={selectedEdge.label || ''}
                      onChange={(e) =>
                        updateEdge(selectedEdge.id, { label: e.target.value || undefined })
                      }
                      placeholder="遷移ラベル"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowEdgeDialog(true)}
                  >
                    詳細を編集
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* ノード編集ダイアログ */}
      <Dialog open={showNodeDialog} onOpenChange={setShowNodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ノードを編集</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList>
              <TabsTrigger value="basic">基本</TabsTrigger>
              <TabsTrigger value="actions">アクション</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>名前</Label>
                <Input
                  value={nodeForm.name}
                  onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>タイプ</Label>
                <Select
                  value={nodeForm.type}
                  onValueChange={(v) => setNodeForm({ ...nodeForm, type: v as NodeType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NODE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>説明</Label>
                <Textarea
                  value={nodeForm.description}
                  onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })}
                  rows={3}
                />
              </div>
            </TabsContent>
            <TabsContent value="actions" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>入場アクション (Entry)</Label>
                <Input
                  value={nodeForm.entryAction}
                  onChange={(e) => setNodeForm({ ...nodeForm, entryAction: e.target.value })}
                  placeholder="状態に入るときのアクション"
                />
              </div>
              <div className="space-y-2">
                <Label>退場アクション (Exit)</Label>
                <Input
                  value={nodeForm.exitAction}
                  onChange={(e) => setNodeForm({ ...nodeForm, exitAction: e.target.value })}
                  placeholder="状態から出るときのアクション"
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNodeDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={saveNodeDialog}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* エッジ編集ダイアログ */}
      <Dialog open={showEdgeDialog} onOpenChange={setShowEdgeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>遷移を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>ラベル</Label>
              <Input
                value={edgeForm.label}
                onChange={(e) => setEdgeForm({ ...edgeForm, label: e.target.value })}
                placeholder="遷移ラベル"
              />
            </div>
            <div className="space-y-2">
              <Label>トリガー (イベント)</Label>
              <Input
                value={edgeForm.trigger}
                onChange={(e) => setEdgeForm({ ...edgeForm, trigger: e.target.value })}
                placeholder="例: ボタンクリック"
              />
            </div>
            <div className="space-y-2">
              <Label>ガード条件</Label>
              <Input
                value={edgeForm.guard}
                onChange={(e) => setEdgeForm({ ...edgeForm, guard: e.target.value })}
                placeholder="例: ログイン済み"
              />
            </div>
            <div className="space-y-2">
              <Label>アクション</Label>
              <Input
                value={edgeForm.action}
                onChange={(e) => setEdgeForm({ ...edgeForm, action: e.target.value })}
                placeholder="例: データを保存"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdgeDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={saveEdgeDialog}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default DiagramEditor;
