"""
Email sending utility — powered by fastapi-mail.

Configuration (set in .env):
    SMTP_HOST       SMTP server hostname (e.g. smtp.gmail.com)
    SMTP_PORT       Port, default 587
    SMTP_USER       Login username / from address
    SMTP_PASSWORD   Login password / app password
    SMTP_FROM       Sender address (defaults to SMTP_USER)
    FRONTEND_URL    Base URL used in email links (default http://localhost:5173)

Dev mode (SMTP_HOST not set):
    fastapi-mail is initialised with SUPPRESS_SEND=1 so no real connection is
    made.  Every outgoing message is printed to the console so you can
    grab verification links without a mail server.
"""

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from ..config import FRONTEND_URL, SMTP_FROM, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER

# ---------------------------------------------------------------------------
# fastapi-mail configuration
# SUPPRESS_SEND=1 tells fastapi-mail not to open an SMTP connection.
# We print the email content when suppressed so developers can still see
# what would have been sent.
# ---------------------------------------------------------------------------

mail_config = ConnectionConfig(
    MAIL_USERNAME=SMTP_USER or "noreply@filesec.dev",
    MAIL_PASSWORD=SMTP_PASSWORD or "",
    MAIL_FROM=SMTP_FROM or SMTP_USER or "noreply@filesec.dev",
    MAIL_PORT=SMTP_PORT,
    MAIL_SERVER=SMTP_HOST or "localhost",
    MAIL_STARTTLS=bool(SMTP_HOST),
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=bool(SMTP_USER and SMTP_PASSWORD),
    SUPPRESS_SEND=not bool(SMTP_HOST),      
    MAIL_FROM_NAME="FileSec",
)

fastmail = FastMail(mail_config)


# ---------------------------------------------------------------------------
# Core send function
# ---------------------------------------------------------------------------

async def _send(*, to: str, subject: str, body_html: str) -> None:
    """
    Send an HTML email via fastapi-mail.

    When SMTP_HOST is not configured (dev mode), fastapi-mail suppresses the
    send and this function prints the full email to stdout so the developer can
    copy the link.
    """
    print(f"[EMAIL] Sending to {to}: {subject}")
    message = MessageSchema(
        subject=subject,
        recipients=[to],
        body=body_html,
        subtype=MessageType.html,
    )

    # In dev mode, print the full email content so you can grab the link
    if not SMTP_HOST:
        print(
            f"\n{'=' * 60}\n"
            f"[DEV EMAIL — not sent, SMTP_HOST not configured]\n"
            f"TO:      {to}\n"
            f"SUBJECT: {subject}\n"
            f"BODY:\n{body_html}\n"
            f"{'=' * 60}\n"
        )

    # fastapi-mail handles the actual send (or silently suppresses in dev mode)
    await fastmail.send_message(message)


# ---------------------------------------------------------------------------
# Public helpers — one per email type
# ---------------------------------------------------------------------------

async def send_verification_email(to: str, username: str, raw_token: str) -> None:
    link = f"{FRONTEND_URL}/token?token={raw_token}"
    await _send(
        to=to,
        subject="Verify your FileSec email address",
        body_html=(
            f"<p>Hi <strong>{username}</strong>,</p>"
            f"<p>Click the link below to verify your email address. "
            f"The link expires in <strong>24 hours</strong>.</p>"
            f'<p><a href="{link}">{link}</a></p>'
            f"<p>If you did not create a FileSec account, you can safely ignore this email.</p>"
        ),
    )


async def send_password_reset_email(to: str, username: str, raw_token: str) -> None:
    link = f"{FRONTEND_URL}/token?token={raw_token}"
    await _send(
        to=to,
        subject="Reset your FileSec password",
        body_html=(
            f"<p>Hi <strong>{username}</strong>,</p>"
            f"<p>Click the link below to reset your password. "
            f"The link expires in <strong>1 hour</strong>.</p>"
            f'<p><a href="{link}">{link}</a></p>'
            f"<p>If you did not request this, you can safely ignore this email.</p>"
        ),
    )


async def send_email_change_verification(to: str, username: str, raw_token: str) -> None:
    """Sent to the *new* email address to confirm the change."""
    link = f"{FRONTEND_URL}/token?token={raw_token}"
    await _send(
        to=to,
        subject="Confirm your new FileSec email address",
        body_html=(
            f"<p>Hi <strong>{username}</strong>,</p>"
            f"<p>Click the link below to confirm your new email address. "
            f"The link expires in <strong>24 hours</strong>.</p>"
            f'<p><a href="{link}">{link}</a></p>'
            f"<p>If you did not request this, please ignore this email.</p>"
        ),
    )


async def send_email_change_notification(to: str, username: str, new_email: str) -> None:
    """Security notice sent to the *old* email address."""
    await _send(
        to=to,
        subject="FileSec: your email address is being changed",
        body_html=(
            f"<p>Hi <strong>{username}</strong>,</p>"
            f"<p>A request was submitted to change your FileSec email address to "
            f"<strong>{new_email}</strong>.</p>"
            f"<p>If this was not you, please contact support immediately.</p>"
        ),
    )
