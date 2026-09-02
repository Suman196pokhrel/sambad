# auth.py
# Request and response contracts for the auth API. Kept separate from
# the router so the wire shape can change without touching routing or
# business logic.

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
