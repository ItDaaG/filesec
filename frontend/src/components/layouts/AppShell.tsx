import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { SearchProvider } from "@/context/SearchContext";

/**
 * Authenticated app shell:
 *   TopBar (full width, fixed height)
 *   ├── Sidebar (left, 240px)
 *   └── main content (right, scrollable)
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SearchProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* Top bar spans full width above sidebar */}
        <Navbar />

        {/* Below top bar: sidebar + scrollable content */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SearchProvider>
  );
}
