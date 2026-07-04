"use client";

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function SystemDiagramVisualizer({ topic }: { topic: string }) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Default mermaid diagrams based on topic
  const diagrams: Record<string, string> = {
    "load-balancing": `
      graph TD
        Client1((Client)) --> LB[Load Balancer]
        Client2((Client)) --> LB
        Client3((Client)) --> LB
        LB --> S1[Server 1]
        LB --> S2[Server 2]
        LB --> S3[Server 3]
        style LB fill:#6366f1,stroke:#4f46e5,color:#fff
        style S1 fill:#f8fafc,stroke:#cbd5e1
        style S2 fill:#f8fafc,stroke:#cbd5e1
        style S3 fill:#f8fafc,stroke:#cbd5e1
    `,
    "caching": `
      sequenceDiagram
        participant Client
        participant App as Application Server
        participant Cache as Redis Cache
        participant DB as Database
        
        Client->>App: Request Data
        App->>Cache: Check Cache
        alt Cache Hit
            Cache-->>App: Return Data
        else Cache Miss
            Cache-->>App: Not Found
            App->>DB: Query Database
            DB-->>App: Return Data
            App->>Cache: Store Data in Cache
        end
        App-->>Client: Return Response
    `,
    "database-sharding": `
      graph LR
        App[Application] --> Router{Shard Router}
        Router -.->|User ID: A-M| DB1[(Shard 1 DB)]
        Router -.->|User ID: N-Z| DB2[(Shard 2 DB)]
        Router -.->|User ID: 0-9| DB3[(Shard 3 DB)]
        style Router fill:#f59e0b,stroke:#d97706,color:#fff
        style DB1 fill:#10b981,stroke:#059669,color:#fff
        style DB2 fill:#10b981,stroke:#059669,color:#fff
        style DB3 fill:#10b981,stroke:#059669,color:#fff
    `,
    "message-queues": `
      graph LR
        P1[Producer 1] --> Q[(Message Queue)]
        P2[Producer 2] --> Q
        Q --> C1[Consumer A]
        Q --> C2[Consumer B]
        style Q fill:#8b5cf6,stroke:#7c3aed,color:#fff
    `
  };

  const code = diagrams[topic] || `
    graph TD
      A[Client] --> B[Server]
      B --> C[(Database)]
  `;

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: resolvedTheme === 'dark' ? 'dark' : 'base',
      themeVariables: {
        fontFamily: 'inherit',
      }
    });

    const renderDiagram = async () => {
      try {
        setLoading(true);
        // Add random ID to prevent caching issues if multiple exist
        const id = `mermaid-${Math.random().toString(36).substring(7)}`;
        const { svg } = await mermaid.render(id, code);
        setSvgContent(svg);
      } catch (error) {
        console.error("Mermaid parsing error:", error);
      } finally {
        setLoading(false);
      }
    };

    renderDiagram();
  }, [code, topic, resolvedTheme]);

  return (
    <div className="w-full h-full min-h-[400px] border rounded-md shadow-sm bg-background flex items-center justify-center p-4 overflow-auto">
      {loading ? (
        <Loader2 className="animate-spin text-muted-foreground h-8 w-8" />
      ) : (
        <div 
          ref={containerRef} 
          className="mermaid-container w-full h-full flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: svgContent }} 
        />
      )}
    </div>
  );
}
