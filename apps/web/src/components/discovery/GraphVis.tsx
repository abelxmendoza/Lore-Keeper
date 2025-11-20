import { useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  metadata?: Record<string, any>;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
  metadata?: Record<string, any>;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphVisProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  title?: string;
  height?: number;
}

export const GraphVis = ({ nodes, edges, title, height = 400 }: GraphVisProps) => {
  const graphRef = useRef<any>();

  useEffect(() => {
    if (graphRef.current) {
      // Configure graph appearance
      graphRef.current
        .nodeColor((node: GraphNode) => {
          // Color nodes by type
          const colorMap: Record<string, string> = {
            memory: '#a855f7',
            character: '#ec4899',
            location: '#06b6d4',
            event: '#10b981',
            default: '#8b5cf6'
          };
          return colorMap[node.type] || colorMap.default;
        })
        .nodeLabel((node: GraphNode) => node.label || node.id)
        .linkColor(() => 'rgba(168, 85, 247, 0.3)')
        .linkWidth((link: GraphEdge) => Math.sqrt(link.weight) || 1)
        .linkDirectionalArrowLength(6)
        .linkDirectionalArrowColor(() => 'rgba(168, 85, 247, 0.6)');
    }
  }, [nodes, edges]);

  if (!nodes || nodes.length === 0) {
    return (
      <Card className="bg-black/40 border-border/60">
        {title && (
          <CardHeader>
            <CardTitle className="text-white">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="h-64 flex items-center justify-center text-white/40">
            No graph data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const graphData: GraphData = {
    nodes,
    edges: edges.map(edge => ({
      ...edge,
      source: typeof edge.source === 'string' ? edge.source : edge.source.id,
      target: typeof edge.target === 'string' ? edge.target : edge.target.id
    }))
  };

  return (
    <Card className="bg-black/40 border-border/60">
      {title && (
        <CardHeader>
          <CardTitle className="text-white">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="rounded-lg overflow-hidden border border-border/30">
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={undefined}
            height={height}
            backgroundColor="#00000000"
            nodeRelSize={6}
            nodeVal={(node: GraphNode) => {
              // Size nodes based on connections
              const nodeEdges = edges.filter(
                e => (typeof e.source === 'string' ? e.source : e.source.id) === node.id ||
                     (typeof e.target === 'string' ? e.target : e.target.id) === node.id
              );
              return 4 + Math.sqrt(nodeEdges.length) * 2;
            }}
            onNodeHover={(node: GraphNode | null) => {
              if (graphRef.current) {
                graphRef.current.getGraph2D().canvas.style.cursor = node ? 'pointer' : 'default';
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

