import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Folder } from "@/types/file";
import { Folder as FolderIcon, MoreHorizontal, Pencil, Share2 } from "lucide-react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteFolder as deleteFolderApi, updateFolder } from "@/api/fileService";
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
import { FolderShareDialog } from "@/components/files/FolderShareDialog";

interface FolderCardProps {
  folder: Folder;
  variant?: "list" | "grid";
  onClick: (folder: Folder) => void;
  allowDelete?: boolean;
  allowManageActions?: boolean;
}

export const FolderCard = ({
  folder,
  variant = "list",
  onClick,
  allowDelete = true,
  allowManageActions = true,
}: FolderCardProps) => {
  const [hovered, setHovered] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const queryClient = useQueryClient();

  const [renameOpen, setRenameOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);

  const deleteMutation = useMutation({
    mutationFn: () => deleteFolderApi(folder.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.folders.all() });
      const previousFolders = queryClient.getQueriesData<Folder[]>({
        queryKey: QUERY_KEYS.folders.all(),
      });
      queryClient.setQueriesData<Folder[]>(
        { queryKey: QUERY_KEYS.folders.all() },
        (old) => old?.filter((f) => f.id !== folder.id),
      );
      return { previousFolders };
    },
    onError: (_err, _vars, context) => {
      context?.previousFolders.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.folders.all() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files.all() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storageStats() });
    },
  });

  const renameMutation = useMutation({
    mutationFn: (name: string) => updateFolder(folder.id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.folders.all() });
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
    if (!trimmed || trimmed === folder.name) {
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
            aria-label={`More actions for ${folder.name}`}
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
              setRenameName(folder.name);
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
                dialogTitle="Delete folder?"
                description={`This removes “${folder.name}” and everything inside it.`}
              />
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <FolderShareDialog folder={folder} open={shareOpen} onOpenChange={setShareOpen} />

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
            <DialogDescription>Choose a new name for this folder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`rename-${folder.id}`}>Name</Label>
            <Input
              id={`rename-${folder.id}`}
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
              disabled={renameMutation.isPending}
            />
            {renameMutation.isError && (
              <p className="text-sm text-destructive">
                {(renameMutation.error as { response?: { data?: { detail?: string } } })?.response
                  ?.data?.detail ?? "Could not rename folder"}
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
        onClick={() => onClick(folder)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick(folder)}
        aria-label={`Open folder ${folder.name}`}
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
              ariaLabel={`Delete folder ${folder.name}`}
            />
          </div>
        )}
        {showOverflow && (
          <div className="absolute top-2 right-2 z-10" onClick={stopCardActivation}>
            {overflowMenu}
          </div>
        )}

        <FolderIcon className="h-8 w-8 text-primary" />

        <div className="text-center min-w-0 w-full px-2">
          <p className="text-sm font-medium truncate">{folder.name}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(folder.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => onClick(folder)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick(folder)}
      aria-label={`Open folder ${folder.name}`}
      className={`
        group flex items-center gap-3 p-3 rounded-lg cursor-pointer
        transition-colors duration-150
        ${hovered ? "bg-muted/80" : "bg-muted/30"}
      `}
    >
      <FolderIcon className="h-5 w-5 text-primary flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{folder.name}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(folder.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5" onClick={stopCardActivation}>
        {showLegacyDelete && (
          <DeleteButton
            visible={hovered && !deleteMutation.isPending}
            onConfirm={handleDelete}
            onCancelRef={cancelRef}
            ariaLabel={`Delete folder ${folder.name}`}
          />
        )}
        {showOverflow && overflowMenu}
      </div>
    </div>
  );
};
