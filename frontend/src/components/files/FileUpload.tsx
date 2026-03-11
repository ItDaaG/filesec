import { useState, useRef } from "react";
import { uploadFile } from "@/api/fileService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";

interface FileUploadProps {
  onUploadSuccess?: (file: { id: number; filename: string; file_size: number }) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export const FileUpload = ({
  onUploadSuccess,
  onUploadError,
  className,
}: FileUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setFiles(Array.from(selectedFiles));
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesSelect(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelect(e.dataTransfer.files);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && files.length === 0 && !uploading) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const totalFiles = files.length;
      let completedFiles = 0;

      for (const file of files) {
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            const currentFileProgress = 90 / totalFiles;
            if (prev >= (completedFiles + 0.9) * (100 / totalFiles)) {
              clearInterval(progressInterval);
              return (completedFiles + 0.9) * (100 / totalFiles);
            }
            return prev + currentFileProgress / 10;
          });
        }, 200);

        const response = await uploadFile(file);

        clearInterval(progressInterval);
        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);

        if (onUploadSuccess) {
          onUploadSuccess({
            id: response.id,
            filename: response.filename,
            file_size: response.file_size,
          });
        }
      }

      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || "Upload failed";
      setError(errorMessage);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Upload Files</CardTitle>
        <CardDescription>Select one or more files to upload</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="button"
          tabIndex={files.length === 0 && !uploading ? 0 : -1}
          aria-label="File drop zone. Press Enter or Space to select files."
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
          onClick={() => files.length === 0 && !uploading && fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg
            h-[160px] flex flex-col items-center justify-center
            transition-colors duration-150 overflow-y-auto
            ${files.length === 0 ? "cursor-pointer" : "cursor-default"}
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
            ${uploading ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
            aria-label="File input"
          />

          {files.length > 0 ? (
            <div className="w-full h-full px-4 py-3 space-y-2 overflow-y-auto">
              {files.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center gap-2 p-2 rounded bg-muted/50 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="rounded-full p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center space-y-1 px-8">
              <p className="text-muted-foreground text-sm">
                Drag and drop files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">Multiple files supported</p>
            </div>
          )}
        </div>

        {/* Total size indicator */}
        {files.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {files.length} file{files.length > 1 ? "s" : ""} • {formatFileSize(totalSize)} total
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="space-y-2" role="status" aria-live="polite">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="text-muted-foreground">{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} aria-valuenow={uploadProgress} />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" role="alert">
            {error}
          </div>
        )}

        {/* Upload button */}
        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="w-full"
          aria-label={`Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
        >
          {uploading
            ? "Uploading..."
            : `Upload ${files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""}` : "File"}`}
        </Button>
      </CardContent>
    </Card>
  );
};
