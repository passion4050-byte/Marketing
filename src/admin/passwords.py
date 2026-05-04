"""🔑 Tenant 비밀번호 해싱 — stdlib pbkdf2_hmac 기반. Phase 9-04.

새 의존성 추가 금지 (passlib, bcrypt 등). hashlib.pbkdf2_hmac(sha256) +
secrets.token_bytes(salt) + 저장 포맷 ``pbkdf2_sha256$<iter>$<salt_b64>$<hash_b64>``
는 Django 의 PBKDF2PasswordHasher 와 호환되는 well-known 형태.

Streamlit Cloud + Supabase Postgres 환경에서 어드민이 발급한 비밀번호로
blogkey 클라이언트가 자기 테넌트만 접속하도록 격리하는 데 사용.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

ALGO = "pbkdf2_sha256"
DEFAULT_ITERATIONS = 260_000  # Django 4.2+ 기본값과 동일
SALT_BYTES = 16


def hash_password(plaintext: str, *, iterations: int = DEFAULT_ITERATIONS) -> str:
    """Plaintext → ``pbkdf2_sha256$<iter>$<salt_b64>$<hash_b64>`` 포맷.

    Raises:
        ValueError: plaintext 가 빈 문자열일 때.
    """
    if not plaintext:
        raise ValueError("password must not be empty")
    salt = secrets.token_bytes(SALT_BYTES)
    derived = hashlib.pbkdf2_hmac("sha256", plaintext.encode("utf-8"), salt, iterations)
    return "{algo}${iter}${salt}${hash}".format(
        algo=ALGO,
        iter=iterations,
        salt=base64.b64encode(salt).decode("ascii"),
        hash=base64.b64encode(derived).decode("ascii"),
    )


def verify_password(plaintext: str, stored: str | None) -> bool:
    """Constant-time 비교. stored 가 None/빈 문자열/포맷 불일치 시 False."""
    if not stored or not plaintext:
        return False
    try:
        algo, iter_str, salt_b64, hash_b64 = stored.split("$", 3)
    except ValueError:
        return False
    if algo != ALGO:
        return False
    try:
        iterations = int(iter_str)
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
    except (ValueError, TypeError):
        return False
    derived = hashlib.pbkdf2_hmac("sha256", plaintext.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(derived, expected)
