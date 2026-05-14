from typing import Optional

from fastapi import Header, HTTPException

from app.services.database import get_supabase_client


def get_bearer_token(authorization: Optional[str] = Header(default=None)) -> str:
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


def get_authenticated_user_id(
    authorization: Optional[str] = Header(default=None),
) -> str:
    token = get_bearer_token(authorization)

    try:
        supabase = get_supabase_client()
        user_response = supabase.auth.get_user(token)

        user = user_response.user

        if not user or not user.id:
          raise HTTPException(
              status_code=401,
              detail="Invalid authentication token.",
          )

        return user.id

    except HTTPException:
        raise

    except Exception as error:
        print("SUPABASE AUTH VALIDATION ERROR:")
        print(error)

        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token.",
        )