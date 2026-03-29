import { ArrowDownAZ, Check, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateFolderButton } from "@/components/files/CreateFolderButton";
import { FileViewToggle } from "@/components/files/FileViewToggle";

export type ExplorerSortMode = "name_asc" | "name_desc" | "date_desc" | "date_asc" | "size_desc" | "size_asc";

export type ExplorerFilterMode =
  | "all"
  | "folders"
  | "files"
  | "pdf"
  | "images"
  | "video"
  | "audio";

const SORT_OPTIONS: { id: ExplorerSortMode; label: string }[] = [
  { id: "name_asc", label: "Name (A–Z)" },
  { id: "name_desc", label: "Name (Z–A)" },
  { id: "date_desc", label: "Date (newest)" },
  { id: "date_asc", label: "Date (oldest)" },
  { id: "size_desc", label: "Size (largest)" },
  { id: "size_asc", label: "Size (smallest)" },
];

const FILTER_OPTIONS: { id: ExplorerFilterMode; label: string }[] = [
  { id: "all", label: "All" },
  { id: "folders", label: "Folders" },
  { id: "files", label: "Files" },
  { id: "images", label: "Images" },
  { id: "video", label: "Video" },
  { id: "pdf", label: "PDF" },
  { id: "audio", label: "Audio" },
];

interface FileExplorerToolbarProps {
  folderId: string | null;
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
  sortMode: ExplorerSortMode;
  filterMode: ExplorerFilterMode;
  onSortChange: (mode: ExplorerSortMode) => void;
  onFilterChange: (mode: ExplorerFilterMode) => void;
  /** When false, hides create-folder (e.g. shared-with-me). */
  showCreateFolder?: boolean;
}

export const FileExplorerToolbar = ({
  folderId,
  viewMode,
  onViewModeChange,
  sortMode,
  filterMode,
  onSortChange,
  onFilterChange,
  showCreateFolder = true,
}: FileExplorerToolbarProps) => {
  const sortLabel = SORT_OPTIONS.find((o) => o.id === sortMode)?.label ?? "Sort";
  const filterLabel = FILTER_OPTIONS.find((o) => o.id === filterMode)?.label ?? "Filter";

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pb-3">
      <div className="flex flex-wrap items-center gap-2">
        {showCreateFolder ? <CreateFolderButton parentId={folderId} /> : null}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              aria-label={`Sort: ${sortLabel}`}
            >
              <ArrowDownAZ className="h-4 w-4" aria-hidden />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[11rem]">
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.id}
                className="gap-2"
                onClick={() => onSortChange(opt.id)}
              >
                <span className="flex w-4 justify-center">
                  {sortMode === opt.id ? <Check className="h-4 w-4" aria-hidden /> : null}
                </span>
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              aria-label={`Filter: ${filterLabel}`}
            >
              <Filter className="h-4 w-4" aria-hidden />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[11rem]">
            {FILTER_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.id}
                className="gap-2"
                onClick={() => onFilterChange(opt.id)}
              >
                <span className="flex w-4 justify-center">
                  {filterMode === opt.id ? <Check className="h-4 w-4" aria-hidden /> : null}
                </span>
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <FileViewToggle viewMode={viewMode} onChange={onViewModeChange} />
      </div>
    </div>
  );
};
