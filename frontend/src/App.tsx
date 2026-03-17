import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/layouts/Navbar'
import { SignUpPage } from './pages/SignUpPage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import { FilesPage } from './pages/FilesPage'
import { SettingsPage } from './pages/SettingsPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { TokenActionPage } from './pages/TokenActionPage'
import { useAuth } from './context/AuthContext'

function AppRoutes() {
  const { isAuthenticated, isEmailVerified, isLoading } = useAuth()

  if (isLoading) return null

  const requireVerified = (page: React.ReactNode) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />
    if (!isEmailVerified) return <Navigate to="/verify-email" replace />
    return page
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          !isAuthenticated
            ? <LandingPage />
            : isEmailVerified
              ? <Navigate to="/dashboard" replace />
              : <Navigate to="/verify-email" replace />
        }
      />
      <Route path="/signup" element={!isAuthenticated ? <SignUpPage /> : <Navigate to="/dashboard" replace />} />
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={requireVerified(<DashboardPage />)} />
      <Route path="/files" element={requireVerified(<FilesPage />)} />
      <Route path="/files/folders/:folderId" element={requireVerified(<FilesPage />)} />
      <Route path="/settings" element={requireVerified(<SettingsPage />)} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/token" element={<TokenActionPage />} />
      <Route path="*" element={<Navigate to={isAuthenticated && isEmailVerified ? '/dashboard' : '/'} replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen">
        <Navbar />
        <main className="flex-1 overflow-auto">
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
