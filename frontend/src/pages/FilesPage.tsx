import { useState } from "react";
import { FileSearchBar } from "@/components/files/FileSearchBar";
import { FileExplorer } from "@/components/files/FileExplorer";
import { FileUpload } from "@/components/files/FileUpload";
import { FileViewToggle } from "@/components/files/FileViewToggle";

export const FilesPage = () => {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">My Files</h1>

      {/* Search bar + view toggle */}
      <div className="flex items-center justify-between gap-4">
        <FileSearchBar value={search} onChange={setSearch} />
        <FileViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      {/* Main layout: explorer + upload sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <FileExplorer search={search} viewMode={viewMode} />
        </div>
        <div className="lg:self-start">
          <FileUpload />
        </div>
      </div>
    </div>
  );
};
