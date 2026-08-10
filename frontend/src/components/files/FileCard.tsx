import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { File as FileType } from "@/types/file";
import {
  File as FileIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  FileText as FileTextIcon,
  Archive as ArchiveIcon,
  Code2 as CodeIcon,
  MoreHorizontal,
  Pencil,
  Share2,
} from "lucide-react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteFile as deleteFileApi, updateFile } from "@/api/fileService";
import { formatDate, formatFileSize } from "@/lib/utils";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileShareDialog } from "@/components/files/FileShareDialog";

interface FileCardProps {
  file: FileType;
  variant?: "list" | "grid";
  onClick?: (file: FileType) => void;
  allowDelete?: boolean;
  allowManageActions?: boolean;
}

export const FileCard = ({
  file,
  variant = "list",
  onClick,
  allowDelete = true,
  allowManageActions = true,
}: FileCardProps) => {
  const [hovered, setHovered] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [renameOpen, setRenameOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [renameName, setRenameName] = useState(file.filename);

  const Icon = (() => {
    const mime = file.mime_type?.toLowerCase();
    if (!mime) return FileIcon;
    if (mime.startsWith("image/")) return ImageIcon;
    if (mime.startsWith("video/")) return VideoIcon;
    if (mime.startsWith("audio/")) return MusicIcon;
    if (mime === "application/pdf") return FileTextIcon;
    if (
      mime.includes("zip") ||
      mime.includes("rar") ||
      mime.includes("7z") ||
      mime.includes("tar") ||
      mime.includes("gzip")
    ) {
      return ArchiveIcon;
    }
    if (
      mime.startsWith("text/") ||
      mime.includes("json") ||
      mime.includes("xml") ||
      mime.includes("yaml") ||
      mime.includes("x-yaml") ||
      mime.includes("javascript") ||
      mime.includes("typescript")
    ) {
      return CodeIcon;
    }
    return FileIcon;
  })();

  const handleClick = () => {
    if (onClick) {
      onClick(file);
    } else {
      navigate(`/files/${file.id}`);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteFileApi(file.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.files.all() });
      const previous = queryClient.getQueriesData<FileType[]>({ queryKey: QUERY_KEYS.files.all() });
      queryClient.setQueriesData<FileType[]>(
        { queryKey: QUERY_KEYS.files.all() },
        (old) => old?.filter((f) => f.id !== file.id),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files.all() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storageStats() });
    },
  });

  const renameMutation = useMutation({
    mutationFn: (filename: string) => updateFile(file.id, { filename }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files.all() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fileById(file.id) });
      setRenameOpen(false);
    },
  });

  const handleMouseLeave = () => {
    setHovered(false);
    cancelRef.current?.();
  };

  const stopCardActivation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const handleDelete = () => deleteMutation.mutate();

  const handleRenameSubmit = () => {
    const trimmed = renameName.trim();
    if (!trimmed || trimmed === file.filename) {
      setRenameOpen(false);
      return;
    }
    renameMutation.mutate(trimmed);
  };

  const showOverflow = allowManageActions;
  const showLegacyDelete = allowDelete && !showOverflow;

  const overflowMenu = showOverflow ? (
    <>
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) cancelRef.current?.();
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
            aria-label={`More actions for ${file.filename}`}
            onClick={stopCardActivation}
            onPointerDown={stopCardActivation}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10.5rem]">
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => {
              setRenameName(file.filename);
              setRenameOpen(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5 opacity-70" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onSelect={() => setShareOpen(true)}>
            <Share2 className="h-3.5 w-3.5 opacity-70" />
            Share…
          </DropdownMenuItem>
          {allowDelete && (
            <>
              <DropdownMenuSeparator />
              <DeleteButton
                variant="menu"
                onConfirm={handleDelete}
                label="Delete"
                dialogTitle="Delete file?"
                description={`Permanently remove “${file.filename}”.`}
              />
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <FileShareDialog file={file} open={shareOpen} onOpenChange={setShareOpen} />

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>Choose a new filename.</DialogDescription> 
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`rename-file-${file.id}`}>Name</Label>
            <Input
              id={`rename-file-${file.id}`}
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
              disabled={renameMutation.isPending}
            />
            {renameMutation.isError && (
              <p className="text-sm text-destructive">
                {(renameMutation.error as { response?: { data?: { detail?: string } } })?.response?.data
                  ?.detail ?? "Could not rename file"}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)} disabled={renameMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={!renameName.trim() || renameMutation.isPending}
            >
              {renameMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  ) : null;

  if (variant === "grid") {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={`
          group relative flex flex-col items-center gap-2 p-4 rounded-lg cursor-pointer
          transition-colors duration-150 h-[140px] justify-center
          ${hovered ? "bg-muted/80" : "bg-muted/30"}
        `}
      >
        {showLegacyDelete && (
          <div className="absolute top-2 right-2">
            <DeleteButton
              visible={hovered && !deleteMutation.isPending}
              onConfirm={handleDelete}
              onCancelRef={cancelRef}
              ariaLabel={`Delete ${file.filename}`}
            />
          </div>
        )}
        {showOverflow && (
          <div className="absolute top-2 right-2 z-10" onClick={stopCardActivation}>
            {overflowMenu}
          </div>
        )}

        <Icon className="h-8 w-8 text-muted-foreground" />

        <div className="text-center min-w-0 w-full px-2">
          <p className="text-sm font-medium truncate">{file.filename}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
          </p>
        </div>

        {file.is_public && (
          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">Public</span>
        )}
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`
        flex items-center gap-3 p-3 rounded-lg cursor-pointer
        transition-colors duration-150
        ${hovered ? "bg-muted/80" : "bg-muted/30"}
      `}
    >
      <Icon className="h-5 w-5 text-primary flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.filename}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(file.file_size)}</span>
          <span>•</span>
          <span>{formatDate(file.created_at)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0" onClick={stopCardActivation}>
        {file.is_public && (
          <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">Public</span>
        )}

        {showLegacyDelete && (
          <DeleteButton
            visible={hovered && !deleteMutation.isPending}
            onConfirm={handleDelete}
            onCancelRef={cancelRef}
            ariaLabel={`Delete ${file.filename}`}
          />
        )}
        {showOverflow && overflowMenu}
      </div>
    </div>
  );
};
