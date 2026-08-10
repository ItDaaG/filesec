import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Folder } from "@/types/file";
import { buildBreadcrumbs } from "@/api/fileService";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { FileExplorer } from "@/components/files/FileExplorer";
import {
  FileExplorerToolbar,
  type ExplorerFilterMode,
  type ExplorerSortMode,
} from "@/components/files/FileExplorerToolbar";
import { FileBreadcrumbs } from "@/components/files/FileBreadcrumbs";
import { useSearch } from "@/context/SearchContext";

export const SharedPage = () => {
  const { folderId: folderIdParam } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const folderId = folderIdParam ?? null;

  const { search, setSearch } = useSearch();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortMode, setSortMode] = useState<ExplorerSortMode>("name_asc");
  const [filterMode, setFilterMode] = useState<ExplorerFilterMode>("all");

  const { data: breadcrumbs = [], isLoading: breadcrumbsLoading } = useQuery({
    queryKey: QUERY_KEYS.breadcrumbs(folderId),
    queryFn: () => (folderId ? buildBreadcrumbs(folderId) : []),
    enabled: folderId !== null,
  });

  useEffect(() => {
    setSearch("");
  }, [folderId, setSearch]);

  const handleFolderOpen = (folder: Folder) => {
    navigate(`/shared/folders/${folder.id}`);
  };

  const handleBreadcrumbNavigate = (id: string | null) => {
    if (id === null) {
      navigate("/shared");
    } else {
      navigate(`/shared/folders/${id}`);
    }
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">Shared with me</h1>

      <FileBreadcrumbs
        breadcrumbs={breadcrumbs}
        onNavigate={handleBreadcrumbNavigate}
        isLoading={breadcrumbsLoading}
        rootLabel="Shared with me"
        rootAriaLabel="Go to shared root"
      />

      <FileExplorerToolbar
        folderId={folderId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortMode={sortMode}
        filterMode={filterMode}
        onSortChange={setSortMode}
        onFilterChange={setFilterMode}
        showCreateFolder={false}
      />

      <FileExplorer
        search={search}
        viewMode={viewMode}
        sortMode={sortMode}
        filterMode={filterMode}
        folderId={folderId}
        onFolderOpen={handleFolderOpen}
        scope="shared"
        allowItemActions={false}
      />
    </div>
  );
};
