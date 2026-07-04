"use client";

import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from 'next-themes';

const initialNodes = [
  { id: '1', position: { x: 250, y: 5 }, data: { label: 'Node 1 (Root)' } },
  { id: '2', position: { x: 100, y: 100 }, data: { label: 'Node 2' } },
  { id: '3', position: { x: 400, y: 100 }, data: { label: 'Node 3' } },
  { id: '4', position: { x: 400, y: 200 }, data: { label: 'Node 4 (Leaf)' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e3-4', source: '3', target: '4', animated: true },
];

export default function GraphVisualizer({ topic }: { topic: string }) {
  const { resolvedTheme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div style={{ width: '100%', height: '400px' }} className="border rounded-md shadow-sm bg-background">
      <ReactFlow
        colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
