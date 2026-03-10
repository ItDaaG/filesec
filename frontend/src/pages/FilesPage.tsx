import { useState } from "react";
import { FileSearchBar } from "@/components/files/FileSearchBar";

export const FilesPage = () => {
  const [search, setSearch] = useState("");

  return (
    <div className="p-8 space-y-6">
      {/* Page header */}
      <h1 className="text-3xl font-bold">My Files</h1>

      {/* Search bar */}
      <FileSearchBar value={search} onChange={setSearch} />
    </div>
  );
};
