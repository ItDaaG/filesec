import { useEffect, useState } from "react";
import { getMyFiles } from "@/api/fileService";
import type { File as FileType } from "@/types/file";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { File as FileIcon } from "lucide-react";

interface RecentFilesProps {
  maxFiles?: number;
  onFileClick?: (file: FileType) => void;
}

export const RecentFiles = ({
  maxFiles = 5,
  onFileClick,
}: RecentFilesProps) => {
  const [files, setFiles] = useState<FileType[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredFileId, setHoveredFileId] = useState<number | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const allFiles = await getMyFiles();
        const sortedFiles = [...allFiles]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, maxFiles);
        setFiles(sortedFiles);
      } catch (error) {
        console.error("Failed to fetch files:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [maxFiles]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Files</CardTitle>
        </CardHeader>
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
      <CardContent className="space-y-2">
        <div className="space-y-1">
          {files.map((file) => (
            <div
              key={file.id}
              onMouseEnter={() => setHoveredFileId(file.id)}
              onMouseLeave={() => setHoveredFileId(null)}
              onClick={() => onFileClick?.(file)}
              className={`
                flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200
                ${hoveredFileId === file.id 
                  ? "bg-muted/80 dark:bg-muted/60" 
                  : "bg-muted/30 hover:bg-muted/50"
                }
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
              {file.is_public && (
                <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                  Public
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
