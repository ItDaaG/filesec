import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyFiles } from "@/api/fileService";
import type { File as FileType } from "@/types/file";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCard } from "@/components/files/FileCard";

interface RecentFilesProps {
  maxFiles?: number;
  onFileClick?: (file: FileType) => void;
}

export const RecentFiles = ({ maxFiles = 3, onFileClick }: RecentFilesProps) => {
  const { data: allFiles = [], isLoading: loading } = useQuery({
    queryKey: ["files"],
    queryFn: () => getMyFiles(),
  });

  const files = useMemo(
    () =>
      [...allFiles]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, maxFiles),
    [allFiles, maxFiles],
  );

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
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            onClick={onFileClick}
          />
        ))}
      </CardContent>
    </Card>
  );
};
