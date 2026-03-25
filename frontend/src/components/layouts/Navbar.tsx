import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { setAuthToken } from '@/api/client';
import { FileSearchBar } from '@/components/files/FileSearchBar';
import { useSearch } from '@/context/SearchContext';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const { search, setSearch } = useSearch();

  const handleLogout = () => {
    setAuthToken(null);
    logout();
    navigate('/login');
  };

  // Show search only on the authenticated routes

  const showSearch = isAuthenticated;

  return (
    <header className="flex items-center h-14 px-4 gap-4 border-b border-border bg-background shrink-0">
      {/* Brand */}
      <button
        onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
      >
        <div className="flex items-center ml-2">
        <span className="xl:text-2xl font-bold text-base">filesec</span>
        </div>
      </button>

      {/* Search bar — files routes only */}
      {showSearch ? (
        <div className="flex-1 ">
          <FileSearchBar value={search} onChange={setSearch} />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Right: user controls */}
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <button
              onClick={() => navigate('/settings')}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Settings"
            >
              <Settings size={18} />
            </button>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.username}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button onClick={() => navigate('/signup')}>
              Sign Up
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
