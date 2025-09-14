import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Star, Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PartFeatureMarkerProps {
  partData: {
    id?: string;
    partNumber: string;
    name: string;
    isFeatured?: boolean;
    features?: string[];
  };
  onFeatureUpdate?: (partId: string, updates: { isFeatured?: boolean; feature?: string }) => void;
  className?: string;
}

export const PartFeatureMarker = React.forwardRef<HTMLDivElement, PartFeatureMarkerProps>(
  ({ partData, onFeatureUpdate, className }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFeatured, setIsFeatured] = useState(partData.isFeatured || false);
    const [features, setFeatures] = useState<string[]>(partData.features || []);
    const [newFeature, setNewFeature] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);

    const handleToggleFeatured = async () => {
      if (!partData.id) return;
      
      setIsUpdating(true);
      try {
        const response = await fetch(`/api/parts/${partData.id}/feature`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFeatured: !isFeatured })
        });
        
        if (response.ok) {
          setIsFeatured(!isFeatured);
          setUpdateSuccess(true);
          setTimeout(() => setUpdateSuccess(false), 2000);
          
          if (onFeatureUpdate) {
            onFeatureUpdate(partData.id, { isFeatured: !isFeatured });
          }
        }
      } catch (error) {
        console.error('Update featured status error:', error);
      } finally {
        setIsUpdating(false);
      }
    };

    const handleAddFeature = async () => {
      if (!partData.id || !newFeature.trim() || features.includes(newFeature.trim())) return;
      
      setIsUpdating(true);
      try {
        const response = await fetch(`/api/parts/${partData.id}/feature`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feature: newFeature.trim() })
        });
        
        if (response.ok) {
          const updatedFeatures = [...features, newFeature.trim()];
          setFeatures(updatedFeatures);
          setNewFeature("");
          setUpdateSuccess(true);
          setTimeout(() => setUpdateSuccess(false), 2000);
          
          if (onFeatureUpdate) {
            onFeatureUpdate(partData.id, { feature: newFeature.trim() });
          }
        }
      } catch (error) {
        console.error('Add feature error:', error);
      } finally {
        setIsUpdating(false);
      }
    };

    const handleRemoveFeature = async (featureToRemove: string) => {
      if (!partData.id) return;
      
      setIsUpdating(true);
      try {
        // For simplicity, we'll just update the local state
        // In a real app, you'd want a DELETE endpoint for features
        const updatedFeatures = features.filter(f => f !== featureToRemove);
        setFeatures(updatedFeatures);
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 2000);
      } catch (error) {
        console.error('Remove feature error:', error);
      } finally {
        setIsUpdating(false);
      }
    };

    return (
      <div ref={ref} className={className}>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className={cn(
                "gap-2",
                isFeatured && "bg-warning/10 border-warning/30 text-warning hover:bg-warning/20"
              )}
            >
              <Star className={cn("h-4 w-4", isFeatured && "fill-current")} />
              {isFeatured ? "Featured" : "Mark as Feature"}
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Part Features</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Part Info */}
              <Card className="p-4 bg-synapse-gray-light/30">
                <div className="space-y-1">
                  <h4 className="font-medium">{partData.name}</h4>
                  <p className="text-sm font-mono text-muted-foreground">{partData.partNumber}</p>
                </div>
              </Card>
              
              {/* Featured Status */}
              <div className="space-y-3">
                <h5 className="font-medium">Featured Status</h5>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleToggleFeatured}
                    disabled={isUpdating}
                    className={cn(
                      "flex-1",
                      isFeatured 
                        ? "bg-warning text-warning-foreground hover:bg-warning/90" 
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <Star className={cn("h-4 w-4 mr-2", isFeatured && "fill-current")} />
                    {isFeatured ? "Remove from Featured" : "Mark as Featured"}
                  </Button>
                  {updateSuccess && (
                    <div className="text-success text-sm flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Updated!
                    </div>
                  )}
                </div>
              </div>
              
              {/* Custom Features */}
              <div className="space-y-3">
                <h5 className="font-medium">Custom Features</h5>
                
                {/* Current Features */}
                {features.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {feature}
                        <button
                          onClick={() => handleRemoveFeature(feature)}
                          className="ml-1 hover:text-destructive"
                          disabled={isUpdating}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Add New Feature */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a custom feature..."
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddFeature();
                      }
                    }}
                    disabled={isUpdating}
                  />
                  <Button
                    onClick={handleAddFeature}
                    disabled={!newFeature.trim() || isUpdating || features.includes(newFeature.trim())}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Featured parts appear prominently in search results and recommendations.
                Custom features help categorize and filter parts for specific use cases.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);

PartFeatureMarker.displayName = "PartFeatureMarker";
