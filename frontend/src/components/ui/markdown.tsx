import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-3xl font-extrabold tracking-tight mt-6 mb-4 text-primary" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-2xl font-bold tracking-tight mt-8 mb-4 border-b pb-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xl font-semibold tracking-tight mt-6 mb-3" {...props} />,
          p: ({ node, ...props }) => <p className="leading-7 [&:not(:first-child)]:mt-4 text-muted-foreground" {...props} />,
          ul: ({ node, ...props }) => <ul className="my-4 ml-6 list-disc space-y-2 text-muted-foreground" {...props} />,
          ol: ({ node, ...props }) => <ol className="my-4 ml-6 list-decimal space-y-2 text-muted-foreground" {...props} />,
          li: ({ node, ...props }) => <li className="leading-7" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="mt-4 border-l-4 border-primary pl-4 italic text-muted-foreground bg-muted/30 py-2 pr-4 rounded-r-md" {...props} />
          ),
          pre: ({ node, ...props }) => (
            <div className="relative my-4 rounded-lg bg-zinc-950 p-4 overflow-x-auto border border-zinc-800">
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
                    ? "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-semibold text-primary"
                    : className
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ node, ...props }) => (
            <div className="my-6 w-full overflow-y-auto">
              <table className="w-full border-collapse border border-border" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => <th className="border border-border bg-muted/50 px-4 py-2 text-left font-bold" {...props} />,
          td: ({ node, ...props }) => <td className="border border-border px-4 py-2 text-left" {...props} />,
          a: ({ node, ...props }) => <a className="font-medium text-primary underline underline-offset-4 hover:text-primary/80" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
