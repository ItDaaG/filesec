import { useRef, useState } from "react";
import type { Folder } from "@/types/file";
import { Folder as FolderIcon } from "lucide-react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteFolder as deleteFolderApi } from "@/api/fileService";

interface FolderCardProps {
  folder: Folder;
  variant?: "list" | "grid";
  onClick: (folder: Folder) => void;
  onDeleted?: (folder: Folder) => void;
}

export const FolderCard = ({ folder, variant = "list", onClick, onDeleted }: FolderCardProps) => {
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
      await deleteFolderApi(folder.id);
      setDeleted(true);
      onDeleted?.(folder);
    } catch (err) {
      console.error("Delete folder failed:", err);
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
        onClick={() => onClick(folder)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick(folder)}
        aria-label={`Open folder ${folder.name}`}
        className={`
          relative flex flex-col items-center gap-2 p-4 rounded-lg cursor-pointer
          transition-colors duration-150 h-[140px] justify-center
          ${hovered ? "bg-muted/80" : "bg-muted/30"}
        `}
      >
        <div className="absolute top-2 right-2">
          <DeleteButton
            visible={hovered && !deleting}
            onConfirm={handleDelete}
            onCancelRef={cancelRef}
            ariaLabel={`Delete folder ${folder.name}`}
          />
        </div>

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

  // --- List variant (default) ---
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
        flex items-center gap-3 p-3 rounded-lg cursor-pointer
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

      <DeleteButton
        visible={hovered && !deleting}
        onConfirm={handleDelete}
        onCancelRef={cancelRef}
        ariaLabel={`Delete folder ${folder.name}`}
      />
    </div>
  );
};
