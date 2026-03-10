import { useEffect, useState, useMemo } from "react";
import { getMyFiles, getMyFolders } from "@/api/fileService";
import type { File as FileType, Folder } from "@/types/file";
import { File as FileIcon, Folder as FolderIcon } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 10;

interface FileExplorerProps {
  search: string;
}

// --- Helpers ---

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDate = (dateString: string): string => {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
};

// --- Component ---

export const FileExplorer = ({ search }: FileExplorerProps) => {
  const [files, setFiles] = useState<FileType[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Fetch files and folders on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedFiles, fetchedFolders] = await Promise.all([
          getMyFiles(),
          getMyFolders(),
        ]);
        setFiles(fetchedFiles);
        setFolders(fetchedFolders);
      } catch (err) {
        console.error("Failed to load files/folders:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter by search term
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

  // Combine: folders first, then files
  type ExplorerItem =
    | { kind: "folder"; data: Folder }
    | { kind: "file"; data: FileType };

  const allItems = useMemo<ExplorerItem[]>(() => {
    const folderItems: ExplorerItem[] = filteredFolders.map((f) => ({
      kind: "folder",
      data: f,
    }));
    const fileItems: ExplorerItem[] = filteredFiles.map((f) => ({
      kind: "file",
      data: f,
    }));
    return [...folderItems, ...fileItems];
  }, [filteredFolders, filteredFiles]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return allItems.slice(start, start + ITEMS_PER_PAGE);
  }, [allItems, page]);

  // --- Render ---

  if (loading) {
    return (
      <div className="text-center text-muted-foreground py-12">Loading…</div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        {search ? `No results for "${search}"` : "No files or folders yet."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Item list */}
      <div className="space-y-1">
        {paginatedItems.map((item) =>
          item.kind === "folder" ? (
            <FolderRow key={`folder-${item.data.id}`} folder={item.data} />
          ) : (
            <FileRow key={`file-${item.data.id}`} file={item.data} />
          )
        )}
      </div>

      {/* Pagination controls */}
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

// --- Row sub-components ---

const FolderRow = ({ folder }: { folder: Folder }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-muted/80 bg-muted/30">
    <FolderIcon className="h-5 w-5 text-primary flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{folder.name}</p>
      <p className="text-xs text-muted-foreground">{formatDate(folder.created_at)}</p>
    </div>
  </div>
);

const FileRow = ({ file }: { file: FileType }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-muted/80 bg-muted/30">
    <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{file.filename}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{formatBytes(file.file_size)}</span>
        <span>•</span>
        <span>{formatDate(file.created_at)}</span>
      </div>
    </div>
    {file.is_public && (
      <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary flex-shrink-0">
        Public
      </span>
    )}
  </div>
);
