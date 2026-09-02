# auth_router.py
# HTTP routes for authentication. Thin by design: validates the
# request, calls into core.auth, and shapes the response. No business
# logic lives here. Mounted in main.py under the "/api" prefix, so
# these routes resolve at /api/auth/health and /api/auth/login.

from fastapi import APIRouter, HTTPException, status

from sambad.core.auth import authenticate
from sambad.schemas.auth import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest) -> LoginResponse:
    token = authenticate(credentials)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return LoginResponse(access_token=token)
