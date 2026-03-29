import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFolderPermissions, revokeFolderShare, shareFolder } from "@/api/fileService";
import { QUERY_KEYS } from "@/lib/queryKeys";
import type { Folder } from "@/types/file";
import { ShareAccessPanel } from "@/components/files/ShareAccessPanel";

interface FolderShareDialogProps {
  folder: Folder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FolderShareDialog({ folder, open, onOpenChange }: FolderShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share folder</DialogTitle>
          <DialogDescription className="break-all">{folder.name}</DialogDescription>
        </DialogHeader>

        <ShareAccessPanel
          active={open}
          permissions={{
            queryKey: QUERY_KEYS.folderPermissions(folder.id),
            queryFn: () => getFolderPermissions(folder.id),
            enabled: open,
          }}
          share={(email) => shareFolder(folder.id, [email])}
          revoke={(userId) => revokeFolderShare(folder.id, userId)}
        />
      </DialogContent>
    </Dialog>
  );
}
