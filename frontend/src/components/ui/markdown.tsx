import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownProps) {
  // Strip frontmatter (--- ... ---) from the markdown content
  const cleanContent = content.replace(/^---\n[\s\S]*?\n---\n/, '');

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-3xl font-extrabold tracking-tight mt-6 mb-6 text-foreground" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-2xl font-bold tracking-tight mt-10 mb-4 border-b border-border/50 pb-2 text-foreground" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xl font-semibold tracking-tight mt-8 mb-3 text-foreground" {...props} />,
          p: ({ node, ...props }) => <p className="leading-relaxed [&:not(:first-child)]:mt-5 text-muted-foreground text-base" {...props} />,
          ul: ({ node, ...props }) => <ul className="my-5 ml-6 list-disc space-y-2 text-muted-foreground marker:text-primary/70" {...props} />,
          ol: ({ node, ...props }) => <ol className="my-5 ml-6 list-decimal space-y-2 text-muted-foreground marker:text-primary/70 marker:font-semibold" {...props} />,
          li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="mt-6 border-l-4 border-primary/60 pl-5 italic text-muted-foreground bg-primary/5 py-3 pr-4 rounded-r-xl shadow-sm" {...props} />
          ),
          pre: ({ node, ...props }) => (
            <div className="relative my-6 rounded-xl bg-zinc-950 p-4 overflow-x-auto border border-zinc-800 shadow-lg">
              <pre {...props} />
            </div>
          ),
          code: ({ node, className, children, ...props }: any) => {
            const isInline = !className?.includes("language-");
            return (
               <code
                className={cn(
                  "font-mono text-sm",
                  isInline
                    ? "relative rounded-md bg-muted/60 px-[0.4rem] py-[0.2rem] font-medium text-foreground/90 border border-border/40"
                    : className
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ node, ...props }) => (
            <div className="my-8 w-full overflow-y-auto rounded-xl border border-border bg-card">
              <table className="w-full border-collapse" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => <th className="border-b border-border bg-muted/30 px-4 py-3 text-left font-semibold text-foreground" {...props} />,
          td: ({ node, ...props }) => <td className="border-b border-border/50 px-4 py-3 text-left text-muted-foreground last:border-0" {...props} />,
          a: ({ node, ...props }) => <a className="font-medium text-primary decoration-primary/30 underline underline-offset-4 hover:decoration-primary transition-all" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}
