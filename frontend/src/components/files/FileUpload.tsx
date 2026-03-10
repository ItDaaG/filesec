import { useState, useRef } from "react";
import { uploadFile } from "@/api/fileService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";

interface FileUploadProps {
  onUploadSuccess?: (file: { id: number; filename: string; file_size: number }) => void;
  onUploadError?: (error: string) => void;
  defaultIsPublic?: boolean;
  className?: string;
}

export const FileUpload = ({
  onUploadSuccess,
  onUploadError,
  defaultIsPublic = false,
  className,
}: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(defaultIsPublic);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate progress (since we don't have actual upload progress from the API)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await uploadFile(file, isPublic);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setFile(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (onUploadSuccess) {
        onUploadSuccess({
          id: response.id,
          filename: response.filename,
          file_size: response.file_size,
        });
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

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Upload File</CardTitle>
        <CardDescription>Select a file to upload to your storage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && !uploading && fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg
            h-[120px] flex items-center justify-center
            transition-colors duration-150
            ${file ? "cursor-default" : "cursor-pointer"}
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
            ${uploading ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />

          {file && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute top-2 right-2 rounded-full p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {file ? (
            <div className="text-center space-y-1 px-8">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
          ) : (
            <div className="text-center space-y-1 px-8">
              <p className="text-muted-foreground text-sm">Drag and drop a file here, or click to select</p>
              <p className="text-xs text-muted-foreground">Click to browse files</p>
            </div>
          )}
        </div>

        {/* Public toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            disabled={uploading}
            className="rounded border-gray-300"
          />
          <label htmlFor="isPublic" className="text-sm text-muted-foreground cursor-pointer">
            Make file public
          </label>
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="text-muted-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Upload button */}
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
      </CardContent>
    </Card>
  );
};
