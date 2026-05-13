from typing import Dict, Any


def classify_intent(message: str) -> Dict[str, Any]:
    """
    Simple rule-based intent classifier.

    This is our first version of the Orchestrator Agent.
    Later, we will replace this with an LLM-based classifier and LangGraph.
    """

    normalized_message = message.lower()

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

    task_keywords = [
        "remind",
        "todo",
        "task",
        "call",
        "submit",
        "finish",
        "complete",
        "pay rent",
    ]

    journal_keywords = [
        "journal",
        "today i felt",
        "i feel",
        "i felt",
        "my day",
        "write this",
        "note this",
    ]

    place_keywords = [
        "visit",
        "place",
        "want to go",
        "favorite place",
        "save place",
        "restaurant",
        "trip",
    ]

    if any(keyword in normalized_message for keyword in expense_keywords):
        return {
            "intent": "expense_create",
            "selected_agent": "expense_agent",
            "extracted_data": {},
        }

    if any(keyword in normalized_message for keyword in task_keywords):
        return {
            "intent": "task_create",
            "selected_agent": "task_agent",
            "extracted_data": {},
        }

    if any(keyword in normalized_message for keyword in journal_keywords):
        return {
            "intent": "journal_create",
            "selected_agent": "journal_agent",
            "extracted_data": {},
        }

    if any(keyword in normalized_message for keyword in place_keywords):
        return {
            "intent": "place_create",
            "selected_agent": "places_agent",
            "extracted_data": {},
        }

    return {
        "intent": "general_chat",
        "selected_agent": "orchestrator",
        "extracted_data": {},
    }