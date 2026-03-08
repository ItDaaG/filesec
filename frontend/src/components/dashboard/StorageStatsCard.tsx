import { useEffect, useState } from "react";
import { getStorageStats, type StorageStats } from "@/api/authService";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export const StorageStatsCard = () => {
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await getStorageStats();
        setStorageStats(stats);
      } catch (error) {
        console.error("Failed to fetch storage stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading || !storageStats) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Storage Usage</CardTitle>
        <CardDescription>
          {storageStats.account_tier.charAt(0).toUpperCase() + storageStats.account_tier.slice(1)} Plan
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <CircularProgress value={storageStats.storage_used_percentage} size={160} strokeWidth={12}>
          <div className="text-center">
            <div className="text-2xl font-bold">{storageStats.storage_used_percentage.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Used</div>
          </div>
        </CircularProgress>
        <div className="text-center space-y-1">
          <div className="text-sm text-muted-foreground">
            {formatBytes(storageStats.storage_used_bytes)} of {formatBytes(storageStats.storage_limit_bytes)} used
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
