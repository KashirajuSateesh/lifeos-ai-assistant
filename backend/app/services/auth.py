from typing import Optional

from fastapi import Header, HTTPException

from app.services.database import get_supabase_client

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


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
    
# Account Delete Function
def delete_supabase_auth_user(user_id: str) -> None:
    """
    Deletes a user from Supabase Auth using the service role key.
    Must only be called from backend after verifying the logged-in user.
    """

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Missing Supabase service role configuration",
        )

    url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"

    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
    }

    response = httpx.delete(url, headers=headers, timeout=15.0)

    if response.status_code not in [200, 204]:
        print("DELETE AUTH USER ERROR:")
        print(response.status_code, response.text)

        raise HTTPException(
            status_code=500,
            detail="Failed to delete Supabase Auth user",
        )