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
    category: str | None = None,
) -> list[Dict[str, Any]]:
    """
    Fetches expenses for a specific user.
    Supports optional date range and category filtering.
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

    if category and category != "all":
        query = query.eq("category", category)

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

# Reminder Task Code

def save_task(task_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Saves one task record into the tasks table.
    """

    supabase = get_supabase_client()

    result = supabase.table("tasks").insert(task_data).execute()

    if not result.data:
        raise RuntimeError("Failed to save task to Supabase")

    return result.data[0]


def get_tasks_by_user(
    user_id: str,
    priority: str | None = None,
) -> list[Dict[str, Any]]:
    """
    Fetches tasks for a specific user.
    Supports optional priority filtering.
    Latest tasks appear first.
    """

    supabase = get_supabase_client()

    query = (
        supabase.table("tasks")
        .select("*")
        .eq("user_id", user_id)
    )

    if priority and priority != "all":
        query = query.eq("priority", priority)

    result = query.order("created_at", desc=True).execute()

    return result.data or []


def update_task_by_id(task_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Updates one task by ID.
    """

    supabase = get_supabase_client()

    result = (
        supabase.table("tasks")
        .update(update_data)
        .eq("id", task_id)
        .execute()
    )

    if not result.data:
        raise RuntimeError("Failed to update task or task not found")

    return result.data[0]


def delete_task_by_id(task_id: str) -> Dict[str, Any]:
    """
    Deletes one task by ID.
    """

    supabase = get_supabase_client()

    result = (
        supabase.table("tasks")
        .delete()
        .eq("id", task_id)
        .execute()
    )

    if not result.data:
        raise RuntimeError("Failed to delete task or task not found")

    return result.data[0]

def get_task_reminders_by_user(user_id: str) -> Dict[str, Any]:
    """
    Fetches tasks grouped into reminder categories:
    - due_today
    - upcoming
    - overdue
    - follow_up
    """

    from datetime import datetime, timedelta, timezone

    supabase = get_supabase_client()

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    upcoming_end = now + timedelta(days=7)

    result = (
        supabase.table("tasks")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )

    tasks = result.data or []

    due_today = []
    upcoming = []
    overdue = []
    follow_up = []

    for task in tasks:
        if task.get("status") == "completed":
            continue

        due_date_raw = task.get("due_date")

        if not due_date_raw:
            continue

        due_date = datetime.fromisoformat(due_date_raw.replace("Z", "+00:00"))

        if due_date < now:
            overdue.append(task)

        elif today_start <= due_date <= today_end:
            due_today.append(task)

        elif now < due_date <= upcoming_end:
            upcoming.append(task)

        if task.get("follow_up_required") and due_date <= now:
            follow_up.append(task)

    return {
        "due_today": due_today,
        "upcoming": upcoming,
        "overdue": overdue,
        "follow_up": follow_up,
    }