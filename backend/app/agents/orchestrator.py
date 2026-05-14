import os
import re
from typing import Any, Dict

from dotenv import load_dotenv

from app.services.llm import classify_message_with_llm

load_dotenv()

USE_LLM_ORCHESTRATOR = os.getenv("USE_LLM_ORCHESTRATOR", "true").lower() == "true"


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
    Main Orchestrator.

    First tries OpenAI LLM classification.
    If OpenAI fails, falls back to rule-based classification.
    """

    if USE_LLM_ORCHESTRATOR:
        try:
            llm_result = classify_message_with_llm(message)

            # If confidence is very low, fallback to rules.
            if llm_result.get("confidence", 0.0) >= 0.55:
                return {
                    "intent": llm_result["intent"],
                    "selected_agent": llm_result["selected_agent"],
                    "extracted_data": llm_result.get("extracted_data", {}),
                    "confidence": llm_result.get("confidence", 0.0),
                    "routing_source": "llm",
                    "routing_reason": llm_result.get("reason", ""),
                }

        except Exception as error:
            print("LLM ORCHESTRATOR ERROR:")
            print(error)

    rule_result = classify_intent_rule_based(message)
    rule_result["routing_source"] = "rule_based_fallback"
    return rule_result


def classify_intent_rule_based(message: str) -> Dict[str, Any]:
    """
    Fallback rule-based classifier.
    Used when OpenAI fails or confidence is low.
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
        "salary",
        "income",
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

    if contains_phrase(normalized_message, expense_keywords):
        return {
            "intent": "expense_create",
            "selected_agent": "expense_agent",
            "extracted_data": {},
            "confidence": 0.75,
        }

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
            "confidence": 0.75,
        }

    if contains_phrase(normalized_message, journal_keywords):
        return {
            "intent": "journal_create",
            "selected_agent": "journal_agent",
            "extracted_data": {},
            "confidence": 0.7,
        }

    if contains_phrase(normalized_message, place_keywords) or "http" in normalized_message:
        return {
            "intent": "place_create",
            "selected_agent": "places_agent",
            "extracted_data": {},
            "confidence": 0.7,
        }

    if contains_phrase(normalized_message, task_keywords):
        return {
            "intent": "task_create",
            "selected_agent": "task_agent",
            "extracted_data": {},
            "confidence": 0.7,
        }

    return {
        "intent": "general_chat",
        "selected_agent": "orchestrator",
        "extracted_data": {},
        "confidence": 0.5,
    }