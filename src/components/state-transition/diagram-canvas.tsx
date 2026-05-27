'use client';
'use no memo';

/**
 * Diagram Canvas Component
 *
 * 遷移図のキャンバス描画コンポーネント
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  TransitionNode,
  TransitionEdge,
  getNodeTypeColor,
  generateEdgeLabel,
} from '@/types/state-transition';

interface DiagramCanvasProps {
  nodes: TransitionNode[];
  edges: TransitionEdge[];
  selectedNodeId?: string;
  selectedEdgeId?: string;
  edgeCreationMode?: boolean;
  edgeSourceId?: string | null;
  onNodeSelect?: (node: TransitionNode) => void;
  onEdgeSelect?: (edge: TransitionEdge) => void;
  onNodeMove?: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeDoubleClick?: (node: TransitionNode) => void;
  onEdgeDoubleClick?: (edge: TransitionEdge) => void;
  readOnly?: boolean;
  className?: string;
}

const NODE_WIDTH = 120;
const NODE_HEIGHT = 60;
const CIRCLE_RADIUS = 25;

export function DiagramCanvas({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  edgeCreationMode,
  edgeSourceId,
  onNodeSelect,
  onEdgeSelect,
  onNodeMove,
  onNodeDoubleClick,
  onEdgeDoubleClick,
  readOnly,
  className,
}: DiagramCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // SVGサイズの調整
  useEffect(() => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setViewBox((prev) => ({ ...prev, width: rect.width, height: rect.height }));
    }
  }, []);

  // ノードの中心座標を取得
  const getNodeCenter = useCallback((node: TransitionNode) => {
    const isCircle = node.style?.shape === 'circle' || node.type === 'START' || node.type === 'END';
    if (isCircle) {
      return { x: node.position.x, y: node.position.y };
    }
    return {
      x: node.position.x + NODE_WIDTH / 2,
      y: node.position.y + NODE_HEIGHT / 2,
    };
  }, []);

  // エッジのパスを計算
  const getEdgePath = useCallback(
    (edge: TransitionEdge) => {
      const sourceNode = nodes.find((n) => n.id === edge.sourceNodeId);
      const targetNode = nodes.find((n) => n.id === edge.targetNodeId);

      if (!sourceNode || !targetNode) return '';

      const source = getNodeCenter(sourceNode);
      const target = getNodeCenter(targetNode);

      // 簡易的な直線パス（実際はベジェ曲線にする方が良い）
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len === 0) return '';

      // ノードの境界からの開始・終了点を計算
      const sourceIsCircle =
        sourceNode.style?.shape === 'circle' ||
        sourceNode.type === 'START' ||
        sourceNode.type === 'END';
      const targetIsCircle =
        targetNode.style?.shape === 'circle' ||
        targetNode.type === 'START' ||
        targetNode.type === 'END';

      const sourceRadius = sourceIsCircle ? CIRCLE_RADIUS : Math.max(NODE_WIDTH, NODE_HEIGHT) / 2;
      const targetRadius = targetIsCircle ? CIRCLE_RADIUS : Math.max(NODE_WIDTH, NODE_HEIGHT) / 2;

      const startX = source.x + (dx / len) * sourceRadius;
      const startY = source.y + (dy / len) * sourceRadius;
      const endX = target.x - (dx / len) * targetRadius;
      const endY = target.y - (dy / len) * targetRadius;

      // ベジェ曲線
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const controlOffset = 20;
      const controlX = midX - (dy / len) * controlOffset;
      const controlY = midY + (dx / len) * controlOffset;

      return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
    },
    [getNodeCenter, nodes]
  );

  // マウスダウンハンドラー
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId?: string) => {
      if (readOnly) return;

      if (nodeId) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node && !edgeCreationMode) {
          const svgRect = svgRef.current?.getBoundingClientRect();
          if (svgRect) {
            const scale = viewBox.width / svgRect.width;
            const mouseX = (e.clientX - svgRect.left) * scale + viewBox.x;
            const mouseY = (e.clientY - svgRect.top) * scale + viewBox.y;
            setDragOffset({
              x: mouseX - node.position.x,
              y: mouseY - node.position.y,
            });
            setDragging(nodeId);
          }
        }
      } else {
        // キャンバスパン
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    [edgeCreationMode, nodes, readOnly, viewBox]
  );

  // マウスムーブハンドラー
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragging && onNodeMove && svgRef.current) {
        const svgRect = svgRef.current.getBoundingClientRect();
        const scale = viewBox.width / svgRect.width;
        const mouseX = (e.clientX - svgRect.left) * scale + viewBox.x;
        const mouseY = (e.clientY - svgRect.top) * scale + viewBox.y;

        onNodeMove(dragging, {
          x: Math.max(0, mouseX - dragOffset.x),
          y: Math.max(0, mouseY - dragOffset.y),
        });
      }

      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setViewBox((prev) => ({
          ...prev,
          x: prev.x - dx,
          y: prev.y - dy,
        }));
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    [dragging, dragOffset, isPanning, onNodeMove, panStart, viewBox]
  );

  // マウスアップハンドラー
  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setIsPanning(false);
  }, []);

  // ホイールハンドラー（ズーム）
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;

    setViewBox((prev) => {
      const newWidth = prev.width * scale;
      const newHeight = prev.height * scale;

      // ズームの中心を調整
      const centerX = prev.x + prev.width / 2;
      const centerY = prev.y + prev.height / 2;

      return {
        x: centerX - newWidth / 2,
        y: centerY - newHeight / 2,
        width: newWidth,
        height: newHeight,
      };
    });
  }, []);

  // ノードをレンダリング
  const renderNode = (node: TransitionNode) => {
    const isSelected = node.id === selectedNodeId;
    const isEdgeSource = node.id === edgeSourceId;
    const color = getNodeTypeColor(node.type);
    const isCircle = node.style?.shape === 'circle' || node.type === 'START' || node.type === 'END';
    const isDiamond = node.style?.shape === 'diamond' || node.type === 'DECISION';

    return (
      <g
        key={node.id}
        className={cn(
          'cursor-pointer transition-opacity',
          edgeCreationMode && !isEdgeSource && 'hover:opacity-80'
        )}
        onClick={() => onNodeSelect?.(node)}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
        onDoubleClick={() => onNodeDoubleClick?.(node)}
      >
        {isCircle ? (
          <circle
            cx={node.position.x}
            cy={node.position.y}
            r={CIRCLE_RADIUS}
            fill={node.type === 'END' ? 'transparent' : color + '30'}
            stroke={isSelected || isEdgeSource ? '#3b82f6' : color}
            strokeWidth={isSelected || isEdgeSource ? 3 : 2}
          />
        ) : isDiamond ? (
          <polygon
            points={`
              ${node.position.x + NODE_WIDTH / 2},${node.position.y}
              ${node.position.x + NODE_WIDTH},${node.position.y + NODE_HEIGHT / 2}
              ${node.position.x + NODE_WIDTH / 2},${node.position.y + NODE_HEIGHT}
              ${node.position.x},${node.position.y + NODE_HEIGHT / 2}
            `}
            fill={color + '30'}
            stroke={isSelected || isEdgeSource ? '#3b82f6' : color}
            strokeWidth={isSelected || isEdgeSource ? 3 : 2}
          />
        ) : (
          <rect
            x={node.position.x}
            y={node.position.y}
            width={NODE_WIDTH}
            height={NODE_HEIGHT}
            rx={node.style?.shape === 'rounded' ? 8 : 0}
            fill={color + '30'}
            stroke={isSelected || isEdgeSource ? '#3b82f6' : color}
            strokeWidth={isSelected || isEdgeSource ? 3 : 2}
          />
        )}

        {/* 終了ノードの二重丸 */}
        {node.type === 'END' && (
          <circle
            cx={node.position.x}
            cy={node.position.y}
            r={CIRCLE_RADIUS - 5}
            fill={color}
            stroke={color}
            strokeWidth={2}
          />
        )}

        {/* ラベル */}
        <text
          x={isCircle ? node.position.x : node.position.x + NODE_WIDTH / 2}
          y={isCircle ? node.position.y : node.position.y + NODE_HEIGHT / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-medium fill-foreground pointer-events-none"
          style={{ fontSize: '12px' }}
        >
          {node.name}
        </text>
      </g>
    );
  };

  // エッジをレンダリング
  const renderEdge = (edge: TransitionEdge) => {
    const isSelected = edge.id === selectedEdgeId;
    const path = getEdgePath(edge);
    const label = generateEdgeLabel(edge);

    if (!path) return null;

    // ラベル位置の計算
    const sourceNode = nodes.find((n) => n.id === edge.sourceNodeId);
    const targetNode = nodes.find((n) => n.id === edge.targetNodeId);

    if (!sourceNode || !targetNode) return null;

    const source = getNodeCenter(sourceNode);
    const target = getNodeCenter(targetNode);
    const labelX = (source.x + target.x) / 2;
    const labelY = (source.y + target.y) / 2 - 10;

    return (
      <g
        key={edge.id}
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onEdgeSelect?.(edge);
        }}
        onDoubleClick={() => onEdgeDoubleClick?.(edge)}
      >
        {/* 矢印マーカー */}
        <defs>
          <marker
            id={`arrow-${edge.id}`}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill={isSelected ? '#3b82f6' : '#6b7280'} />
          </marker>
        </defs>

        {/* パス（ヒット領域拡大用の透明パス） */}
        <path d={path} fill="none" stroke="transparent" strokeWidth={15} />

        {/* 表示用パス */}
        <path
          d={path}
          fill="none"
          stroke={isSelected ? '#3b82f6' : '#6b7280'}
          strokeWidth={isSelected ? 2.5 : 1.5}
          markerEnd={`url(#arrow-${edge.id})`}
        />

        {/* ラベル */}
        {label && (
          <g>
            <rect
              x={labelX - 40}
              y={labelY - 8}
              width={80}
              height={16}
              fill="white"
              opacity={0.9}
              rx={4}
            />
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-muted-foreground pointer-events-none"
              style={{ fontSize: '10px' }}
            >
              {label.length > 15 ? label.substring(0, 15) + '...' : label}
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <svg
      ref={svgRef}
      className={cn('w-full h-full bg-background', className)}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={(e) => handleMouseDown(e)}
      onWheel={handleWheel}
    >
      {/* グリッド */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-muted-foreground/20"
          />
        </pattern>
      </defs>
      <rect
        x={viewBox.x}
        y={viewBox.y}
        width={viewBox.width}
        height={viewBox.height}
        fill="url(#grid)"
      />

      {/* エッジ（ノードの下に描画） */}
      {edges.map(renderEdge)}

      {/* ノード */}
      {nodes.map(renderNode)}

      {/* エッジ作成モード時の仮線 */}
      {edgeCreationMode && edgeSourceId && (
        <line
          x1={getNodeCenter(nodes.find((n) => n.id === edgeSourceId)!).x}
          y1={getNodeCenter(nodes.find((n) => n.id === edgeSourceId)!).y}
          x2={getNodeCenter(nodes.find((n) => n.id === edgeSourceId)!).x + 50}
          y2={getNodeCenter(nodes.find((n) => n.id === edgeSourceId)!).y}
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="5,5"
        />
      )}
    </svg>
  );
}

export default DiagramCanvas;
