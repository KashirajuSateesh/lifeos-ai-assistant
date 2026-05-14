from datetime import date
from typing import Dict, Any

from app.services.database import save_journal_entry
from app.services.llm import extract_journal_with_llm


def detect_mood(message: str) -> str:
    """
    Basic rule-based mood detection.
    Later we can improve this using OpenAI.
    """

    normalized_message = message.lower()

    positive_words = [
        "happy",
        "productive",
        "excited",
        "grateful",
        "good",
        "great",
        "confident",
        "peaceful",
    ]

    negative_words = [
        "sad",
        "tired",
        "stressed",
        "angry",
        "upset",
        "bad",
        "anxious",
        "worried",
    ]

    if any(word in normalized_message for word in positive_words) and any(
        word in normalized_message for word in negative_words
    ):
        return "mixed"

    if any(word in normalized_message for word in positive_words):
        return "positive"

    if any(word in normalized_message for word in negative_words):
        return "negative"

    return "neutral"


def detect_tags(message: str) -> list[str]:
    """
    Basic tag detection from journal text.
    """

    normalized_message = message.lower()

    tag_keywords = {
        "work": ["work", "office", "project", "meeting", "job", "manager"],
        "health": ["gym", "health", "workout", "sleep", "tired", "energy"],
        "study": ["study", "learning", "course", "interview", "project"],
        "family": ["family", "parents", "mom", "dad", "brother", "sister"],
        "finance": ["money", "expense", "salary", "rent", "budget"],
        "emotion": ["happy", "sad", "stressed", "anxious", "excited"],
    }

    tags = []

    for tag, keywords in tag_keywords.items():
        if any(keyword in normalized_message for keyword in keywords):
            tags.append(tag)

    return tags or ["general"]


def create_summary(message: str) -> str:
    """
    Creates a short summary from journal text.
    First version uses simple truncation.
    Later we will use OpenAI summarization.
    """

    cleaned = message.strip()

    if len(cleaned) <= 120:
        return cleaned

    return cleaned[:117] + "..."


def handle_journal_message(
    message: str,
    extracted_data: Dict[str, Any],
    user_id: str = "demo-user",
) -> Dict[str, Any]:
    """
    Journal Agent.

    Uses LLM extraction for:
    - mood
    - tags
    - summary
    """

    entry_text = message.strip()

    if len(entry_text) < 10:
        return {
            "response": "Journal Agent: Please write a little more so I can save a meaningful journal entry.",
            "extracted_data": {
                "entry_text": entry_text,
            },
        }

    try:
        llm_journal = extract_journal_with_llm(entry_text)

        print("LLM JOURNAL EXTRACTION RESULT:")
        print(llm_journal)

    except Exception as error:
        print("LLM JOURNAL EXTRACTION ERROR:")
        print(error)

        mood = detect_mood(entry_text)
        tags = detect_tags(entry_text)
        summary = create_summary(entry_text)

        llm_journal = {
            "mood": mood,
            "tags": tags,
            "summary": summary,
            "confidence": 0.0,
        }

    journal_record = {
        "user_id": user_id,
        "entry_text": entry_text,
        "mood": llm_journal["mood"],
        "tags": llm_journal["tags"],
        "summary": llm_journal["summary"],
        "entry_date": date.today().isoformat(),
    }

    saved_journal = save_journal_entry(journal_record)

    return {
        "response": f"Journal Agent: Saved your journal entry with {llm_journal['mood']} mood.",
        "extracted_data": saved_journal,
    }