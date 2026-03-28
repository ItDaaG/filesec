import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowRight } from "lucide-react";
import { getMyFiles, getMyFolders } from "@/api/fileService";
import type { File as FileType, Folder } from "@/types/file";
import { FileCard } from "@/components/files/FileCard";
import { FolderCard } from "@/components/files/FolderCard";
import { QUERY_KEYS } from "@/lib/queryKeys";

const MAX_PREVIEW = 5;

type SearchResult =
  | { kind: "file";   data: FileType }
  | { kind: "folder"; data: Folder };

interface DashboardSearchResultsProps {
  query: string;
}

export function DashboardSearchResults({ query }: DashboardSearchResultsProps) {
  const navigate = useNavigate();

  const { data: allFiles = [], isLoading: filesLoading } = useQuery<FileType[]>({
    queryKey: QUERY_KEYS.files.all(),
    queryFn: () => getMyFiles(),
    staleTime: 1000 * 30,
  });

  const { data: allFolders = [], isLoading: foldersLoading } = useQuery<Folder[]>({
    queryKey: QUERY_KEYS.folders.all(),
    queryFn: () => getMyFolders(),
    staleTime: 1000 * 30,
  });

  const isLoading = filesLoading || foldersLoading;

  const results = useMemo((): SearchResult[] => {
    const lower = query.trim().toLowerCase();
    if (!lower) return [];

    const matchedFolders: SearchResult[] = allFolders
      .filter((f) => f.name.toLowerCase().includes(lower))
      .map((f) => ({ kind: "folder", data: f }));

    const matchedFiles: SearchResult[] = allFiles
      .filter((f) => f.filename.toLowerCase().includes(lower))
      .map((f) => ({ kind: "file", data: f }));

    // Folders first, then files, capped at MAX_PREVIEW
    return [...matchedFolders, ...matchedFiles].slice(0, MAX_PREVIEW);
  }, [allFiles, allFolders, query]);

  const trimmed = query.trim();

  return (
    <section className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="h-3.5 w-3.5 shrink-0" />
          {isLoading ? (
            <span>Searching…</span>
          ) : (
            <span>
              {results.length === 0
                ? <>No results for <span className="font-medium text-foreground">"{trimmed}"</span></>
                : <>{results.length} result{results.length === 1 ? "" : "s"} for <span className="font-medium text-foreground">"{trimmed}"</span></>}
            </span>
          )}
        </div>

        <button
          onClick={() => navigate("/files")}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline transition-opacity"
        >
          Browse all files <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Result list */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-2 space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-2 space-y-0.5">
          {results.map((item) =>
            item.kind === "folder" ? (
              <FolderCard
                key={`folder-${item.data.id}`}
                folder={item.data}
                variant="list"
                onClick={() => navigate(`/files/folders/${item.data.id}`)}
                allowDelete={true}
                allowManageActions={true}
              />
            ) : (
              <FileCard
                key={`file-${item.data.id}`}
                file={item.data}
                variant="list"
                allowDelete={true}
                allowManageActions={true}
              />
            )
          )}
        </div>
      ) : null}
    </section>
  );
}
