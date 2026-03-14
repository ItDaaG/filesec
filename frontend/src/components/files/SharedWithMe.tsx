import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSharedWithMeFiles } from "@/api/fileService";
import { QUERY_KEYS } from "@/lib/queryKeys";
import type { File as FileType } from "@/types/file";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { File as FileIcon, User } from "lucide-react";

interface SharedWithMeProps {
  maxFiles?: number;
  onFileClick?: (file: FileType) => void;
}

export const SharedWithMe = ({ maxFiles = 5, onFileClick }: SharedWithMeProps) => {
  const { data: allFiles = [], isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.sharedFiles(),
    queryFn: getSharedWithMeFiles,
  });

  const files = useMemo(
    () =>
      [...allFiles]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, maxFiles),
    [allFiles, maxFiles],
  );

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
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
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Shared with you</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Shared with you</CardTitle>
          <CardDescription>Files other people have shared with your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            No files have been shared with you yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Shared with you</CardTitle>
        <CardDescription>Files other people have shared with your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {files.map((file) => (
          <div
            key={file.id}
            onClick={() => onFileClick?.(file)}
            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/60 transition-colors"
          >
            <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.filename}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatBytes(file.file_size)}</span>
                <span>•</span>
                <span>{formatDate(file.created_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>Owner</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
