import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { setAuthToken } from '@/api/client';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    setAuthToken(null);
    logout();
    navigate('/login');
  };

  const navigateTo = (path: string) => navigate(path);

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left side: Logo and My Files (when logged in) */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigateTo('/')}
              className="text-xl font-bold hover:opacity-80 transition-opacity"
            >
              filesec
            </button>
            {isAuthenticated && (
              <>
                <button
                  onClick={() => navigateTo('/files')}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  My Files
                </button>
                {/* Add more links here in the future */}
                {/* Example: <button onClick={() => navigateTo('/shared')}>Shared</button> */}
              </>
            )}
          </div>

          {/* Right side: Auth buttons or user info */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {/* Add more logged-in items here in the future */}
                {/* Example: <Button variant="outline" onClick={handleUpload}>Upload</Button> */}
                
                <span className="text-sm text-muted-foreground">
                  {user?.username}
                </span>
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigateTo('/login')}>
                  Login
                </Button>
                <Button onClick={() => navigateTo('/signup')}>
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
