import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Folder } from "@/types/file";
import { buildBreadcrumbs } from "@/api/fileService";
import { FileSearchBar } from "@/components/files/FileSearchBar";
import { FileExplorer } from "@/components/files/FileExplorer";
import { FileUpload } from "@/components/files/FileUpload";
import { FileViewToggle } from "@/components/files/FileViewToggle";
import { FileBreadcrumbs } from "@/components/files/FileBreadcrumbs";
import type { Breadcrumb } from "@/components/files/FileBreadcrumbs";
import { CreateFolderButton } from "@/components/files/CreateFolderButton";


export const FilesPage = () => {
  const { folderId: folderIdParam } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();

  const folderId = folderIdParam ? parseInt(folderIdParam, 10) : null;

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Rebuild breadcrumbs whenever folderId changes in the URL.
  // This handles refresh, direct links, and browser back/forward correctly.
  useEffect(() => {
    if (folderId === null) {
      setBreadcrumbs([]);
      return;
    }

    buildBreadcrumbs(folderId)
      .then(setBreadcrumbs)
      .catch(() => setBreadcrumbs([]));
  }, [folderId]);

  // Reset search when navigating into/out of folders
  useEffect(() => {
    setSearch("");
  }, [folderId]);

  const handleFolderOpen = (folder: Folder) => {
    navigate(`/files/folders/${folder.id}`);
  };

  const handleBreadcrumbNavigate = (id: number | null) => {
    if (id === null) {
      navigate("/files");
    } else {
      navigate(`/files/folders/${id}`);
    }
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">My Files</h1>

      {/* Breadcrumbs — only visible when inside a folder */}
      <FileBreadcrumbs breadcrumbs={breadcrumbs} onNavigate={handleBreadcrumbNavigate} />

      {/* Search bar + actions */}
      <div className="flex items-center justify-between gap-4">
        <FileSearchBar value={search} onChange={setSearch} />
        <div className="flex items-center gap-2">
          <CreateFolderButton parentId={folderId} onCreated={() => setRefreshKey((k) => k + 1)} />
          <FileViewToggle viewMode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* Main layout: explorer left, upload sidebar right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <FileExplorer
            search={search}
            viewMode={viewMode}
            folderId={folderId}
            onFolderOpen={handleFolderOpen}
            refreshKey={refreshKey}
          />
        </div>
        <div className="lg:self-start">
          <FileUpload folderId={folderId} />
        </div>
      </div>
    </div>
  );
};
