import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { File as FileType } from "@/types/file";
import { File as FileIcon } from "lucide-react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteFile as deleteFileApi } from "@/api/fileService";
import { formatDate, formatFileSize } from "@/lib/utils";
import { QUERY_KEYS } from "@/lib/queryKeys";

interface FileCardProps {
  file: FileType;
  variant?: "list" | "grid";
  onClick?: (file: FileType) => void;
  allowDelete?: boolean;
}

export const FileCard = ({ file, variant = "list", onClick, allowDelete = true }: FileCardProps) => {
  const [hovered, setHovered] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      // Cancel in-flight file queries so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.files.all() });

      // Snapshot every ['files', ...] query for rollback
      const previous = queryClient.getQueriesData<FileType[]>({ queryKey: QUERY_KEYS.files.all() });

      // Optimistically remove this file from all file caches
      queryClient.setQueriesData<FileType[]>(
        { queryKey: QUERY_KEYS.files.all() },
        (old) => old?.filter((f) => f.id !== file.id),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback on failure
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files.all() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storageStats() });
    },
  });

  const handleMouseLeave = () => {
    setHovered(false);
    cancelRef.current?.();
  };

  const handleDelete = () => deleteMutation.mutate();

  if (variant === "grid") {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={`
          relative flex flex-col items-center gap-2 p-4 rounded-lg cursor-pointer
          transition-colors duration-150 h-[140px] justify-center
          ${hovered ? "bg-muted/80" : "bg-muted/30"}
        `}
      >
        {/* Delete button — top-right corner */}
        {allowDelete && (
          <div className="absolute top-2 right-2">
            <DeleteButton
              visible={hovered && !deleteMutation.isPending}
              onConfirm={handleDelete}
              onCancelRef={cancelRef}
              ariaLabel={`Delete ${file.filename}`}
            />
          </div>
        )}

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
      onClick={handleClick}
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

        {allowDelete && (
          <DeleteButton
            visible={hovered && !deleteMutation.isPending}
            onConfirm={handleDelete}
            onCancelRef={cancelRef}
            ariaLabel={`Delete ${file.filename}`}
          />
        )}
      </div>
    </div>
  );
};
