import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { uploadFile } from "@/api/fileService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, Globe, Users } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { isValidEmail } from "@/lib/utils";

interface FileUploadState {
  file: File;
  isPublic: boolean;
  sharedWith: string[];
  showShared: boolean;
  sharedInput: string;
  sharedError?: string;
}

interface FileUploadProps {
  onUploadSuccess?: (file: { id: string; filename: string; file_size: number }) => void;
  onUploadError?: (error: string) => void;
  folderId?: string | null;
  className?: string;
}


export const FileUpload = ({ onUploadSuccess, onUploadError, folderId, className }: FileUploadProps) => {
  const queryClient = useQueryClient();
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateUpload = (idx: number, patch: Partial<FileUploadState>) => {
    setUploads((prev) => prev.map((u, i) => (i === idx ? { ...u, ...patch } : u)));
  };

  const handleFilesSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploads(
      Array.from(selectedFiles).map((file) => ({
        file,
        isPublic: false,
        sharedWith: [],
        showShared: false,
        sharedInput: "",
        sharedError: undefined,
      }))
    );
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelect(e.dataTransfer.files);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && uploads.length === 0 && !uploading) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const removeFile = (idx: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== idx));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addSharedUser = (idx: number, email: string) => {
    const { sharedWith } = uploads[idx];

    if (!isValidEmail(email)) {
      updateUpload(idx, {
        sharedError: "Enter a valid email address",
      });
      return;
    }

    if (sharedWith.includes(email)) return;
    updateUpload(idx, { sharedWith: [...sharedWith, email], sharedInput: "", sharedError: undefined });
  };

  const handleUpload = async () => {
    if (uploads.length === 0) { setError("Please select a file"); return; }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const total = uploads.length;
      let completed = 0;

      for (const { file, isPublic, sharedWith } of uploads) {
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            const cap = (completed + 0.9) * (100 / total);
            if (prev >= cap) { clearInterval(progressInterval); return cap; }
            return prev + (90 / total) / 10;
          });
        }, 200);

        const response = await uploadFile(file, isPublic, sharedWith, folderId);

        clearInterval(progressInterval);
        completed++;
        setUploadProgress((completed / total) * 100);
        onUploadSuccess?.({ id: response.id, filename: response.filename, file_size: response.file_size });
      }

      setUploads([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files.all() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storageStats() });
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Upload failed";
      setError(msg);
      onUploadError?.(msg);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const totalSize = uploads.reduce((sum, u) => sum + u.file.size, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Upload Files</CardTitle>
        <CardDescription>Select one or more files to upload</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="button"
          tabIndex={uploads.length === 0 && !uploading ? 0 : -1}
          aria-label="File drop zone. Press Enter or Space to select files."
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
          onClick={() => uploads.length === 0 && !uploading && fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg
            h-[160px] flex flex-col items-center justify-center
            transition-colors duration-150 overflow-y-auto
            ${uploads.length === 0 ? "cursor-pointer" : "cursor-default"}
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
            ${uploading ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFilesSelect(e.target.files)}
            className="hidden"
            disabled={uploading}
            aria-label="File input"
          />

          {uploads.length > 0 ? (
            <div className="w-full h-full px-4 py-3 space-y-2 overflow-y-auto">
              {uploads.map((upload, idx) => (
                <div
                  key={`${upload.file.name}-${idx}`}
                  className="flex flex-col p-2 rounded bg-muted/50 gap-1.5"
                >
                  {/* Main row */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{upload.file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(upload.file.size)}</p>
                    </div>

                    {/* Visibility controls */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateUpload(idx, { isPublic: !upload.isPublic }); }}
                        className={cn(
                          "p-1 rounded transition-colors",
                          upload.isPublic
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        aria-label="Make public"
                        title="Public — anyone with the link"
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateUpload(idx, { showShared: !upload.showShared }); }}
                        className={cn(
                          "p-1 rounded transition-colors",
                          upload.showShared
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        aria-label="Share with specific users"
                        title="Shared — specific users only"
                      >
                        <Users className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className="rounded-full p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors flex-shrink-0"
                      aria-label={`Remove ${upload.file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Shared-with chip input */}
                  {upload.showShared && (
                    <div
                      className="flex flex-wrap gap-1 items-center pl-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {upload.sharedWith.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded-full"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateUpload(idx, { sharedWith: upload.sharedWith.filter((e) => e !== email) });
                            }}
                            className="hover:text-red-500 transition-colors"
                            aria-label={`Remove ${email}`}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                      <input
                        type="email"
                        placeholder="Add email, press Enter"
                        value={upload.sharedInput}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateUpload(idx, { sharedInput: e.target.value, sharedError: undefined });
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const email = upload.sharedInput.trim().replace(/,$/, "");
                            if (email) addSharedUser(idx, email);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-transparent outline-none border-b border-muted-foreground/30 focus:border-primary min-w-[140px] flex-1 py-0.5 transition-colors placeholder:text-muted-foreground/50"
                      />
                      {upload.sharedError && (
                        <span className="text-xs text-destructive ml-1">
                          {upload.sharedError}
                        </span>
                      )}
                    </div>
                  )}
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
        {uploads.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {uploads.length} file{uploads.length > 1 ? "s" : ""} • {formatFileSize(totalSize)} total
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
          disabled={uploads.length === 0 || uploading}
          className="w-full"
          aria-label={`Upload ${uploads.length} file${uploads.length > 1 ? "s" : ""}`}
        >
          {uploading
            ? "Uploading..."
            : `Upload ${uploads.length > 0 ? `${uploads.length} file${uploads.length > 1 ? "s" : ""}` : "File"}`}
        </Button>
      </CardContent>
    </Card>
  );
};
