# auth.py
# Authentication logic. Mocked for now since there is no users table
# yet: checks credentials against a stub instead of the database. No
# framework imports, so this can be unit tested without a running
# server. Swap the body of authenticate() out once models/users exists.

from sambad.schemas.auth import LoginRequest

_MOCK_EMAIL = "demo@sambad.local"
_MOCK_PASSWORD = "password123"


def authenticate(credentials: LoginRequest) -> str | None:
    if credentials.email == _MOCK_EMAIL and credentials.password == _MOCK_PASSWORD:
        return "mock-access-token"
    return None
