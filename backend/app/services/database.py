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

# Journal Agent Code 

def save_journal_entry(journal_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Saves one journal entry into the journal_entries table.
    """

    supabase = get_supabase_client()

    result = supabase.table("journal_entries").insert(journal_data).execute()

    if not result.data:
        raise RuntimeError("Failed to save journal entry to Supabase")

    return result.data[0]


def get_recent_journals_by_user(user_id: str, limit: int = 5) -> list[Dict[str, Any]]:
    """
    Fetches recent journal entries for a specific user.
    """

    supabase = get_supabase_client()

    result = (
        supabase.table("journal_entries")
        .select("*")
        .eq("user_id", user_id)
        .order("entry_date", desc=True)
        .limit(limit)
        .execute()
    )

    return result.data or []


def get_journals_by_month(
    user_id: str,
    year: int,
    month: int,
) -> list[Dict[str, Any]]:
    """
    Fetches journal entries for a specific user, year, and month.
    """

    from datetime import date
    import calendar

    supabase = get_supabase_client()

    start_date = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    end_date = date(year, month, last_day)

    result = (
        supabase.table("journal_entries")
        .select("*")
        .eq("user_id", user_id)
        .gte("entry_date", start_date.isoformat())
        .lte("entry_date", end_date.isoformat())
        .order("entry_date", desc=False)
        .execute()
    )

    return result.data or []


def delete_journal_by_id(journal_id: str) -> Dict[str, Any]:
    """
    Deletes one journal entry by ID.
    """

    supabase = get_supabase_client()

    result = (
        supabase.table("journal_entries")
        .delete()
        .eq("id", journal_id)
        .execute()
    )

    if not result.data:
        raise RuntimeError("Failed to delete journal entry or journal not found")

    return result.data[0]


# Places Agent Database Code

def save_place(place_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Saves one place record into the places table.
    """

    supabase = get_supabase_client()

    result = supabase.table("places").insert(place_data).execute()

    if not result.data:
        raise RuntimeError("Failed to save place to Supabase")

    return result.data[0]


def get_places_by_user(
    user_id: str,
    status: str | None = None,
    category: str | None = None,
) -> list[Dict[str, Any]]:
    """
    Fetches places for a specific user.
    Supports optional status/category filtering.
    """

    supabase = get_supabase_client()

    query = (
        supabase.table("places")
        .select("*")
        .eq("user_id", user_id)
    )

    if status and status != "all":
        query = query.eq("status", status)

    if category and category != "all":
        query = query.eq("category", category)

    result = query.order("created_at", desc=True).execute()

    return result.data or []


def update_place_by_id(place_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Updates one place by ID.
    """

    supabase = get_supabase_client()

    result = (
        supabase.table("places")
        .update(update_data)
        .eq("id", place_id)
        .execute()
    )

    if not result.data:
        raise RuntimeError("Failed to update place or place not found")

    return result.data[0]


def delete_place_by_id(place_id: str) -> Dict[str, Any]:
    """
    Deletes one place by ID.
    """

    supabase = get_supabase_client()

    result = (
        supabase.table("places")
        .delete()
        .eq("id", place_id)
        .execute()
    )

    if not result.data:
        raise RuntimeError("Failed to delete place or place not found")

    return result.data[0]

# distance helper

import math


def calculate_distance_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Calculates distance between two latitude/longitude points using Haversine formula.
    """

    earth_radius_km = 6371

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return earth_radius_km * c


def get_nearby_places_by_user(
    user_id: str,
    latitude: float,
    longitude: float,
    radius_km: float = 10,
) -> list[Dict[str, Any]]:
    """
    Finds saved places near the user's current location.
    Only checks places that have latitude and longitude.
    """

    supabase = get_supabase_client()

    result = (
        supabase.table("places")
        .select("*")
        .eq("user_id", user_id)
        .eq("location_known", True)
        .execute()
    )

    places = result.data or []
    nearby_places = []

    for place in places:
        place_latitude = place.get("latitude")
        place_longitude = place.get("longitude")

        if place_latitude is None or place_longitude is None:
            continue

        distance_km = calculate_distance_km(
            latitude,
            longitude,
            float(place_latitude),
            float(place_longitude),
        )

        if distance_km <= radius_km:
            place["distance_km"] = round(distance_km, 2)
            nearby_places.append(place)

    nearby_places.sort(key=lambda item: item["distance_km"])

    return nearby_places

def get_places_with_distances_by_user(
    user_id: str,
    latitude: float,
    longitude: float,
) -> list[Dict[str, Any]]:
    """
    Returns all saved places.
    If a place has coordinates, adds distance_km.
    If not, distance_km stays None.
    """

    supabase = get_supabase_client()

    result = (
        supabase.table("places")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    places = result.data or []

    for place in places:
        place_latitude = place.get("latitude")
        place_longitude = place.get("longitude")

        if place_latitude is None or place_longitude is None:
            place["distance_km"] = None
            place["distance_status"] = "location_unknown"
            continue

        distance_km = calculate_distance_km(
            latitude,
            longitude,
            float(place_latitude),
            float(place_longitude),
        )

        place["distance_km"] = round(distance_km, 2)
        place["distance_status"] = "calculated"

    return places