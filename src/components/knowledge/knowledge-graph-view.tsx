'use client';

/**
 * Knowledge Graph View Component
 *
 * ナレッジグラフ可視化コンポーネント
 * シンプルなフォースレイアウトベースの可視化
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  KnowledgeNode,
  KnowledgeRelationship,
  KnowledgeNodeType,
  KnowledgeCategory,
  KNOWLEDGE_CATEGORY_INFO,
  RELATIONSHIP_TYPE_INFO,
  RelationshipType,
  SubGraph,
} from '@/types/knowledge-graph';

// ========================================
// Types
// ========================================

export interface KnowledgeGraphViewProps {
  subgraph: SubGraph | null;
  centerNodeId?: number;
  onNodeClick?: (node: KnowledgeNode) => void;
  isLoading?: boolean;
  height?: number;
}

interface NodePosition {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// ========================================
// Constants
// ========================================

const NODE_TYPE_COLORS: Record<KnowledgeNodeType, string> = {
  TestCase: '#3b82f6',
  TestStep: '#60a5fa',
  Bug: '#ef4444',
  BestPractice: '#22c55e',
  TestDesignKnowledge: '#a855f7',
  BugCountermeasure: '#f59e0b',
  Feature: '#06b6d4',
  Module: '#8b5cf6',
  Tag: '#6b7280',
};

const CATEGORY_SIZES: Record<KnowledgeCategory, number> = {
  TEST_ASSET: 24,
  DEFECT: 28,
  BEST_PRACTICE: 32,
  DESIGN_KNOWLEDGE: 32,
  COUNTERMEASURE: 32,
  SYSTEM_COMPONENT: 20,
};

// ========================================
// Force Simulation Functions
// ========================================

function initializePositions(
  nodes: KnowledgeNode[],
  width: number,
  height: number
): NodePosition[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;

  return nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length;
    return {
      id: node.id,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
  });
}

function simulateForces(
  positions: NodePosition[],
  relationships: KnowledgeRelationship[],
  width: number,
  height: number,
  centerNodeId?: number
): NodePosition[] {
  const alpha = 0.1;
  const repulsionForce = 500;
  const attractionForce = 0.05;
  const centerForce = 0.01;
  const damping = 0.9;

  // ノードID→位置のマップ
  const posMap = new Map(positions.map((p) => [p.id, p]));

  // 新しい位置を計算
  const newPositions = positions.map((pos) => {
    let fx = 0;
    let fy = 0;

    // 反発力（全ノード間）
    for (const other of positions) {
      if (other.id === pos.id) continue;
      const dx = pos.x - other.x;
      const dy = pos.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = repulsionForce / (dist * dist);
      fx += (dx / dist) * force;
      fy += (dy / dist) * force;
    }

    // 引力（リレーションシップで接続されたノード間）
    for (const rel of relationships) {
      const otherId =
        rel.startNodeId === pos.id
          ? rel.endNodeId
          : rel.endNodeId === pos.id
            ? rel.startNodeId
            : null;
      if (otherId !== null) {
        const other = posMap.get(otherId);
        if (other) {
          const dx = other.x - pos.x;
          const dy = other.y - pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          fx += dx * attractionForce;
          fy += dy * attractionForce;
        }
      }
    }

    // 中心への引力（中心ノード用）
    if (centerNodeId === pos.id) {
      const cx = width / 2;
      const cy = height / 2;
      fx += (cx - pos.x) * centerForce * 10;
      fy += (cy - pos.y) * centerForce * 10;
    } else {
      const cx = width / 2;
      const cy = height / 2;
      fx += (cx - pos.x) * centerForce;
      fy += (cy - pos.y) * centerForce;
    }

    // 速度更新
    const vx = (pos.vx + fx * alpha) * damping;
    const vy = (pos.vy + fy * alpha) * damping;

    // 位置更新（境界制限付き）
    const x = Math.max(50, Math.min(width - 50, pos.x + vx));
    const y = Math.max(50, Math.min(height - 50, pos.y + vy));

    return { ...pos, x, y, vx, vy };
  });

  return newPositions;
}

// ========================================
// Component
// ========================================

export function KnowledgeGraphView({
  subgraph,
  centerNodeId,
  onNodeClick,
  isLoading = false,
  height = 400,
}: KnowledgeGraphViewProps) {
  'use no memo'; // Disable React Compiler memoization for this complex component

  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<NodePosition[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height });
  const animationRef = useRef<number>();
  const subgraphRef = useRef(subgraph);

  // Keep subgraph ref updated
  useEffect(() => {
    subgraphRef.current = subgraph;
  }, [subgraph]);

  // サイズの更新
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions((prev) => {
          if (prev.width === width && prev.height === height) return prev;
          return { width, height };
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [height]);

  // 位置の初期化
  useEffect(() => {
    if (subgraph?.nodes && subgraph.nodes.length > 0) {
      // Use requestAnimationFrame to avoid sync setState in effect
      requestAnimationFrame(() => {
        const initialPositions = initializePositions(
          subgraph.nodes,
          dimensions.width,
          dimensions.height
        );
        setPositions(initialPositions);
      });
    }
  }, [subgraph, dimensions.width, dimensions.height]);

  // フォースシミュレーション
  useEffect(() => {
    if (positions.length === 0 || !subgraph?.relationships) return;

    let iterations = 0;
    const maxIterations = 100;

    const animate = () => {
      if (iterations >= maxIterations) return;

      setPositions((prev) =>
        simulateForces(
          prev,
          subgraph.relationships,
          dimensions.width,
          dimensions.height,
          centerNodeId
        )
      );
      iterations++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [positions.length, subgraph?.relationships, dimensions, centerNodeId]);

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z / 1.2, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    const currentSubgraph = subgraphRef.current;
    if (currentSubgraph?.nodes) {
      setPositions(initializePositions(currentSubgraph.nodes, dimensions.width, dimensions.height));
    }
  };

  // ノードID→位置のマップ
  const posMap = new Map(positions.map((p) => [p.id, p]));

  // ノードの描画
  const renderNode = (node: KnowledgeNode) => {
    const pos = posMap.get(node.id);
    if (!pos) return null;

    const color = NODE_TYPE_COLORS[node.type] || '#6b7280';
    const size = CATEGORY_SIZES[node.category] || 24;
    const isCenter = node.id === centerNodeId;
    const isHovered = node.id === hoveredNode;

    return (
      <g
        key={node.id}
        transform={`translate(${pos.x}, ${pos.y})`}
        style={{ cursor: 'pointer' }}
        onClick={() => onNodeClick?.(node)}
        onMouseEnter={() => setHoveredNode(node.id)}
        onMouseLeave={() => setHoveredNode(null)}
      >
        {/* ノードの円 */}
        <circle
          r={size / 2}
          fill={color}
          stroke={isCenter ? '#000' : isHovered ? '#fff' : 'none'}
          strokeWidth={isCenter ? 3 : isHovered ? 2 : 0}
          opacity={isHovered || isCenter ? 1 : 0.8}
        />
        {/* ラベル */}
        <text
          y={size / 2 + 14}
          textAnchor="middle"
          fontSize={10}
          fill="currentColor"
          className="select-none pointer-events-none"
        >
          {node.title.length > 10 ? node.title.slice(0, 10) + '...' : node.title}
        </text>
        {/* ツールチップ */}
        {isHovered && (
          <g transform={`translate(0, ${-size / 2 - 20})`}>
            <rect
              x={-80}
              y={-15}
              width={160}
              height={30}
              rx={4}
              fill="hsl(var(--popover))"
              stroke="hsl(var(--border))"
            />
            <text
              textAnchor="middle"
              fontSize={11}
              fill="hsl(var(--popover-foreground))"
              className="select-none"
            >
              {node.title}
            </text>
          </g>
        )}
      </g>
    );
  };

  // エッジの描画
  const renderEdge = (rel: KnowledgeRelationship) => {
    const startPos = posMap.get(rel.startNodeId);
    const endPos = posMap.get(rel.endNodeId);
    if (!startPos || !endPos) return null;

    const relInfo = RELATIONSHIP_TYPE_INFO[rel.type as RelationshipType];

    // ノードサイズを考慮してエッジの開始・終了位置を調整
    const startNode = subgraph?.nodes.find((n) => n.id === rel.startNodeId);
    const endNode = subgraph?.nodes.find((n) => n.id === rel.endNodeId);
    const startSize = startNode ? (CATEGORY_SIZES[startNode.category] || 24) / 2 : 12;
    const endSize = endNode ? (CATEGORY_SIZES[endNode.category] || 24) / 2 : 12;

    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const startX = startPos.x + (dx / dist) * startSize;
    const startY = startPos.y + (dy / dist) * startSize;
    const endX = endPos.x - (dx / dist) * (endSize + 6);
    const endY = endPos.y - (dy / dist) * (endSize + 6);

    return (
      <g key={rel.id}>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
          strokeOpacity={0.4}
          markerEnd="url(#arrowhead)"
        />
        {/* リレーションシップラベル（中点） */}
        <text
          x={(startX + endX) / 2}
          y={(startY + endY) / 2 - 5}
          textAnchor="middle"
          fontSize={8}
          fill="hsl(var(--muted-foreground))"
          className="select-none pointer-events-none"
        >
          {relInfo?.label || rel.type}
        </text>
      </g>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!subgraph || subgraph.nodes.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <p className="text-muted-foreground">グラフデータがありません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">ナレッジグラフ</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={containerRef} className="overflow-hidden" style={{ height }}>
          <svg
            width="100%"
            height="100%"
            viewBox={`${-pan.x} ${-pan.y} ${dimensions.width / zoom} ${dimensions.height / zoom}`}
            className="bg-muted/30"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.4}
                />
              </marker>
            </defs>

            {/* エッジ */}
            <g>{subgraph.relationships.map(renderEdge)}</g>

            {/* ノード */}
            <g>{subgraph.nodes.map(renderNode)}</g>
          </svg>
        </div>

        {/* 凡例 */}
        <div className="flex flex-wrap gap-2 p-2 border-t">
          {Object.entries(KNOWLEDGE_CATEGORY_INFO).map(([key, info]) => (
            <div key={key} className="flex items-center gap-1 text-xs">
              <div
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor:
                    NODE_TYPE_COLORS[
                      Object.keys(CATEGORY_SIZES).find(
                        (k) => k === key
                      ) as keyof typeof CATEGORY_SIZES as KnowledgeNodeType
                    ] || '#6b7280',
                }}
              />
              <span className="text-muted-foreground">{info.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
