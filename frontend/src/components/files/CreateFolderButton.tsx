import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { FolderPlus } from "lucide-react";
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
import { createFolder, shareFolder } from "@/api/fileService";

interface CreateFolderButtonProps {
  parentId: string | null;
}

function parseEmailList(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const CreateFolderButton = ({ parentId }: CreateFolderButtonProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shareEmailsRaw, setShareEmailsRaw] = useState("");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async ({
      folderName,
      emailsToShare,
    }: {
      folderName: string;
      emailsToShare: string[];
    }) => {
      const folder = await createFolder(folderName, parentId);
      if (emailsToShare.length === 0) return folder;
      await shareFolder(folder.id, emailsToShare);
      return folder;
    },
    onSuccess: (folder) => {
      setOpen(false);
      setName("");
      setShareEmailsRaw("");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.folders.all() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.folderPermissions(folder.id) });
    },
  });

  const handleOpen = () => {
    setName("");
    setShareEmailsRaw("");
    setOpen(true);
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    setOpen(false);
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate({ folderName: trimmed, emailsToShare: parseEmailList(shareEmailsRaw) });
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} aria-label="New folder">
        <FolderPlus className="h-4 w-4" />
        New Folder
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>Create a folder. Optionally invite people by email.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-folder-name">Name</Label>
              <Input
                id="new-folder-name"
                autoFocus
                placeholder="Folder name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                disabled={createMutation.isPending}
                aria-label="Folder name"
              />
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label htmlFor="new-folder-share">Invite (optional)</Label>
              <Input
                id="new-folder-share"
                placeholder="email@example.com, …"
                value={shareEmailsRaw}
                onChange={(e) => setShareEmailsRaw(e.target.value)}
                disabled={createMutation.isPending}
                aria-label="Emails to share with"
              />
            </div>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-destructive">
              {(createMutation.error as { response?: { data?: { detail?: string } } })?.response?.data
                ?.detail ?? "Something went wrong"}
            </p>
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
