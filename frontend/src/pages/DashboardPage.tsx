import { useAuth } from "@/context/AuthContext";
import { StorageStatsCard } from "@/components/dashboard/StorageStatsCard";
import { FileUpload } from "@/components/files/FileUpload";
import { RecentFiles } from "@/components/files/RecentFiles";
import { SharedWithMe } from "@/components/files/SharedWithMe";

export const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Hello, {user?.username}</h1>
      </div>

      <div className="flex flex-wrap gap-6">
        <StorageStatsCard />
        <FileUpload />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <RecentFiles />
        <SharedWithMe />
      </div>
    </div>
  );
};
