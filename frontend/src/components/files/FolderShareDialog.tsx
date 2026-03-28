import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFolderPermissions, revokeFolderShare, shareFolder } from "@/api/fileService";
import { QUERY_KEYS } from "@/lib/queryKeys";
import type { Folder } from "@/types/file";

function parseEmailList(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

interface FolderShareDialogProps {
  folder: Folder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FolderShareDialog({ folder, open, onOpenChange }: FolderShareDialogProps) {
  const queryClient = useQueryClient();
  const [emailInput, setEmailInput] = useState("");

  const { data: sharedUsers = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.folderPermissions(folder.id),
    queryFn: () => getFolderPermissions(folder.id),
    enabled: open,
  });

  const shareMutation = useMutation({
    mutationFn: (emails: string[]) => shareFolder(folder.id, emails),
    onSuccess: () => {
      setEmailInput("");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.folderPermissions(folder.id) });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: number) => revokeFolderShare(folder.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.folderPermissions(folder.id) });
    },
  });

  const handleShare = () => {
    const emails = parseEmailList(emailInput);
    if (emails.length === 0) return;
    shareMutation.mutate(emails);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setEmailInput("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share folder</DialogTitle>
          <DialogDescription>{folder.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-share-emails">Invite by email</Label>
            <div className="flex gap-2">
              <Input
                id="folder-share-emails"
                placeholder="name@example.com, …"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleShare()}
                disabled={shareMutation.isPending}
              />
              <Button
                type="button"
                onClick={handleShare}
                disabled={!parseEmailList(emailInput).length || shareMutation.isPending}
              >
                {shareMutation.isPending ? "Adding…" : "Add"}
              </Button>
            </div>
            {shareMutation.isError && (
              <p className="text-sm text-destructive">
                {(shareMutation.error as { response?: { data?: { detail?: string } } })?.response?.data
                  ?.detail ?? "Could not share"}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm text-muted-foreground">Shared with</p>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : sharedUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one else yet.</p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                {sharedUsers.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.username}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeMutation.mutate(u.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
