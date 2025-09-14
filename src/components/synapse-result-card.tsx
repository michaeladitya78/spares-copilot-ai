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
import { PartFeatureMarker } from "@/components/part-feature-marker";

interface PartData {
  id?: string;
  partNumber: string;
  name: string;
  machine: string;
  inStock: boolean;
  quantity: number;
  warranty: boolean;
  warrantyDate: string | null;
  imageUrl?: string | null;
  isFeatured?: boolean;
  location?: string;
  features?: string[];
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
    const [isRequesting, setIsRequesting] = React.useState(false);
    const [requestSuccess, setRequestSuccess] = React.useState(false);

    React.useEffect(() => {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, animationDelay);

      return () => clearTimeout(timer);
    }, [animationDelay]);

    const handleRequestPart = async () => {
      if (!partData.id) return;
      
      setIsRequesting(true);
      try {
        const response = await fetch(`/api/parts/${partData.id}/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          setRequestSuccess(true);
          setTimeout(() => setRequestSuccess(false), 3000);
        }
      } catch (error) {
        console.error('Request part error:', error);
      } finally {
        setIsRequesting(false);
      }
    };

    const handleViewDetails = () => {
      // Create a detailed view in a new window or modal
      const detailsWindow = window.open('', '_blank', 'width=600,height=800');
      if (detailsWindow) {
        detailsWindow.document.write(`
          <html>
            <head>
              <title>Part Details - ${partData.partNumber}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                .container { max-width: 500px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { border-bottom: 2px solid #0ea5e9; padding-bottom: 15px; margin-bottom: 20px; }
                .part-number { font-family: monospace; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; }
                .section { margin: 15px 0; }
                .label { font-weight: bold; color: #475569; }
                .status { padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; }
                .in-stock { background: #10b981; }
                .out-stock { background: #ef4444; }
                .warranty { background: #0ea5e9; }
                .no-warranty { background: #6b7280; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>${partData.name}</h1>
                  <p class="part-number">${partData.partNumber}</p>
                </div>
                
                <div class="section">
                  <div class="label">Machine:</div>
                  <div>${partData.machine}</div>
                </div>
                
                <div class="section">
                  <div class="label">Location:</div>
                  <div>${partData.location || 'Site A'}</div>
                </div>
                
                <div class="section">
                  <div class="label">Inventory Status:</div>
                  <span class="status ${partData.inStock ? 'in-stock' : 'out-stock'}">
                    ${partData.inStock ? `${partData.quantity} in stock` : 'Out of stock'}
                  </span>
                </div>
                
                <div class="section">
                  <div class="label">Warranty Status:</div>
                  <span class="status ${partData.warranty ? 'warranty' : 'no-warranty'}">
                    ${partData.warranty ? `Active until ${partData.warrantyDate}` : 'No warranty'}
                  </span>
                </div>
                
                ${partData.features && partData.features.length > 0 ? `
                  <div class="section">
                    <div class="label">Features:</div>
                    <ul>
                      ${partData.features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
                
                <div class="section" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                  <small style="color: #64748b;">Generated by Synapse AI</small>
                </div>
              </div>
            </body>
          </html>
        `);
        detailsWindow.document.close();
      }
    };

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

        {/* Feature Marker */}
        <div className="flex justify-center pt-2 animate-fade-in-up">
          <PartFeatureMarker partData={partData} />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2 animate-fade-in-up">
          <Button 
            variant="default" 
            className="flex-1 bg-gradient-to-r from-primary to-synapse-blue-dark hover:from-synapse-blue-dark hover:to-primary"
            onClick={handleRequestPart}
            disabled={isRequesting || !partData.inStock}
          >
            {isRequesting ? (
              "Requesting..."
            ) : requestSuccess ? (
              "✓ Requested"
            ) : (
              "Request Part"
            )}
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 border-primary/20 text-primary hover:bg-synapse-blue-light"
            onClick={handleViewDetails}
          >
            View Details
          </Button>
        </div>
      </div>
    );
  }
);

SynapseResultCard.displayName = "SynapseResultCard";