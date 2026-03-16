/**
 * TokenActionPage  —  /token?token=<uuid>
 *
 * The backend sends every email link to this single route.  On mount the
 * component submits the token to POST /auth/verify-token and routes purely
 * based on the `type` field in the response.  The frontend never trusts the
 * URL to determine the token type.
 *
 * Routing table:
 *   email_verification  → store JWT, redirect to /dashboard
 *   email_change        → store JWT, redirect to /dashboard
 *   password_reset      → show password-reset form inline
 *   invalid / expired   → show error state
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { verifyToken, resetPassword } from '@/api/authService'
import { setAuthToken } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import axios from 'axios'

type Stage =
  | 'loading'
  | 'error'
  | 'reset_form'
  | 'reset_success'

export const TokenActionPage = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const { login } = useAuth()

  const [stage, setStage] = useState<Stage>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  // Password-reset form state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── On mount: submit the token, route on type ──────────────────────────
  useEffect(() => {
    if (!token) {
      setErrorMsg('No token found in the URL.')
      setStage('error')
      return
    }

    verifyToken(token)
      .then((res) => {
        if (!res.valid || !res.type) {
          setErrorMsg('This link is invalid or has expired. Please request a new one.')
          setStage('error')
          return
        }

        if (res.type === 'email_verification' || res.type === 'email_change') {
          // Token has been consumed by the backend; we have a fresh JWT
          if (res.access_token && res.user) {
            setAuthToken(res.access_token)
            login(res.user)
            localStorage.removeItem('pending_verification_email')
          }
          navigate('/dashboard', { replace: true })
          return
        }

        if (res.type === 'password_reset') {
          // Token is validated but NOT consumed yet — show the reset form
          setStage('reset_form')
          return
        }

        setErrorMsg('Unknown token type received.')
        setStage('error')
      })
      .catch(() => {
        setErrorMsg('Something went wrong while validating the link. Please try again.')
        setStage('error')
      })
  }, [token])

  // ── Password-reset form submission ─────────────────────────────────────
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError('')

    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(token, newPassword)
      setStage('reset_success')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        setResetError(err.response.data.detail)
      } else {
        setResetError('Failed to reset password. The link may have expired.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  if (stage === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (stage === 'error') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-4 text-center">
          <h1 className="text-2xl font-bold">Invalid link</h1>
          <p className="text-muted-foreground">{errorMsg}</p>
          <Button variant="outline" onClick={() => navigate('/login')}>
            Back to login
          </Button>
        </div>
      </div>
    )
  }

  if (stage === 'reset_success') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-4 text-center">
          <h1 className="text-2xl font-bold">Password updated</h1>
          <p className="text-muted-foreground">
            Your password has been reset successfully.
          </p>
          <Button onClick={() => navigate('/login')}>Log in</Button>
        </div>
      </div>
    )
  }

  // stage === 'reset_form'
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter a new password for your account.
          </p>
        </div>

        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              minLength={8}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          {resetError && (
            <p className="text-sm text-destructive">{resetError}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…</>
            ) : (
              'Set new password'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
