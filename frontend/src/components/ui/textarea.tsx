import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-base text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:text-sm",
        className
      )}
      {...props}
    />
  );
}
