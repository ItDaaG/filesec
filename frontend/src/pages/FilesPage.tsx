import { useState } from "react";
import { List, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileSearchBar } from "@/components/files/FileSearchBar";
import { FileExplorer } from "@/components/files/FileExplorer";

export const FilesPage = () => {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">My Files</h1>

      {/* Search bar + view toggle */}
      <div className="flex items-center justify-between gap-4">
        <FileSearchBar value={search} onChange={setSearch} />

        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <FileExplorer search={search} viewMode={viewMode} />
    </div>
  );
};
