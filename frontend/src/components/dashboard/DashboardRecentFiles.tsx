import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Clock, ArrowRight, UploadCloud } from "lucide-react";
import { getMyFiles } from "@/api/fileService";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { FileCard } from "@/components/files/FileCard";

const MAX_RECENT = 6;

export function DashboardRecentFiles() {
  const navigate = useNavigate();

  const { data: allFiles = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.files.all(),
    queryFn: () => getMyFiles(),
  });

  const recent = useMemo(
    () =>
      [...allFiles]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, MAX_RECENT),
    [allFiles],
  );

  return (
    <section className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Recent Files</h2>
          {!isLoading && allFiles.length > 0 && (
            <span className="text-xs text-muted-foreground/60 tabular-nums">
              ({allFiles.length} total)
            </span>
          )}
        </div>
        <button
          onClick={() => navigate("/files")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <UploadCloud className="h-8 w-8 text-muted-foreground/30" />
          <div>
            <p className="text-sm text-muted-foreground">No files yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">
              Upload your first file using the panel on the right
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-2 space-y-0.5">
          {recent.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              variant="list"
              allowDelete={false}
              allowManageActions={false}
            />
          ))}
        </div>
      )}
    </section>
  );
}
