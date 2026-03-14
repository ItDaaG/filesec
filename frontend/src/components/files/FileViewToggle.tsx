import { List, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ViewMode = "list" | "grid";

interface FileViewToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const FileViewToggle = ({ viewMode, onChange }: FileViewToggleProps) => {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant={viewMode === "list" ? "default" : "ghost"}
        size="icon"
        onClick={() => onChange("list")}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "grid" ? "default" : "ghost"}
        size="icon"
        onClick={() => onChange("grid")}
        aria-label="Grid view"
      >
        <Grid3x3 className="h-4 w-4" />
      </Button>
    </div>
  );
};

