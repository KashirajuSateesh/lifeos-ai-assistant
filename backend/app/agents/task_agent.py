from datetime import datetime, timedelta, timezone
from typing import Any, Dict
import re

import dateparser

from app.services.database import save_task
from app.services.llm import extract_task_with_llm


def get_time_from_text(text: str) -> tuple[int, int]:
    """
    Converts vague time words into hour/minute.
    """

    text = text.lower()

    if "morning" in text:
        return 9, 0

    if "afternoon" in text:
        return 14, 0

    if "evening" in text:
        return 18, 0

    if "night" in text or "tonight" in text:
        return 20, 0

    return 9, 0


def parse_weekday_due_date(date_text: str | None) -> str | None:
    """
    Manually parses weekday phrases like:
    - Friday evening
    - next Friday evening
    - Monday morning
    """

    if not date_text:
        return None

    text = date_text.lower().strip()

    weekdays = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6,
    }

    matched_index = None

    for day_name, day_index in weekdays.items():
        if day_name in text:
            matched_index = day_index
            break

    if matched_index is None:
        return None

    now = datetime.now(timezone.utc)
    today_index = now.weekday()

    days_ahead = matched_index - today_index

    if "next" in text:
        if days_ahead <= 0:
            days_ahead += 7
        else:
            days_ahead += 7
    else:
        if days_ahead <= 0:
            days_ahead += 7

    hour, minute = get_time_from_text(text)

    due_datetime = now + timedelta(days=days_ahead)
    due_datetime = due_datetime.replace(
        hour=hour,
        minute=minute,
        second=0,
        microsecond=0,
    )


    return due_datetime.isoformat()


def normalize_date_text(date_text: str) -> str:
    """
    Makes natural language dates easier for dateparser.
    """

    text = date_text.lower().strip()

    text = re.sub(
        r"\b(remind me to|remind me|need to|add task to|task to)\b",
        "",
        text,
    )
    text = re.sub(r"\b(finish|complete|submit|call|pay|do)\b", "", text)

    if " by " in f" {text} ":
        text = text.split(" by ", 1)[-1].strip()

    replacements = {
        "morning": "9:00 AM",
        "afternoon": "2:00 PM",
        "evening": "6:00 PM",
        "night": "8:00 PM",
        "tonight": "today 8:00 PM",
    }

    for word, replacement in replacements.items():
        if word in text:
            text = text.replace(word, replacement)

    return text.strip()


def parse_due_date(date_text: str | None) -> str | None:
    """
    Converts natural language date text into ISO datetime string.
    """

    if not date_text:
        return None

    normalized_text = date_text.strip().lower()

    if normalized_text in ["null", "none", "no due date", ""]:
        return None

    weekday_result = parse_weekday_due_date(normalized_text)

    if weekday_result:
        return weekday_result

    parsed_text = normalize_date_text(normalized_text)

    settings = {
        "PREFER_DATES_FROM": "future",
        "RETURN_AS_TIMEZONE_AWARE": True,
        "TIMEZONE": "UTC",
        "TO_TIMEZONE": "UTC",
    }

    parsed_date = dateparser.parse(parsed_text, settings=settings)

    if not parsed_date:
        print("DATEPARSER COULD NOT PARSE:", date_text, "->", parsed_text)
        return None

    if parsed_date.tzinfo is None:
        parsed_date = parsed_date.replace(tzinfo=timezone.utc)

    return parsed_date.isoformat()


def handle_task_message(
    message: str,
    extracted_data: Dict[str, Any],
    user_id: str = "demo-user",
) -> Dict[str, Any]:
    """
    Task Agent.

    Uses LLM extraction first, then converts due_date_text into due/reminder dates.
    """

    try:
        llm_task = extract_task_with_llm(message)

    except Exception as error:
        print("LLM TASK EXTRACTION ERROR:")
        print(error)
        llm_task = {}

    title = llm_task.get("title") or "Untitled task"
    description = llm_task.get("description") or message
    priority = llm_task.get("priority") or "medium"
    status = llm_task.get("status") or "pending"

    due_date_text = llm_task.get("due_date_text")
    reminder_text = llm_task.get("reminder_text") or due_date_text

    due_date = parse_due_date(due_date_text) or parse_due_date(message)
    reminder_at = parse_due_date(reminder_text) or due_date

    task_record = {
        "user_id": user_id,
        "title": title,
        "description": description,
        "priority": priority,
        "status": status,
        "due_date": due_date,
        "reminder_at": reminder_at,
    }

    saved_task = save_task(task_record)

    response = f"Task Agent: Saved task '{title}' with {priority} priority."

    if due_date:
        response += " I also detected a due date."
    else:
        response += " No due date was detected."

    return {
        "response": response,
        "extracted_data": saved_task,
    }