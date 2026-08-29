"""Password hashing, email normalization, and session-token helpers (Phase 6).

Nothing here logs its inputs — passwords and raw tokens must never reach logs.
"""

import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError

# One shared hasher with library defaults (Argon2id, a sensible memory/time
# cost). Argon2 salts each hash internally, so identical passwords still produce
# different stored hashes.
_password_hasher = PasswordHasher()

# Minimum password length. Deliberately modest — length matters far more than
# forced character-class rules, which push users toward weak, predictable
# patterns. (buildplan Step 29: "reasonable minimum requirements".)
MIN_PASSWORD_LENGTH = 8


def hash_password(password: str) -> str:
    """Return an Argon2 hash string (algorithm + params + salt + digest)."""
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """True if `password` matches the stored hash, False otherwise.

    Argon2 signals a mismatch by raising; we translate that to a bool so callers
    have a simple predicate and never see the password in a traceback.
    """
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError):
        return False


def normalize_email(email: str) -> str:
    """Canonical form for storage/lookup: trimmed and lowercased.

    Emails are case-insensitive in practice; normalizing on the way in makes the
    unique constraint enforce "one account per email" regardless of casing.
    """
    return email.strip().lower()


def generate_session_token() -> str:
    """A cryptographically-random, URL-safe opaque session token.

    This is the raw value handed to the client in the cookie. It carries no
    information — it is only a lookup key. 32 bytes ≈ 256 bits of entropy.
    """
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    """Hash a session token for storage (buildplan-adjacent hardening).

    We store this hash, not the raw token, so a leaked `sessions` table cannot
    be used to hijack live sessions. A plain SHA-256 is correct here (unlike for
    passwords): the token already has full random entropy, so there is nothing
    to brute-force and no need for a slow/salted hash. Lookup hashes the incoming
    cookie value and matches on the digest.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
