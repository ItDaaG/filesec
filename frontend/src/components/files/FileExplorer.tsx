import { useState, useMemo, type DragEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyFiles, getMyFolders, getSharedWithMeFiles, getSharedWithMeFolders, uploadFile } from "@/api/fileService";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { useFileDragSurface } from "@/hooks/useFileDragSurface";
import type { File as FileType, Folder } from "@/types/file";
import { FileCard } from "@/components/files/FileCard";
import { FolderCard } from "@/components/files/FolderCard";
import type { ExplorerFilterMode, ExplorerSortMode } from "@/components/files/FileExplorerToolbar";
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

function itemName(item: ExplorerItem): string {
  return item.kind === "folder" ? item.data.name : item.data.filename;
}

function itemDateMs(item: ExplorerItem): number {
  if (item.kind === "folder") return new Date(item.data.updated_at).getTime();
  return new Date(item.data.created_at).getTime();
}

function itemSizeBytes(item: ExplorerItem): number {
  return item.kind === "file" ? item.data.file_size ?? 0 : 0;
}

function compareExplorerItems(a: ExplorerItem, b: ExplorerItem, sort: ExplorerSortMode): number {
  switch (sort) {
    case "name_asc":
      return itemName(a).localeCompare(itemName(b), undefined, { sensitivity: "base" });
    case "name_desc":
      return itemName(b).localeCompare(itemName(a), undefined, { sensitivity: "base" });
    case "date_desc":
      return itemDateMs(b) - itemDateMs(a);
    case "date_asc":
      return itemDateMs(a) - itemDateMs(b);
    case "size_desc":
      return itemSizeBytes(b) - itemSizeBytes(a);
    case "size_asc":
      return itemSizeBytes(a) - itemSizeBytes(b);
    default:
      return 0;
  }
}

function sortBlock(items: ExplorerItem[], sort: ExplorerSortMode): ExplorerItem[] {
  return [...items].sort((a, b) => compareExplorerItems(a, b, sort));
}

function fileMatchesMimeFilter(file: FileType, filter: ExplorerFilterMode): boolean {
  const m = (file.mime_type ?? "").toLowerCase();
  switch (filter) {
    case "pdf":
      return m.includes("pdf");
    case "images":
      return m.startsWith("image/");
    case "video":
      return m.startsWith("video/");
    case "audio":
      return m.startsWith("audio/");
    default:
      return true;
  }
}

function applyExplorerFilterAndSort(
  items: ExplorerItem[],
  filter: ExplorerFilterMode,
  sort: ExplorerSortMode,
): ExplorerItem[] {
  const folders = items.filter((i) => i.kind === "folder");
  const files = items.filter((i) => i.kind === "file");

  if (filter === "all") {
    return [...sortBlock(folders, sort), ...sortBlock(files, sort)];
  }
  if (filter === "folders") {
    return sortBlock(folders, sort);
  }
  if (filter === "files") {
    return sortBlock(files, sort);
  }
  const matched = files.filter((i) => fileMatchesMimeFilter(i.data, filter));
  return sortBlock(matched, sort);
}

export type FileExplorerScope = "owned" | "shared";

interface FileExplorerProps {
  search: string;
  viewMode: "list" | "grid";
  sortMode: ExplorerSortMode;
  filterMode: ExplorerFilterMode;
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
  sortMode,
  filterMode,
  folderId,
  onFolderOpen,
  scope = "owned",
  allowItemActions = true,
}: FileExplorerProps) => {
  const queryClient = useQueryClient();
  const { isDragOver, dragSurfaceHandlers, resetDragHighlight } = useFileDragSurface();
  const [dropError, setDropError] = useState<string | null>(null);

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

  const { data: sharedFiles = [], isLoading: sharedFilesLoading } = useQuery({
    queryKey: QUERY_KEYS.sharedFilesByFolder(folderId),
    queryFn: () => getSharedWithMeFiles(folderId, folderId === null),
    enabled: scope === "shared",
  });

  const { data: sharedFolders = [], isLoading: sharedFoldersLoading } = useQuery({
    queryKey: QUERY_KEYS.sharedFoldersByParent(folderId),
    queryFn: () => getSharedWithMeFolders(folderId),
    enabled: scope === "shared",
  });

  const files = useMemo(() => {
    if (scope === "owned") return ownedFiles;
    return sharedFiles;
  }, [scope, ownedFiles, sharedFiles]);

  const folders = useMemo(() => {
    if (scope === "owned") return ownedFolders;
    return sharedFolders;
  }, [scope, ownedFolders, sharedFolders]);

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

  const displayItems = useMemo(
    () => applyExplorerFilterAndSort(allItems, filterMode, sortMode),
    [allItems, filterMode, sortMode],
  );

  const allowDelete = allowItemActions;
  const allowManage = allowItemActions;

  const listEpoch = `${folderId ?? "root"}|${search}|${scope}|${sortMode}|${filterMode}`;

  let body: ReactNode;
  if (loading) {
    body = <div className="text-center text-muted-foreground py-12">Loading…</div>;
  } else if (allItems.length === 0) {
    const empty =
      scope === "shared"
        ? search
          ? `No results for "${search}"`
          : "No shared files or folders here."
        : search
          ? `No results for "${search}"`
          : "No files or folders yet.";
    body = <div className="text-center text-muted-foreground py-12">{empty}</div>;
  } else if (displayItems.length === 0) {
    body = (
      <div className="text-center text-muted-foreground py-12">
        Nothing matches the current filter. Try &quot;Filter: All&quot;.
      </div>
    );
  } else {
    body = (
      <FileExplorerListBody
        key={listEpoch}
        allItems={displayItems}
        viewMode={viewMode}
        onFolderOpen={onFolderOpen}
        allowDelete={allowDelete}
        allowManage={allowManage}
      />
    );
  }

  const results = <div className="min-h-0 flex-1 overflow-auto">{body}</div>;

  if (scope !== "owned") {
    return <div className="flex h-full min-h-0 flex-col">{results}</div>;
  }

  const onOwnedDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resetDragHighlight();

    const list = e.dataTransfer.files;
    if (!list || list.length === 0) return;

    setDropError(null);
    void (async () => {
      try {
        for (const file of Array.from(list)) {
          await uploadFile(file, false, [], folderId);
        }
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files.all() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storageStats() });
      } catch (err: unknown) {
        const ax = err as { response?: { data?: { detail?: string } }; message?: string };
        const msg = ax.response?.data?.detail || ax.message || "Upload failed";
        setDropError(typeof msg === "string" ? msg : "Upload failed");
      }
    })();
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col rounded-lg transition-colors",
        isDragOver && "bg-primary/5 ring-2 ring-primary/40 ring-inset",
      )}
      {...dragSurfaceHandlers}
      onDrop={onOwnedDrop}
    >
      {results}
      {dropError ? (
        <p className="mt-2 text-center text-sm text-destructive" role="alert">
          {dropError}
        </p>
      ) : null}
    </div>
  );
};
