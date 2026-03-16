/**
 * VerifyEmailPage  —  /verify-email
 *
 * Shown after signup or when an authenticated user has not verified their
 * email yet.  Displays the address the verification email was sent to and
 * offers a rate-limited resend button (60-second cooldown).
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { resendVerification } from '@/api/authService'
import { Button } from '@/components/ui/button'
import { MailCheck } from 'lucide-react'

const RESEND_COOLDOWN_SECONDS = 60

export const VerifyEmailPage = () => {
  const { user } = useAuth()

  // Email comes from the authenticated user object (login → unverified) or
  // from localStorage (fresh signup where no JWT has been issued yet).
  const email =
    user?.email ?? localStorage.getItem('pending_verification_email') ?? ''

  const [cooldown, setCooldown] = useState(0)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  // Count-down timer
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const handleResend = async () => {
    if (!email || cooldown > 0) return
    setCooldown(RESEND_COOLDOWN_SECONDS)
    setStatusMsg(null)
    try {
      await resendVerification(email)
      setStatusMsg('Verification email resent — check your inbox.')
    } catch {
      setStatusMsg('Could not resend. Please try again in a moment.')
      setCooldown(0)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <MailCheck className="h-12 w-12 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Check your inbox</h1>
          <p className="text-muted-foreground">
            We sent a verification email to{' '}
            {email ? (
              <span className="font-medium text-foreground">{email}</span>
            ) : (
              'your email address'
            )}
            . Click the link in the email to activate your account.
          </p>
        </div>

        {statusMsg && (
          <p className="text-sm text-muted-foreground">{statusMsg}</p>
        )}

        <Button
          variant="ghost"
          onClick={handleResend}
          disabled={cooldown > 0 || !email}
          className="text-sm"
        >
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : 'Resend verification email'}
        </Button>
      </div>
    </div>
  )
}
