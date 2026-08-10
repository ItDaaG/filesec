"""
Authentication router and shared dependencies.

Endpoints
─────────
POST /auth/login                  Standard credential login → JWT
POST /auth/signup                 Register → verification email (no JWT)
POST /auth/resend-verification    Re-send verification email
POST /auth/verify-token           Universal token validator — frontend routes on response
POST /auth/request-password-reset Send password-reset email (always 200)
POST /auth/reset-password         Consume reset token → update password
POST /auth/request-email-change   Send email-change link (verified users only)

Dependencies
────────────
get_current_user          → validates JWT, returns User (verified or not)
get_current_verified_user → like above but raises 403 if not verified
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .config import FRONTEND_URL, AGENT_INTERNAL_KEY
from .crud import (
    TOKEN_TYPE_EMAIL_CHANGE,
    TOKEN_TYPE_EMAIL_VERIFICATION,
    TOKEN_TYPE_PASSWORD_RESET,
)
from .database import get_db
from .utils.email import (
    send_email_change_notification,
    send_email_change_verification,
    send_password_reset_email,
    send_verification_email,
)
from .utils.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def authenticate_user(db: Session, email: str, password: str) -> models.User | None:
    user = crud.get_user_by_email(db, email=email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def issue_access_token(user: models.User) -> str:
    """Issue a JWT that includes is_email_verified so the frontend can read it
    without an extra /users/me round-trip."""
    return create_access_token(
        data={"sub": str(user.id), "verified": user.is_email_verified}
    )


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise exc
    user_id = payload.get("sub")
    if user_id is None:
        raise exc
    user = crud.get_user_by_id(db, int(user_id))
    if user is None:
        raise exc
    return user


async def get_current_verified_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Raises 403 if the user has not verified their email address."""
    if not current_user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified",
        )
    return current_user

async def get_agent_user(
    db: Session = Depends(get_db),
    agent_key: str | None = Header(default=None, alias="X-Agent-Key"),
    agent_user_id: int | None = Header(default=None, alias="user_id"),
) -> models.User:
    """Authenticate agent-to-backend calls only (no JWT path)."""
    if agent_key == AGENT_INTERNAL_KEY and agent_user_id is not None:
        user = crud.get_user_by_id(db, agent_user_id)
        if not user or not user.is_email_verified:
            raise HTTPException(status_code=401, detail="Invalid agent user")
        return user
    raise HTTPException(status_code=401, detail="Unauthorized")

async def get_verified_user_or_agent_user(
    db: Session = Depends(get_db),
    auth_header: str | None = Header(default=None, alias="Authorization"),
    agent_key: str | None = Header(default=None, alias="X-Agent-Key"),
    agent_user_id: int | None = Header(default=None, alias="user_id"),
):
    # Path A: normal user JWT
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.removeprefix("Bearer ").strip()
        payload = decode_access_token(token)
        if payload is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        user = crud.get_user_by_id(db, int(user_id))
        if not user:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        if not user.is_email_verified:
            raise HTTPException(status_code=403, detail="Email not verified")
        return user

    # Path B: internal agent key + explicit user id
    if agent_key == AGENT_INTERNAL_KEY and agent_user_id is not None:
        user = crud.get_user_by_id(db, agent_user_id)
        if not user or not user.is_email_verified:
            raise HTTPException(status_code=401, detail="Invalid agent user")
        return user

    raise HTTPException(status_code=401, detail="Unauthorized")

# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=schemas.AuthResponse)
def login(
    credentials: schemas.UserLogin,
    db: Session = Depends(get_db),
):
    """Standard credential login.  Returns JWT even for unverified users —
    the frontend is responsible for redirecting them to /verify-email."""
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {
        "access_token": issue_access_token(user),
        "token_type": "bearer",
        "user": user,
    }


# ---------------------------------------------------------------------------
# POST /auth/signup
# ---------------------------------------------------------------------------

@router.post(
    "/signup",
    response_model=schemas.SignUpResponse,
    status_code=status.HTTP_201_CREATED,
)
async def signup(
    user_in: schemas.UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Register a new account.  No JWT is issued — the user must verify their
    email first.  A verification link is sent in a background task so the
    HTTP response is not delayed by SMTP.
    """
    if crud.get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if crud.get_user_by_username(db, user_in.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

    user = crud.create_user(db, user_in)
    raw = crud.create_email_token(
        db, user_id=user.id, token_type=TOKEN_TYPE_EMAIL_VERIFICATION
    )
    background_tasks.add_task(send_verification_email, user.email, user.username, raw)

    return {"detail": "Account created. Check your inbox to verify your email.", "email": user.email}


# ---------------------------------------------------------------------------
# POST /auth/resend-verification
# ---------------------------------------------------------------------------

@router.post("/resend-verification", status_code=status.HTTP_200_OK)
async def resend_verification(
    body: schemas.ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Re-send a verification email.  Always returns 200 — never reveals whether
    the email exists.
    """
    user = crud.get_user_by_email(db, body.email)
    if user and not user.is_email_verified:
        raw = crud.create_email_token(
            db, user_id=user.id, token_type=TOKEN_TYPE_EMAIL_VERIFICATION
        )
        background_tasks.add_task(send_verification_email, user.email, user.username, raw)

    return {"detail": "If that email is registered and unverified, a new link has been sent."}


# ---------------------------------------------------------------------------
# POST /auth/verify-token   ← the unified token handler
# ---------------------------------------------------------------------------

@router.post("/verify-token", response_model=schemas.TokenVerifyResponse)
def verify_token(
    body: schemas.VerifyTokenRequest,
    db: Session = Depends(get_db),
):
    """
    Universal token validation endpoint.  The frontend submits any token here
    and routes purely on the returned `type` — it never trusts the URL for
    token type.

    Behaviour by type:
    ┌───────────────────┬────────────────────────────────────────────────────┐
    │ email_verification│ marks user.is_email_verified, consumes token,      │
    │                   │ returns JWT + user                                 │
    ├───────────────────┼────────────────────────────────────────────────────┤
    │ email_change      │ promotes payload → user.email, consumes token,     │
    │                   │ returns JWT + user                                 │
    ├───────────────────┼────────────────────────────────────────────────────┤
    │ password_reset    │ validates only — does NOT consume the token so     │
    │                   │ POST /auth/reset-password can use it               │
    └───────────────────┴────────────────────────────────────────────────────┘
    """

    for token_type in (
        TOKEN_TYPE_EMAIL_VERIFICATION,
        TOKEN_TYPE_EMAIL_CHANGE,
        TOKEN_TYPE_PASSWORD_RESET,
    ):
        token = crud.get_valid_token(db, body.token, token_type)
        if token is not None:
            break
    else:
        return schemas.TokenVerifyResponse(valid=False)

    user = token.user

    if token_type == TOKEN_TYPE_EMAIL_VERIFICATION:
        user.is_email_verified = True
        crud.consume_token(db, token)
        db.refresh(user)
        return schemas.TokenVerifyResponse(
            valid=True,
            type=token_type,
            payload=None,
            access_token=issue_access_token(user),
            token_type="bearer",
            user=user,
        )

    if token_type == TOKEN_TYPE_EMAIL_CHANGE:
        new_email = token.payload
        # Guard: ensure the email hasn't been claimed by someone else
        existing = crud.get_user_by_email(db, new_email)
        if existing and existing.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That email address is already in use.",
            )
        user.email = new_email
        crud.consume_token(db, token)
        db.refresh(user)
        return schemas.TokenVerifyResponse(
            valid=True,
            type=token_type,
            payload=new_email,
            access_token=issue_access_token(user),
            token_type="bearer",
            user=user,
        )

    return schemas.TokenVerifyResponse(valid=True, type=token_type, payload=None)


# ---------------------------------------------------------------------------
# POST /auth/request-password-reset
# ---------------------------------------------------------------------------

@router.post("/request-password-reset", status_code=status.HTTP_200_OK)
async def request_password_reset(
    body: schemas.ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Always returns 200 — never reveals whether the email exists."""
    user = crud.get_user_by_email(db, body.email)
    if user:
        raw = crud.create_email_token(
            db, user_id=user.id, token_type=TOKEN_TYPE_PASSWORD_RESET
        )
        background_tasks.add_task(send_password_reset_email, user.email, user.username, raw)

    return {"detail": "If that email is registered with us, we will send a reset link."}


# ---------------------------------------------------------------------------
# POST /auth/reset-password
# ---------------------------------------------------------------------------

@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    body: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Consume a password-reset token and update the user's password."""
    row = crud.get_valid_token(db, body.token, TOKEN_TYPE_PASSWORD_RESET)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password-reset link.",
        )
    row.user.password_hash = get_password_hash(body.new_password)
    crud.consume_token(db, row)
    return {"detail": "Password updated. You can now log in with your new password."}


# ---------------------------------------------------------------------------
# POST /auth/request-email-change  (verified users only)
# ---------------------------------------------------------------------------

@router.post("/request-email-change", status_code=status.HTTP_200_OK)
async def request_email_change(
    body: schemas.RequestEmailChangeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_verified_user),
):
    """
    Initiate an email-address change.  Requires current-password confirmation.
    Sends a verification link to the new address and a security notice to the
    old address.
    """
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password.",
        )

    new_email = body.new_email.strip().lower()
    if new_email == current_user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New email must differ from your current email.",
        )
    if crud.get_user_by_email(db, new_email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That email address is already in use.",
        )

    raw = crud.create_email_token(
        db,
        user_id=current_user.id,
        token_type=TOKEN_TYPE_EMAIL_CHANGE,
        payload=new_email,
    )

    background_tasks.add_task(
        send_email_change_verification, new_email, current_user.username, raw
    )
    background_tasks.add_task(
        send_email_change_notification, current_user.email, current_user.username, new_email
    )

    return {"detail": "Verification email sent to your new address."}