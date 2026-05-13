from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional

from app.services.database import save_task


def detect_priority(message: str) -> str:
    """
    Detect task priority from the user message.
    """

    normalized_message = message.lower()

    if any(word in normalized_message for word in ["urgent", "important", "asap", "high priority"]):
        return "high"

    if any(word in normalized_message for word in ["low priority", "not urgent", "whenever"]):
        return "low"

    return "medium"


def extract_due_date(message: str) -> Optional[str]:
    """
    Basic date extraction for first version.

    Later, we will use LLM extraction for better dates like:
    - next Friday
    - after 2 weeks
    - May 20 at 5 PM
    """

    normalized_message = message.lower()
    now = datetime.now(timezone.utc)

    if "today" in normalized_message:
        due_date = now.replace(hour=23, minute=59, second=0, microsecond=0)
        return due_date.isoformat()

    if "tomorrow" in normalized_message:
        due_date = now + timedelta(days=1)
        due_date = due_date.replace(hour=23, minute=59, second=0, microsecond=0)
        return due_date.isoformat()

    if "next week" in normalized_message:
        due_date = now + timedelta(days=7)
        due_date = due_date.replace(hour=23, minute=59, second=0, microsecond=0)
        return due_date.isoformat()

    return None


def clean_task_title(message: str) -> str:
    """
    Creates a simple task title from the user message.
    """

    cleaned = message.strip()

    prefixes = [
        "remind me to ",
        "add task to ",
        "add todo to ",
        "todo ",
        "task ",
        "reminder ",
    ]

    lowered = cleaned.lower()

    for prefix in prefixes:
        if lowered.startswith(prefix):
            return cleaned[len(prefix):].strip().capitalize()

    return cleaned.capitalize()


def handle_task_message(
    message: str,
    extracted_data: Dict[str, Any],
    user_id: str = "demo-user",
) -> Dict[str, Any]:
    """
    Task Agent - version 2.

    Responsibility:
    - Extract task title
    - Detect due date
    - Detect priority
    - Save task to Supabase
    """

    title = clean_task_title(message)
    priority = detect_priority(message)
    due_date = extract_due_date(message)

    task_record = {
        "user_id": user_id,
        "title": title,
        "description": message.strip(),
        "status": "pending",
        "priority": priority,
        "due_date": due_date,
        "reminder_at": due_date,
    }

    saved_task = save_task(task_record)

    response = f"Task Agent: Saved task '{title}' with {priority} priority."

    if due_date:
        response += " I also detected a due date."

    return {
        "response": response,
        "extracted_data": saved_task,
    }