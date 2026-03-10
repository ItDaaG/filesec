import { useState } from "react";
import { FileSearchBar } from "@/components/files/FileSearchBar";
import { FileExplorer } from "@/components/files/FileExplorer";

export const FilesPage = () => {
  const [search, setSearch] = useState("");

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">My Files</h1>

      <FileSearchBar value={search} onChange={setSearch} />

      <FileExplorer search={search} />
    </div>
  );
};
