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

    LLM-first routing.
    Rule-based fallback only when LLM fails or returns very low confidence.

    Important:
    Future money obligations should route to task_agent.
    Completed money transactions should route to expense_agent.
    """

    if USE_LLM_ORCHESTRATOR:
        try:
            llm_result = classify_message_with_llm(message)

            selected_agent = llm_result.get("selected_agent", "orchestrator")
            confidence = float(llm_result.get("confidence", 0.0))

            valid_agents = {
                "expense_agent",
                "task_agent",
                "journal_agent",
                "places_agent",
                "orchestrator",
            }

            if selected_agent in valid_agents and confidence >= 0.60:
                return {
                    "intent": llm_result.get("intent", "general_chat"),
                    "selected_agent": selected_agent,
                    "extracted_data": llm_result.get("extracted_data", {}),
                    "confidence": confidence,
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
    Fallback classifier.
    Used only when LLM fails or returns low confidence.

    This fallback is intentionally simple, but it respects this rule:
    Future/planned payment = task
    Completed payment = expense
    """

    normalized_message = message.lower().strip()
    word_count = len(normalized_message.split())

    future_task_phrases = [
        "need to",
        "have to",
        "has to",
        "should",
        "must",
        "remind me",
        "reminder",
        "tomorrow",
        "tonight",
        "next week",
        "next month",
        "by ",
        "due",
        "later",
        "upcoming",
    ]

    task_action_keywords = [
        "pay",
        "pay rent",
        "pay bill",
        "finish",
        "complete",
        "submit",
        "call",
        "email",
        "send",
        "schedule",
        "todo",
        "task",
        "add task",
        "add todo",
    ]

    completed_expense_phrases = [
        "spent",
        "paid",
        "bought",
        "purchased",
        "ordered",
        "got charged",
        "was charged",
        "received",
        "earned",
        "got paid",
        "income",
        "salary",
        "refund",
    ]

    expense_context_keywords = [
        "$",
        "dollar",
        "dollars",
        "usd",
        "lunch",
        "dinner",
        "groceries",
        "gas",
        "rent",
        "bill",
        "shopping",
        "food",
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

    has_future_signal = contains_phrase(normalized_message, future_task_phrases)
    has_task_action = contains_phrase(normalized_message, task_action_keywords)
    has_completed_expense = contains_phrase(
        normalized_message, completed_expense_phrases
    )
    has_money_context = contains_phrase(normalized_message, expense_context_keywords)

    # Highest priority fallback rule:
    # Future/planned payment should become task, not expense.
    if has_future_signal and has_task_action:
        return {
            "intent": "task_create",
            "selected_agent": "task_agent",
            "extracted_data": {},
            "confidence": 0.82,
            "routing_reason": "Future obligation detected, so routed to task agent.",
        }

    # Place should be checked before general task because "want to visit" is not a task.
    if contains_phrase(normalized_message, place_keywords) or "http" in normalized_message:
        return {
            "intent": "place_create",
            "selected_agent": "places_agent",
            "extracted_data": {},
            "confidence": 0.75,
            "routing_reason": "Place or location intent detected.",
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
            "confidence": 0.78,
            "routing_reason": "Reflective journal-style message detected.",
        }

    if contains_phrase(normalized_message, journal_keywords):
        return {
            "intent": "journal_create",
            "selected_agent": "journal_agent",
            "extracted_data": {},
            "confidence": 0.72,
            "routing_reason": "Journal keyword detected.",
        }

    if has_completed_expense and has_money_context:
        return {
            "intent": "expense_create",
            "selected_agent": "expense_agent",
            "extracted_data": {},
            "confidence": 0.82,
            "routing_reason": "Completed financial transaction detected.",
        }

    if has_task_action or has_future_signal:
        return {
            "intent": "task_create",
            "selected_agent": "task_agent",
            "extracted_data": {},
            "confidence": 0.72,
            "routing_reason": "Task or reminder intent detected.",
        }

    if has_money_context:
        return {
            "intent": "expense_create",
            "selected_agent": "expense_agent",
            "extracted_data": {},
            "confidence": 0.65,
            "routing_reason": "Money context detected without future task signal.",
        }

    return {
        "intent": "general_chat",
        "selected_agent": "orchestrator",
        "extracted_data": {},
        "confidence": 0.5,
        "routing_reason": "No clear actionable intent detected.",
    }