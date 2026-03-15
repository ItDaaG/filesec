import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createFolder } from "@/api/fileService";

interface CreateFolderButtonProps {
  parentId: number | null;
}

export const CreateFolderButton = ({ parentId }: CreateFolderButtonProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (folderName: string) => createFolder(folderName, parentId),
    onSuccess: () => {
      setOpen(false);
      setName("");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.folders.all() });
    },
  });

  const handleOpen = () => {
    setName("");
    setOpen(true);
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    setOpen(false);
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} aria-label="New folder">
        <FolderPlus className="h-4 w-4" />
        New Folder
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>

          <Input
            autoFocus
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={createMutation.isPending}
            aria-label="Folder name"
          />

          {createMutation.isError && (
            <p className="text-sm text-destructive">{(createMutation.error as any)?.response?.data?.detail || "Failed to create folder"}</p>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={handleClose} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
