import os
from typing import Dict, Any

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


def get_supabase_client() -> Client:
    """
    Creates and returns a Supabase client.
    """

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in .env file")

    return create_client(SUPABASE_URL, SUPABASE_KEY)


def save_expense(expense_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Saves one expense record into the expenses table.
    """

    supabase = get_supabase_client()

    result = supabase.table("expenses").insert(expense_data).execute()

    if not result.data:
        raise RuntimeError("Failed to save expense to Supabase")

    return result.data[0]