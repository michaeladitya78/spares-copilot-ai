import * as React from "react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

export const TypingIndicator = React.forwardRef<HTMLDivElement, TypingIndicatorProps>(
  ({ className }, ref) => {
    return (
      <div ref={ref} className={cn("flex items-center gap-1", className)}>
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-75" />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-150" />
        </div>
        <span className="text-xs text-muted-foreground ml-2">
          Copilot is typing...
        </span>
      </div>
    );
  }
);

TypingIndicator.displayName = "TypingIndicator";