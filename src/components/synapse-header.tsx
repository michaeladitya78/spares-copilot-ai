import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bot, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SynapseHeaderProps {
  className?: string;
}

export const SynapseHeader = React.forwardRef<HTMLDivElement, SynapseHeaderProps>(
  ({ className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between p-6 border-b",
          "bg-gradient-to-r from-synapse-blue-light to-background",
          className
        )}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-12 w-12 shadow-card">
              <AvatarFallback className="bg-gradient-to-br from-primary to-synapse-blue-dark text-primary-foreground">
                <Bot className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-background animate-pulse-gentle" />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-synapse-blue tracking-tight">
                Synapse
              </h1>
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                v1.0
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-Powered Spare Parts Intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-success">
            <Shield className="h-3 w-3" />
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-info">
            <Zap className="h-3 w-3" />
            <span>Real-time</span>
          </div>
        </div>
      </div>
    );
  }
);

SynapseHeader.displayName = "SynapseHeader";