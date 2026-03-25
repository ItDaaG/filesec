import { NavLink } from "react-router-dom";
import { Home, FolderOpen, Users, Clock, Star, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getStorageStats } from "@/api/authService";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { formatFileSize } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: Home,       label: "Home",           to: "/dashboard" },
  { icon: FolderOpen, label: "My Files",        to: "/files" },
  { icon: Users,      label: "Shared with me",  to: "/shared" },
  { icon: Clock,      label: "Recent",          to: "/recent" },
  { icon: Star,       label: "Starred",         to: "/starred" },
  { icon: Trash2,     label: "Trash",           to: "/trash" },
];

function StorageBar() {
  const { data } = useQuery({
    queryKey: QUERY_KEYS.storageStats(),
    queryFn: getStorageStats,
  });

  if (!data) return null;

  const pct = Math.min(data.storage_used_percentage, 100);

  return (
    <div className="px-4 py-4 border-t border-border space-y-2 shrink-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Storage</span>
        <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatFileSize(data.storage_used_bytes)} of {formatFileSize(data.storage_limit_bytes)} used
      </p>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="flex flex-col w-60 shrink-0 border-r border-border bg-card overflow-y-auto">
      <nav className="flex-1 py-3">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map(({ icon: Icon, label, to }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <StorageBar />
    </aside>
  );
}
