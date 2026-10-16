from datetime import timedelta
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)


def test_password_hashing():
    raw_password = "SecurePassword@123"
    hashed = hash_password(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_access_token_creation_and_decoding():
    subject = "user-12345"
    token = create_access_token(subject=subject, extra_claims={"role": "ADMIN"})
    payload = decode_token(token)

    assert payload is not None
    assert payload["sub"] == subject
    assert payload["role"] == "ADMIN"
    assert payload["type"] == "access"


def test_refresh_token_creation_and_decoding():
    subject = "user-67890"
    token = create_refresh_token(subject=subject)
    payload = decode_token(token)

    assert payload is not None
    assert payload["sub"] == subject
    assert payload["type"] == "refresh"


def test_expired_token_handling():
    subject = "expired-user"
    expired_token = create_access_token(subject=subject, expires_delta=timedelta(seconds=-10))
    payload = decode_token(expired_token)
    assert payload is None
