"""src/admin/passwords.py — pbkdf2_sha256 hash/verify round-trip + 음성 사례."""

from __future__ import annotations

import pytest

from src.admin.passwords import (
    DEFAULT_ITERATIONS,
    hash_password,
    verify_password,
)


def test_hash_verify_round_trip():
    h = hash_password("hello-world-1234")
    assert h.startswith("pbkdf2_sha256$")
    assert verify_password("hello-world-1234", h) is True
    assert verify_password("hello-world-1235", h) is False


def test_two_hashes_of_same_password_differ_due_to_salt():
    a = hash_password("same-password")
    b = hash_password("same-password")
    assert a != b
    # 둘 다 verify 통과
    assert verify_password("same-password", a)
    assert verify_password("same-password", b)


def test_hash_format_components():
    h = hash_password("x" * 20)
    parts = h.split("$")
    assert len(parts) == 4
    algo, iter_str, salt_b64, hash_b64 = parts
    assert algo == "pbkdf2_sha256"
    assert int(iter_str) == DEFAULT_ITERATIONS
    assert salt_b64 and hash_b64


def test_empty_password_raises():
    with pytest.raises(ValueError):
        hash_password("")


def test_verify_handles_none_and_empty():
    assert verify_password("anything", None) is False
    assert verify_password("anything", "") is False
    assert verify_password("", "pbkdf2_sha256$1$x$y") is False


@pytest.mark.parametrize(
    "broken",
    [
        "not-a-hash",
        "pbkdf2_sha256$abc$salt$hash",  # iter not int
        "wrongalgo$1000$salt$hash",
        "pbkdf2_sha256$1000",  # too few parts
    ],
)
def test_verify_returns_false_on_malformed_stored(broken):
    assert verify_password("password", broken) is False


def test_verify_with_low_iterations_compat():
    h = hash_password("p", iterations=1000)
    assert verify_password("p", h)
