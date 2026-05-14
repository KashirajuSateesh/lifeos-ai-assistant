from typing import Dict, Any
import re


def contains_phrase(message: str, phrases: list[str]) -> bool:
    """
    Checks if any phrase exists in the message.
    For single words, uses word boundaries to avoid false matches.
    Example:
    - "call" should not match "called"
    """

    for phrase in phrases:
        if " " in phrase:
            if phrase in message:
                return True
        else:
            pattern = rf"\b{re.escape(phrase)}\b"
            if re.search(pattern, message):
                return True

    return False


def classify_intent(message: str) -> Dict[str, Any]:
    """
    Rule-based intent classifier.

    Current Orchestrator Agent:
    - Detects expense
    - Detects journal
    - Detects places
    - Detects tasks
    """

    normalized_message = message.lower().strip()
    word_count = len(normalized_message.split())

    expense_keywords = [
        "spent",
        "paid",
        "bought",
        "purchase",
        "expense",
        "cost",
        "$",
        "dollar",
        "lunch",
        "dinner",
        "groceries",
        "gas",
    ]

    journal_keywords = [
        "journal",
        "today i felt",
        "i feel",
        "i felt",
        "my day",
        "today was",
        "i worked on",
        "i am feeling",
        "i was feeling",
        "reflection",
        "thoughts",
    ]

    journal_mood_words = [
        "happy",
        "sad",
        "tired",
        "productive",
        "stressed",
        "anxious",
        "excited",
        "grateful",
        "worried",
        "peaceful",
        "confident",
        "upset",
        "angry",
        "good",
        "bad",
        "great",
    ]

    place_keywords = [
        "visit",
        "go to",
        "place",
        "want to go",
        "want to visit",
        "favorite place",
        "save place",
        "restaurant",
        "food place",
        "movie place",
        "park",
        "garden",
        "beach",
        "ocean",
        "mountain",
        "desert",
        "adventure",
        "trip",
        "liked this restaurant",
        "liked this place",
        "bombay grill",
        "google maps",
        "maps.google",
    ]

    task_keywords = [
        "remind me",
        "reminder",
        "todo",
        "task",
        "add task",
        "add todo",
        "call",
        "submit",
        "finish",
        "complete",
        "pay rent",
        "due",
    ]

    # 1. Expense messages are usually clear.
    if contains_phrase(normalized_message, expense_keywords):
        return {
            "intent": "expense_create",
            "selected_agent": "expense_agent",
            "extracted_data": {},
        }

    # 2. Long reflective text should go to Journal Agent.
    is_reflective_journal = (
        word_count >= 15
        and (
            contains_phrase(normalized_message, journal_keywords)
            or contains_phrase(normalized_message, journal_mood_words)
            or normalized_message.startswith("today")
        )
    )

    if is_reflective_journal:
        return {
            "intent": "journal_create",
            "selected_agent": "journal_agent",
            "extracted_data": {},
        }

    # 3. Explicit journal request.
    if contains_phrase(normalized_message, journal_keywords):
        return {
            "intent": "journal_create",
            "selected_agent": "journal_agent",
            "extracted_data": {},
        }

    # 4. Places before tasks.
    # This prevents "called Bombay Grill" from matching task keyword "call".
    if contains_phrase(normalized_message, place_keywords) or "http" in normalized_message:
        return {
            "intent": "place_create",
            "selected_agent": "places_agent",
            "extracted_data": {},
        }

    # 5. Task detection.
    if contains_phrase(normalized_message, task_keywords):
        return {
            "intent": "task_create",
            "selected_agent": "task_agent",
            "extracted_data": {},
        }

    return {
        "intent": "general_chat",
        "selected_agent": "orchestrator",
        "extracted_data": {},
    }