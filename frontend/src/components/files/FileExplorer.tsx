import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyFiles, getMyFolders, getSharedWithMeFiles, getSharedWithMeFolders } from "@/api/fileService";
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

export type FileExplorerScope = "owned" | "shared";

interface FileExplorerProps {
  search: string;
  viewMode: "list" | "grid";
  /** null = root; string (UUID) = contents of that folder */
  folderId: string | null;
  /** Called when the user clicks a folder to open it */
  onFolderOpen: (folder: Folder) => void;
  /** owned = current user's files/folders API; shared = shared-with-me lists, filtered by folder */
  scope?: FileExplorerScope;
  /** When false, cards hide delete / overflow (e.g. read-only shared view) */
  allowItemActions?: boolean;
}

interface FileExplorerListBodyProps {
  allItems: ExplorerItem[];
  viewMode: "list" | "grid";
  onFolderOpen: (folder: Folder) => void;
  allowDelete: boolean;
  allowManage: boolean;
}

/** Pagination + grid/list; remounted via key on parent when folder/search/scope changes so page resets. */
function FileExplorerListBody({
  allItems,
  viewMode,
  onFolderOpen,
  allowDelete,
  allowManage,
}: FileExplorerListBodyProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return allItems.slice(start, start + ITEMS_PER_PAGE);
  }, [allItems, page]);

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
              allowDelete={allowDelete}
              allowManageActions={allowManage}
            />
          ) : (
            <FileCard
              key={`file-${item.data.id}`}
              file={item.data}
              variant={viewMode}
              allowDelete={allowDelete}
              allowManageActions={allowManage}
            />
          ),
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
}

export const FileExplorer = ({
  search,
  viewMode,
  folderId,
  onFolderOpen,
  scope = "owned",
  allowItemActions = true,
}: FileExplorerProps) => {
  const { data: ownedFiles = [], isLoading: ownedFilesLoading } = useQuery({
    queryKey: QUERY_KEYS.files.byFolder(folderId),
    queryFn: () => getMyFiles(folderId, folderId === null),
    enabled: scope === "owned",
  });

  const { data: ownedFolders = [], isLoading: ownedFoldersLoading } = useQuery({
    queryKey: QUERY_KEYS.folders.byParent(folderId),
    queryFn: () => getMyFolders(folderId),
    enabled: scope === "owned",
  });

  const { data: allSharedFiles = [], isLoading: sharedFilesLoading } = useQuery({
    queryKey: QUERY_KEYS.sharedFiles(),
    queryFn: getSharedWithMeFiles,
    enabled: scope === "shared",
  });

  const { data: allSharedFolders = [], isLoading: sharedFoldersLoading } = useQuery({
    queryKey: QUERY_KEYS.sharedFolders(),
    queryFn: getSharedWithMeFolders,
    enabled: scope === "shared",
  });

  const files = useMemo(() => {
    if (scope === "owned") return ownedFiles;
    return allSharedFiles.filter((f) =>
      folderId == null ? f.folder_id == null : f.folder_id === folderId,
    );
  }, [scope, folderId, ownedFiles, allSharedFiles]);

  const folders = useMemo(() => {
    if (scope === "owned") return ownedFolders;
    return allSharedFolders.filter((f) =>
      folderId == null ? f.parent_id == null : f.parent_id === folderId,
    );
  }, [scope, folderId, ownedFolders, allSharedFolders]);

  const loading =
    scope === "owned"
      ? ownedFilesLoading || ownedFoldersLoading
      : sharedFilesLoading || sharedFoldersLoading;

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

  const allItems = useMemo<ExplorerItem[]>(
    () => [
      ...filteredFolders.map<ExplorerItem>((f) => ({ kind: "folder", data: f })),
      ...filteredFiles.map<ExplorerItem>((f) => ({ kind: "file", data: f })),
    ],
    [filteredFolders, filteredFiles],
  );

  const allowDelete = allowItemActions;
  const allowManage = allowItemActions;

  const listEpoch = `${folderId ?? "root"}|${search}|${scope}`;

  if (loading) {
    return <div className="text-center text-muted-foreground py-12">Loading…</div>;
  }

  if (allItems.length === 0) {
    const empty =
      scope === "shared"
        ? search
          ? `No results for "${search}"`
          : "No shared files or folders here."
        : search
          ? `No results for "${search}"`
          : "No files or folders yet.";
    return <div className="text-center text-muted-foreground py-12">{empty}</div>;
  }

  return (
    <FileExplorerListBody
      key={listEpoch}
      allItems={allItems}
      viewMode={viewMode}
      onFolderOpen={onFolderOpen}
      allowDelete={allowDelete}
      allowManage={allowManage}
    />
  );
};
