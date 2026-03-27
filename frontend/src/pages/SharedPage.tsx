import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Folder } from "@/types/file";
import type { Breadcrumb } from "@/components/files/FileBreadcrumbs";
import { getSharedWithMeFolders } from "@/api/fileService";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { FileExplorer } from "@/components/files/FileExplorer";
import { FileViewToggle } from "@/components/files/FileViewToggle";
import { FileBreadcrumbs } from "@/components/files/FileBreadcrumbs";
import { useSearch } from "@/context/SearchContext";

/** Breadcrumb chain for a shared folder using only folders returned by shared-with-me (client-side). */
function buildSharedBreadcrumbs(folderId: string, allShared: Folder[]): Breadcrumb[] {
  const byId = new Map(allShared.map((f) => [f.id, f]));
  const crumbs: Breadcrumb[] = [];
  const seen = new Set<string>();
  let current: string | null = folderId;

  while (current && !seen.has(current)) {
    seen.add(current);
    const f = byId.get(current);
    if (!f) break;
    crumbs.unshift({ id: f.id, name: f.name });
    current = f.parent_id;
  }

  return crumbs;
}

export const SharedPage = () => {
  const { folderId: folderIdParam } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const folderId = folderIdParam ?? null;

  const { search, setSearch } = useSearch();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const { data: allSharedFolders = [], isLoading: sharedFoldersLoading } = useQuery({
    queryKey: QUERY_KEYS.sharedFolders(),
    queryFn: getSharedWithMeFolders,
  });

  const breadcrumbs = useMemo(
    () => (folderId ? buildSharedBreadcrumbs(folderId, allSharedFolders) : []),
    [folderId, allSharedFolders],
  );

  const breadcrumbsLoading = folderId !== null && sharedFoldersLoading;

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
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">Shared with me</h1>
        <FileViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      <FileBreadcrumbs
        breadcrumbs={breadcrumbs}
        onNavigate={handleBreadcrumbNavigate}
        isLoading={breadcrumbsLoading}
        rootLabel="Shared with me"
        rootAriaLabel="Go to shared root"
      />

      <FileExplorer
        search={search}
        viewMode={viewMode}
        folderId={folderId}
        onFolderOpen={handleFolderOpen}
        scope="shared"
        allowItemActions={false}
      />
    </div>
  );
};
