import { useAuth } from "@/context/AuthContext";
import { useSearch } from "@/context/SearchContext";
import { DashboardSearchResults } from "@/components/dashboard/DashboardSearchResults";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { DashboardRecentFiles } from "@/components/dashboard/DashboardRecentFiles";
import { FileUpload } from "@/components/files/FileUpload";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Welcome back";
}

export const DashboardPage = () => {
  const { user } = useAuth();
  const { search } = useSearch();
  const isSearching = search.trim().length > 0;

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-full p-8">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* ── Greeting ──────────────────────────────────── */}
        {!isSearching && <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {dateLabel}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreeting()}, {user?.username}
          </h1>
        </header>}

        {/* ── Global search results (conditional) ───────── */}
        {isSearching && (
          <>
            <DashboardSearchResults query={search} />
            <hr className="border-border" />
          </>
        )}

        {/* ── Stats row ─────────────────────────────────── */}
        <StatsOverview />

        {/* ── Main content ──────────────────────────────── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          <DashboardRecentFiles />
          <FileUpload />
        </div>

      </div>
    </div>
  );
};
