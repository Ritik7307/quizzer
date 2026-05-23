import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "success" | "warning" | "outline" }) {
  const variants = {
    default: "bg-violet-900/50 text-violet-300",
    success: "bg-emerald-900/50 text-emerald-300",
    warning: "bg-amber-900/50 text-amber-300",
    outline: "border border-neutral-700 text-neutral-300",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant], className)}
      {...props}
    />
  );
}
