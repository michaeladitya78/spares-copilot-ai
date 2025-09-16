import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Star,
  RefreshCw,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useInventorySync } from "@/hooks/use-inventory-sync";

interface InventoryStatusWidgetProps {
  className?: string;
  showRefresh?: boolean;
}

export const InventoryStatusWidget = React.forwardRef<HTMLDivElement, InventoryStatusWidgetProps>(
  ({ className, showRefresh = true }, ref) => {
    const { status, isLoading, error, refreshInventory } = useInventorySync();

    if (error) {
      return (
        <Card ref={ref} className={cn("p-4 border-destructive/20", className)}>
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">Failed to load inventory status</span>
            {showRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshInventory}
                className="ml-auto"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </Card>
      );
    }

    if (isLoading && !status) {
      return (
        <Card ref={ref} className={cn("p-4", className)}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading inventory status...</span>
          </div>
        </Card>
      );
    }

    if (!status) {
      return null;
    }

    const lastUpdated = new Date(status.lastUpdated);
    const timeAgo = getTimeAgo(lastUpdated);

    return (
      <Card ref={ref} className={cn("p-4 bg-gradient-to-br from-background to-synapse-gray-light/30", className)}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Inventory Status
            </h3>
            {showRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshInventory}
                disabled={isLoading}
                className="h-8 px-3"
              >
                <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{status.totalParts}</div>
              <div className="text-xs text-muted-foreground">Total Parts</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-success flex items-center justify-center gap-1">
                <CheckCircle className="h-4 w-4" />
                {status.inStock}
              </div>
              <div className="text-xs text-muted-foreground">In Stock</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-destructive flex items-center justify-center gap-1">
                <XCircle className="h-4 w-4" />
                {status.outOfStock}
              </div>
              <div className="text-xs text-muted-foreground">Out of Stock</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-warning flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {status.lowStock}
              </div>
              <div className="text-xs text-muted-foreground">Low Stock</div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              <Star className="h-3 w-3 mr-1" />
              {status.featured} Featured
            </Badge>
            
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Updated {timeAgo}
            </Badge>
          </div>

          {/* Health Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-gradient-to-r from-success to-primary transition-all duration-300"
                style={{ 
                  width: `${Math.round((status.inStock / status.totalParts) * 100)}%` 
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.round((status.inStock / status.totalParts) * 100)}% Available
            </span>
          </div>
        </div>
      </Card>
    );
  }
);

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

InventoryStatusWidget.displayName = "InventoryStatusWidget";
