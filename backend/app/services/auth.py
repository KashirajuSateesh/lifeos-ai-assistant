from typing import Optional

from fastapi import Header, HTTPException


def get_bearer_token(authorization: Optional[str] = Header(default=None)) -> str:
    """
    Extracts Bearer token from Authorization header.

    Expected:
    Authorization: Bearer <access_token>
    """

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header",
        )

    parts = authorization.split()

    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization header format",
        )

    return parts[1]