from datetime import datetime, timedelta, timezone
import dateparser, re
from typing import Dict, Any, Optional

from app.services.database import save_task
from app.services.llm import extract_task_with_llm


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

from datetime import datetime, timezone
import re
import dateparser


def normalize_date_text(date_text: str) -> str:
    """
    Makes natural language dates easier for dateparser.
    """

    text = date_text.lower().strip()

    # Remove common task words
    text = re.sub(r"\b(remind me to|remind me|need to|add task to|task to)\b", "", text)
    text = re.sub(r"\b(finish|complete|submit|call|pay|do)\b", "", text)

    # Extract phrase after "by", "on", or "at" if present
    for marker in [" by ", " on ", " at "]:
        if marker in f" {text} ":
            text = text.split(marker.strip(), 1)[-1].strip()

    # Convert vague time words into parseable times
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

    Examples:
    - tomorrow morning
    - Friday evening
    - by Friday evening
    - next Monday
    - today
    - tonight
    """

    if not date_text:
        return None

    normalized_text = date_text.strip().lower()

    if normalized_text in ["null", "none", "no due date", ""]:
        return None

    normalized_text = normalize_date_text(normalized_text)

    settings = {
        "PREFER_DATES_FROM": "future",
        "RETURN_AS_TIMEZONE_AWARE": True,
        "TIMEZONE": "UTC",
        "TO_TIMEZONE": "UTC",
    }

    parsed_date = dateparser.parse(normalized_text, settings=settings)

    if not parsed_date:
        print("DATEPARSER COULD NOT PARSE:", date_text, "→", normalized_text)
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

        print("LLM TASK EXTRACTION RESULT:")
        print(llm_task)

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

    # Important fallback:
    # If LLM does not extract due_date_text, try parsing the original message.
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