import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Info } from "lucide-react";
import { getFileById, downloadFile } from "@/api/fileService";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { FilePreview } from "@/components/files/FilePreview";
import { FileInfoSidebar } from "@/components/files/FileInfoSidebar";
import { Button } from "@/components/ui/button";

export const FileDetailPage = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const id = fileId ?? "";

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const {
    data: file,
    isLoading: metaLoading,
    isError: metaError,
  } = useQuery({
    queryKey: QUERY_KEYS.fileById(id),
    queryFn: () => getFileById(id),
    enabled: !!id,
  });

  const {
    data: blob,
    isLoading: blobLoading,
    isError: blobError,
  } = useQuery({
    queryKey: QUERY_KEYS.fileBlob(id),
    queryFn: () => downloadFile(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  const handleDownload = () => {
    if (!blob || !file) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!id) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Invalid file ID.</p>
        <Link to="/files" className="text-sm underline">Back to Files</Link>
      </div>
    );
  }

  if (metaLoading || blobLoading) {
    return (
      <div className="h-full flex flex-col">
        {/* Skeleton top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="h-4 w-48 bg-muted rounded animate-pulse flex-1 max-w-xs" />
        </header>
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Loading file…
        </div>
      </div>
    );
  }

  if (metaError || blobError || !file || !blob) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">File not found or could not be loaded.</p>
        <Button variant="outline" onClick={() => navigate("/files")}>
          Back to Files
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center gap-2 px-4 py-2.5 border-b bg-background/95 backdrop-blur shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="text-sm font-medium truncate flex-1 min-w-0">
          {file.filename}
        </h1>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="gap-1.5 shrink-0"
          aria-label="Download file"
        >
          <Download size={14} />
          Download
        </Button>

        <Button
          variant={sidebarOpen ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label={sidebarOpen ? "Hide details" : "Show details"}
          aria-pressed={sidebarOpen}
        >
          <Info size={16} />
        </Button>
      </header>

      {/* Content: preview + optional sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Preview pane */}
        <div className="flex-1 overflow-hidden min-w-0">
          <FilePreview blob={blob} filename={file.filename} />
        </div>

        {/* Sidebar with slide animation */}
        <aside
          className={`border-l bg-background shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out ${
            sidebarOpen ? "w-72" : "w-0 border-l-0"
          }`}
          aria-label="File details sidebar"
        >
          {/* Keep rendered to preserve query cache; hide with pointer-events */}
          <div className={`w-72 h-full ${sidebarOpen ? "" : "pointer-events-none"}`}>
            <FileInfoSidebar file={file} onClose={() => setSidebarOpen(false)} />
          </div>
        </aside>
      </div>
    </div>
  );
};
