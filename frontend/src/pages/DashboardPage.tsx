import { useAuth } from "@/context/AuthContext";
import { StorageStatsCard } from "@/components/dashboard/StorageStatsCard";
import { FileUpload } from "@/components/files/FileUpload";
import { RecentFiles } from "@/components/files/RecentFiles";

export const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Hello, {user?.username}</h1>
      </div>

      <div className="flex justify-left gap-6 mb-8">
        <StorageStatsCard />
        <FileUpload />
      </div>

      <div className="max-w-md">
        <RecentFiles />
      </div>
    </div>
  );
};
