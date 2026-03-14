import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyFiles, getMyFolders } from "@/api/fileService";
import { QUERY_KEYS } from "@/lib/queryKeys";
import type { File as FileType, Folder } from "@/types/file";
import { FileCard } from "@/components/files/FileCard";
import { FolderCard } from "@/components/files/FolderCard";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 12;

type ExplorerItem =
  | { kind: "folder"; data: Folder }
  | { kind: "file"; data: FileType };

interface FileExplorerProps {
  search: string;
  viewMode: "list" | "grid";
  /** null = root; number = contents of that folder */
  folderId: number | null;
  /** Called when the user clicks a folder to open it */
  onFolderOpen: (folder: Folder) => void;
}

// --- Component ---

export const FileExplorer = ({ search, viewMode, folderId, onFolderOpen }: FileExplorerProps) => {
  const [page, setPage] = useState(1);

  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: QUERY_KEYS.files.byFolder(folderId),
    queryFn: () => getMyFiles(folderId, folderId === null),
  });

  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: QUERY_KEYS.folders.byParent(folderId),
    queryFn: () => getMyFolders(folderId),
  });

  const loading = filesLoading || foldersLoading;

  // Reset pagination when folder or search changes
  useEffect(() => { setPage(1); }, [folderId, search]);

  const filteredFolders = useMemo(() => {
    if (!search) return folders;
    const lower = search.toLowerCase();
    return folders.filter((f) => f.name.toLowerCase().includes(lower));
  }, [folders, search]);

  const filteredFiles = useMemo(() => {
    if (!search) return files;
    const lower = search.toLowerCase();
    return files.filter((f) => f.filename.toLowerCase().includes(lower));
  }, [files, search]);

  const allItems = useMemo<ExplorerItem[]>(() => [
    ...filteredFolders.map<ExplorerItem>((f) => ({ kind: "folder", data: f })),
    ...filteredFiles.map<ExplorerItem>((f) => ({ kind: "file", data: f })),
  ], [filteredFolders, filteredFiles]);

  const totalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return allItems.slice(start, start + ITEMS_PER_PAGE);
  }, [allItems, page]);

  // --- Render ---

  if (loading) {
    return <div className="text-center text-muted-foreground py-12">Loading…</div>;
  }

  if (allItems.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        {search ? `No results for "${search}"` : "No files or folders yet."}
      </div>
    );
  }

  const isGrid = viewMode === "grid";

  return (
    <div className="space-y-4">
      <div
        className={
          isGrid
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            : "space-y-2"
        }
      >
        {paginatedItems.map((item) =>
          item.kind === "folder" ? (
            <FolderCard
              key={`folder-${item.data.id}`}
              folder={item.data}
              variant={viewMode}
              onClick={onFolderOpen}
            />
          ) : (
            <FileCard
              key={`file-${item.data.id}`}
              file={item.data}
              variant={viewMode}
            />
          )
        )}
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <PaginationItem key={num}>
                <PaginationLink
                  isActive={num === page}
                  onClick={() => setPage(num)}
                  className="cursor-pointer"
                >
                  {num}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};
