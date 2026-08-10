import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { HardDrive, FileStack, Folder, Share2 } from "lucide-react";
import { getStorageStats } from "@/api/authService";
import { getMyFiles, getMyFolders, getSharedWithMeFiles } from "@/api/fileService";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { formatFileSize } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  /** 0–100, renders a progress bar when provided */
  progress?: number;
  onClick?: () => void;
  loading?: boolean;
}

function StatCard({ icon: Icon, label, value, sub, progress, onClick, loading }: StatCardProps) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={[
        "group text-left w-full rounded-xl border border-border bg-card p-5 transition-all duration-150",
        onClick ? "cursor-pointer hover:border-primary/40 hover:shadow-sm" : "",
      ].join(" ")}
    >
      {/* Icon */}
      <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
      </div>

      {/* Value */}
      {loading ? (
        <div className="h-8 w-20 rounded bg-muted animate-pulse mb-1" />
      ) : (
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      )}

      {/* Label */}
      <p className="mt-0.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>

      {/* Sub-line or progress */}
      {loading ? (
        <div className="mt-2 h-3 w-28 rounded bg-muted animate-pulse" />
      ) : progress !== undefined ? (
        <div className="mt-3 space-y-1">
          <p className="text-xs text-muted-foreground/70">{sub}</p>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground/70">{sub}</p>
      )}
    </Tag>
  );
}

export function StatsOverview() {
  const navigate = useNavigate();

  const { data: storage, isLoading: storageLoading } = useQuery({
    queryKey: QUERY_KEYS.storageStats(),
    queryFn: getStorageStats,
  });

  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: QUERY_KEYS.files.all(),
    queryFn: () => getMyFiles(),
  });

  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: QUERY_KEYS.folders.all(),
    queryFn: () => getMyFolders(),
  });

  const { data: shared = [], isLoading: sharedLoading } = useQuery({
    queryKey: QUERY_KEYS.sharedFilesAll(),
    queryFn: () => getSharedWithMeFiles(),
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={HardDrive}
        label="Storage"
        value={storage ? formatFileSize(storage.storage_used_bytes) : "—"}
        sub={
          storage
            ? `${storage.storage_used_percentage.toFixed(0)}% of ${formatFileSize(storage.storage_limit_bytes)}`
            : ""
        }
        progress={storage?.storage_used_percentage}
        onClick={() => navigate("/settings")}
        loading={storageLoading}
      />
      <StatCard
        icon={FileStack}
        label="Files"
        value={filesLoading ? "—" : files.length.toString()}
        sub={files.length === 1 ? "1 file stored" : `${files.length} files stored`}
        onClick={() => navigate("/files")}
        loading={filesLoading}
      />
      <StatCard
        icon={Folder}
        label="Folders"
        value={foldersLoading ? "—" : folders.length.toString()}
        sub={folders.length === 1 ? "1 folder" : `${folders.length} folders`}
        onClick={() => navigate("/files")}
        loading={foldersLoading}
      />
      <StatCard
        icon={Share2}
        label="Shared with me"
        value={sharedLoading ? "—" : shared.length.toString()}
        sub={shared.length === 1 ? "1 file shared" : `${shared.length} files shared`}
        onClick={() => navigate("/shared")}
        loading={sharedLoading}
      />
    </div>
  );
}
