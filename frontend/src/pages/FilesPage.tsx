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
import { FileUpload } from "@/components/files/FileUpload";
import { FileBreadcrumbs } from "@/components/files/FileBreadcrumbs";
import { useSearch } from "@/context/SearchContext";

export const FilesPage = () => {
  const { folderId: folderIdParam } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();

  const folderId = folderIdParam ?? null;

  // Search lives in the top bar via SearchContext
  const { search, setSearch } = useSearch();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortMode, setSortMode] = useState<ExplorerSortMode>("name_asc");
  const [filterMode, setFilterMode] = useState<ExplorerFilterMode>("all");

  const { data: breadcrumbs = [], isLoading: breadcrumbsLoading } = useQuery({
    queryKey: QUERY_KEYS.breadcrumbs(folderId),
    queryFn: () => folderId ? buildBreadcrumbs(folderId) : [],
    enabled: folderId !== null,
  });

  // Reset search when navigating into/out of folders
  useEffect(() => {
    setSearch("");
  }, [folderId, setSearch]);

  const handleFolderOpen = (folder: Folder) => {
    navigate(`/files/folders/${folder.id}`);
  };

  const handleBreadcrumbNavigate = (id: string | null) => {
    if (id === null) {
      navigate("/files");
    } else {
      navigate(`/files/folders/${id}`);
    }
  };

  return (
    <div className="flex min-h-full flex-col p-8 space-y-4">
      <h1 className="text-3xl font-bold">My Files</h1>

      {/* Breadcrumbs — only visible when inside a folder */}
      <FileBreadcrumbs breadcrumbs={breadcrumbs} onNavigate={handleBreadcrumbNavigate} isLoading={breadcrumbsLoading} />
      {/* Main layout: explorer left, upload sidebar right */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-h-0 h-full flex-col">
          <FileExplorerToolbar
            folderId={folderId}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortMode={sortMode}
            filterMode={filterMode}
            onSortChange={setSortMode}
            onFilterChange={setFilterMode}
          />
          <div className="min-h-0 flex-1">
            <FileExplorer
              search={search}
              viewMode={viewMode}
              sortMode={sortMode}
              filterMode={filterMode}
              folderId={folderId}
              onFolderOpen={handleFolderOpen}
            />
          </div>
        </div>
        <div className="lg:self-start">
          <FileUpload folderId={folderId} />
        </div>
      </div>
    </div>
  );
};
