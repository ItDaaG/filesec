import { ChevronRight, Home } from "lucide-react";

export interface Breadcrumb {
  id: number;
  name: string;
}

interface FileBreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
  /** Called with null to navigate to root, or with a folder id to jump to that level. */
  onNavigate: (id: number | null) => void;
}

export const FileBreadcrumbs = ({ breadcrumbs, onNavigate }: FileBreadcrumbsProps) => {
  // Don't render anything at root — heading alone is enough
  if (breadcrumbs.length === 0) return null;

  return (
    <nav
      aria-label="Folder navigation"
      className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap"
    >
      {/* Root anchor */}
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        aria-label="Go to My Files root"
      >
        <Home className="h-3.5 w-3.5" />
        <span>My Files</span>
      </button>

      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        return (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
            {isLast ? (
              // Current folder — not clickable
              <span className="text-foreground font-medium">{crumb.name}</span>
            ) : (
              // Ancestor — clickable to jump back up
              <button
                type="button"
                onClick={() => onNavigate(crumb.id)}
                className="hover:text-foreground transition-colors"
              >
                {crumb.name}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
};
