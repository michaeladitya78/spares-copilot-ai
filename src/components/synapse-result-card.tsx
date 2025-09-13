import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  Shield, 
  AlertCircle,
  Calendar,
  MapPin,
  Hash,
  Monitor,
  Copy
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PartData {
  partNumber: string;
  name: string;
  machine: string;
  inStock: boolean;
  quantity: number;
  warranty: boolean;
  warrantyDate: string | null;
  imageUrl?: string | null;
}

interface SynapseResultCardProps {
  partData: PartData;
  className?: string;
  animationDelay?: number;
}

export const SynapseResultCard = React.forwardRef<HTMLDivElement, SynapseResultCardProps>(
  ({ partData, className, animationDelay = 0 }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    React.useEffect(() => {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, animationDelay);

      return () => clearTimeout(timer);
    }, [animationDelay]);

    if (!isVisible) return null;

    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {/* Part Identification Card */}
        <Card className={cn(
          "p-6 bg-gradient-card border border-border/50 shadow-card",
          "animate-fade-in-up"
        )}>
          <div className="flex items-start gap-4">
            {partData.imageUrl ? (
              <img
                src={partData.imageUrl}
                alt={partData.name}
                className="w-16 h-16 rounded-xl object-cover border"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-synapse-blue-light rounded-xl flex items-center justify-center shadow-sm">
                <Package className="h-8 w-8 text-primary" />
              </div>
            )}
            
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">{partData.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  <code className="text-sm font-mono bg-synapse-gray-light px-2 py-0.5 rounded text-synapse-blue">
                    {partData.partNumber}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn("h-7 px-2 py-0 ml-2 text-xs border-primary/30")}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(partData.partNumber);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      } catch {}
                    }}
                    aria-label="Copy part number"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Monitor className="h-4 w-4" />
                <span>{partData.machine}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Inventory Status Card */}
        <Card className={cn(
          "p-6 bg-gradient-card border border-border/50 shadow-card",
          "animate-fade-in-up"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
              partData.inStock 
                ? "bg-gradient-to-br from-success/10 to-success/5" 
                : "bg-gradient-to-br from-destructive/10 to-destructive/5"
            )}>
              {partData.inStock ? (
                <CheckCircle className="h-6 w-6 text-success" />
              ) : (
                <XCircle className="h-6 w-6 text-destructive" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-foreground">Inventory Status</h4>
                <Badge 
                  variant={partData.inStock ? "default" : "destructive"}
                  className={cn(
                    "text-xs",
                    partData.inStock && (partData.quantity < 5
                      ? "bg-warning/20 text-warning"
                      : "bg-gradient-success text-success-foreground animate-glow")
                  )}
                >
                  {partData.inStock ? (partData.quantity < 5 ? "LOW STOCK" : "IN STOCK") : "OUT OF STOCK"}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {partData.quantity} units available
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Site A</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Warranty Status Card */}
        <Card className={cn(
          "p-6 bg-gradient-card border border-border/50 shadow-card",
          "animate-fade-in-up"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
              partData.warranty 
                ? "bg-gradient-to-br from-info/10 to-info/5" 
                : "bg-gradient-to-br from-warning/10 to-warning/5"
            )}>
              {partData.warranty ? (
                <Shield className="h-6 w-6 text-info" />
              ) : (
                <AlertCircle className="h-6 w-6 text-warning" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-foreground">Warranty Status</h4>
                <Badge 
                  variant={partData.warranty ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    partData.warranty 
                      ? "bg-info text-info-foreground" 
                      : "bg-warning/20 text-warning"
                  )}
                >
                  {partData.warranty ? "WARRANTY ACTIVE" : "NO WARRANTY"}
                </Badge>
              </div>
              
              {partData.warranty && partData.warrantyDate && (
                <div className="flex items-center gap-1 mt-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Expires: {partData.warrantyDate}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2 animate-fade-in-up">
          <Button 
            variant="default" 
            className="flex-1 bg-gradient-to-r from-primary to-synapse-blue-dark hover:from-synapse-blue-dark hover:to-primary"
          >
            Request Part
          </Button>
          <Button variant="outline" className="flex-1 border-primary/20 text-primary hover:bg-synapse-blue-light">
            View Details
          </Button>
        </div>
      </div>
    );
  }
);

SynapseResultCard.displayName = "SynapseResultCard";