import { useRef, useEffect, useState } from "react";
import { getMyFiles, deleteFile as deleteFileApi } from "@/api/fileService";
import type { File as FileType } from "@/types/file";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { File as FileIcon } from "lucide-react";
import { DeleteButton } from "@/components/ui/DeleteButton";

interface RecentFilesProps {
  maxFiles?: number;
  onFileClick?: (file: FileType) => void;
}

export const RecentFiles = ({ maxFiles = 5, onFileClick }: RecentFilesProps) => {
  const [files, setFiles] = useState<FileType[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredFileId, setHoveredFileId] = useState<number | null>(null);
  const cancelRefsMap = useRef<Map<number, React.MutableRefObject<(() => void) | null>>>(new Map());

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const allFiles = await getMyFiles();
        const sorted = [...allFiles]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, maxFiles);
        setFiles(sorted);
      } catch (err) {
        console.error("Failed to fetch files:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [maxFiles]);

  const handleDelete = (file: FileType) => {
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    deleteFileApi(file.id).catch((err) => console.error("Delete failed:", err));
  };

  const getCancelRef = (fileId: number) => {
    if (!cancelRefsMap.current.has(fileId)) {
      cancelRefsMap.current.set(fileId, { current: null });
    }
    return cancelRefsMap.current.get(fileId)!;
  };

  const handleMouseLeave = (fileId: number) => {
    setHoveredFileId(null);
    cancelRefsMap.current.get(fileId)?.current?.();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024, sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
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

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Recent Files</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Recent Files</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">No files yet</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Files</CardTitle>
        <CardDescription>Your recently uploaded files</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {files.map((file) => {
          const isHovered = hoveredFileId === file.id;

          return (
            <div
              key={file.id}
              onMouseEnter={() => setHoveredFileId(file.id)}
              onMouseLeave={() => handleMouseLeave(file.id)}
              onClick={() => onFileClick?.(file)}
              className={`
                flex items-center gap-3 p-3 rounded-lg cursor-pointer
                transition-colors duration-150
                ${isHovered ? "bg-muted/80" : "bg-muted/30"}
              `}
            >
              <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.filename}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatBytes(file.file_size)}</span>
                  <span>•</span>
                  <span>{formatDate(file.created_at)}</span>
                </div>
              </div>

              {/* Right side: public badge + delete */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {file.is_public && (
                  <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                    Public
                  </span>
                )}
                <DeleteButton
                  visible={isHovered}
                  onConfirm={() => handleDelete(file)}
                  onCancelRef={getCancelRef(file.id)}
                  ariaLabel={`Delete ${file.filename}`}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
