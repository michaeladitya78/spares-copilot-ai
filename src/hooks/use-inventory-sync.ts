import { useState, useEffect, useCallback } from 'react';

export interface InventoryStatus {
  totalParts: number;
  inStock: number;
  outOfStock: number;
  lowStock: number;
  featured: number;
  lastUpdated: string;
}

export function useInventorySync() {
  const [status, setStatus] = useState<InventoryStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventoryStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/inventory/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        setError('Failed to fetch inventory status');
      }
    } catch (err) {
      setError('Network error while fetching inventory');
      console.error('Inventory sync error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshInventory = useCallback(() => {
    setIsLoading(true);
    fetchInventoryStatus();
  }, [fetchInventoryStatus]);

  useEffect(() => {
    // Initial fetch
    fetchInventoryStatus();

    // Set up polling for real-time updates
    const interval = setInterval(fetchInventoryStatus, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [fetchInventoryStatus]);

  return {
    status,
    isLoading,
    error,
    refreshInventory
  };
}
