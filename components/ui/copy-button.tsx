import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({ content, className }: { content: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

export function CopyableCode({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("my-2 flex items-center gap-2 rounded-md border bg-muted p-2", className)}>
      <pre className="min-w-0 flex-1 overflow-x-auto text-xs">
        <code>{children}</code>
      </pre>
      <CopyButton content={children} className="shrink-0" />
    </div>
  );
}
