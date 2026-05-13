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

def get_expenses_by_user(
    user_id: str,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[Dict[str, Any]]:
    """
    Fetches expenses for a specific user.
    If start_date and end_date are provided, it filters by created_at date range.
    Latest expenses appear first.
    """

    supabase = get_supabase_client()

    query = (
        supabase.table("expenses")
        .select("*")
        .eq("user_id", user_id)
    )

    if start_date:
        query = query.gte("created_at", start_date)

    if end_date:
        query = query.lte("created_at", end_date)

    result = query.order("created_at", desc=True).execute()

    return result.data or []

def delete_expense_by_id(expense_id: str) -> Dict[str, Any]:
    """
    Deletes one expense by ID.
    """

    supabase = get_supabase_client()

    result = (
        supabase.table("expenses")
        .delete()
        .eq("id", expense_id)
        .execute()
    )

    if not result.data:
        raise RuntimeError("Failed to delete expense or expense not found")

    return result.data[0]

def update_expense_by_id(expense_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Updates one expense by ID.
    """

    supabase = get_supabase_client()

    result = (
        supabase.table("expenses")
        .update(update_data)
        .eq("id", expense_id)
        .execute()
    )

    if not result.data:
        raise RuntimeError("Failed to update expense or expense not found")

    return result.data[0]