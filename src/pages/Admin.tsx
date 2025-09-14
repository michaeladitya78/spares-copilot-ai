import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  Star,
  Plus,
  Minus,
  RefreshCw,
  Settings
} from "lucide-react";
import { InventoryStatusWidget } from "@/components/inventory-status-widget";

interface Part {
  id: string;
  partNumber: string;
  name: string;
  machine: string;
  inStock: boolean;
  quantity: number;
  warranty: boolean;
  warrantyDate: string | null;
  isFeatured: boolean;
  location: string;
  features: string[];
}

export function Admin() {
  const [parts, setParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadParts = async () => {
    try {
      setError(null);
      const response = await fetch('/api/parts');
      if (response.ok) {
        const data = await response.json();
        setParts(data.parts);
      } else {
        setError('Failed to load parts');
      }
    } catch (err) {
      setError('Network error');
      console.error('Load parts error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (partId: string, newQuantity: number) => {
    try {
      const response = await fetch(`/api/parts/${partId}/inventory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      });
      
      if (response.ok) {
        setParts(prev => prev.map(part => 
          part.id === partId 
            ? { ...part, quantity: newQuantity, inStock: newQuantity > 0 }
            : part
        ));
      }
    } catch (error) {
      console.error('Update quantity error:', error);
    }
  };

  const toggleFeatured = async (partId: string, isFeatured: boolean) => {
    try {
      const response = await fetch(`/api/parts/${partId}/feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !isFeatured })
      });
      
      if (response.ok) {
        setParts(prev => prev.map(part => 
          part.id === partId 
            ? { ...part, isFeatured: !isFeatured }
            : part
        ));
      }
    } catch (error) {
      console.error('Toggle featured error:', error);
    }
  };

  useEffect(() => {
    loadParts();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading admin panel...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-4 border-destructive/20">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadParts}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Parts Admin</h1>
        </div>
        <Button onClick={loadParts} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Inventory Overview */}
      <InventoryStatusWidget />

      {/* Parts Management */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Manage Parts</h2>
        <div className="space-y-4">
          {parts.map((part) => (
            <Card key={part.id} className="p-4 bg-gradient-to-br from-background to-synapse-gray-light/30">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{part.name}</h3>
                      <code className="text-sm text-muted-foreground">{part.partNumber}</code>
                      <p className="text-sm text-muted-foreground">{part.machine}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={part.inStock ? "default" : "destructive"}>
                        {part.inStock ? "In Stock" : "Out of Stock"}
                      </Badge>
                      {part.isFeatured && (
                        <Badge variant="secondary">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Qty:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(part.id, Math.max(0, part.quantity - 1))}
                        disabled={part.quantity <= 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={part.quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 0;
                          updateQuantity(part.id, newQty);
                        }}
                        className="w-20 text-center"
                        min="0"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(part.id, part.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Featured Toggle */}
                    <Button
                      size="sm"
                      variant={part.isFeatured ? "default" : "outline"}
                      onClick={() => toggleFeatured(part.id, part.isFeatured)}
                    >
                      <Star className={`h-3 w-3 mr-1 ${part.isFeatured ? 'fill-current' : ''}`} />
                      {part.isFeatured ? 'Unfeature' : 'Feature'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
