import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSharedWithMeFiles } from "@/api/fileService";
import { QUERY_KEYS } from "@/lib/queryKeys";
import type { File as FileType } from "@/types/file";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCard } from "@/components/files/FileCard";

interface SharedWithMeProps {
  maxFiles?: number;
  onFileClick?: (file: FileType) => void;
}

export const SharedWithMe = ({ maxFiles = 3, onFileClick }: SharedWithMeProps) => {
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
          <FileCard
            key={file.id}
            file={file}
            variant="list"
            allowDelete={false}
            allowManageActions={false}
            onClick={onFileClick}
          />
        ))}
      </CardContent>
    </Card>
  );
};
