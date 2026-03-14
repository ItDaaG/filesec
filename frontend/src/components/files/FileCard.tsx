import { useRef, useState } from "react";
import type { File as FileType } from "@/types/file";
import { File as FileIcon } from "lucide-react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteFile as deleteFileApi } from "@/api/fileService";
import { formatFileSize } from "@/lib/utils";

interface FileCardProps {
  file: FileType;
  variant?: "list" | "grid";
  onClick?: (file: FileType) => void;
}

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

export const FileCard = ({ file, variant = "list", onClick }: FileCardProps) => {
  const [hovered, setHovered] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const handleMouseLeave = () => {
    setHovered(false);
    cancelRef.current?.();
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteFileApi(file.id);
      setDeleted(true);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  if (deleted) return null;

  if (variant === "grid") {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={() => onClick?.(file)}
        className={`
          relative flex flex-col items-center gap-2 p-4 rounded-lg cursor-pointer
          transition-colors duration-150 h-[140px] justify-center
          ${hovered ? "bg-muted/80" : "bg-muted/30"}
        `}
      >
        {/* Delete button — top-right corner */}
        <div className="absolute top-2 right-2">
          <DeleteButton
            visible={hovered && !deleting}
            onConfirm={handleDelete}
            onCancelRef={cancelRef}
            ariaLabel={`Delete ${file.filename}`}
          />
        </div>

        <FileIcon className="h-8 w-8 text-muted-foreground" />

        <div className="text-center min-w-0 w-full px-2">
          <p className="text-sm font-medium truncate">{file.filename}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
          </p>
        </div>

        {file.is_public && (
          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
            Public
          </span>
        )}
      </div>
    );
  }

  // --- List variant (default) ---
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => onClick?.(file)}
      className={`
        flex items-center gap-3 p-3 rounded-lg cursor-pointer
        transition-colors duration-150
        ${hovered ? "bg-muted/80" : "bg-muted/30"}
      `}
    >
      <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.filename}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(file.file_size)}</span>
          <span>•</span>
          <span>{formatDate(file.created_at)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {file.is_public && (
          <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
            Public
          </span>
        )}

        <DeleteButton
          visible={hovered && !deleting}
          onConfirm={handleDelete}
          onCancelRef={cancelRef}
          ariaLabel={`Delete ${file.filename}`}
        />
      </div>
    </div>
  );
};
