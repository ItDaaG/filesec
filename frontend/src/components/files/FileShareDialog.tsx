import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFilePermissions, revokeFileShare, shareFile } from "@/api/fileService";
import { QUERY_KEYS } from "@/lib/queryKeys";
import type { File as FileType } from "@/types/file";
import { ShareAccessPanel } from "@/components/files/ShareAccessPanel";

interface FileShareDialogProps {
  file: FileType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileShareDialog({ file, open, onOpenChange }: FileShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share file</DialogTitle>
          <DialogDescription className="break-all">{file.filename}</DialogDescription>
        </DialogHeader>

        <ShareAccessPanel
          active={open}
          permissions={{
            queryKey: QUERY_KEYS.filePermissions(file.id),
            queryFn: () => getFilePermissions(file.id),
            enabled: open,
          }}
          share={(email) => shareFile(file.id, [email])}
          revoke={(userId) => revokeFileShare(file.id, userId)}
        />
      </DialogContent>
    </Dialog>
  );
}
