from typing import Dict, Any


def classify_intent(message: str) -> Dict[str, Any]:
    """
    Simple rule-based intent classifier.

    This is our first version of the Orchestrator Agent.
    Later, we will replace this with an LLM-based classifier and LangGraph.
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
        "write this",
        "note this",
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
        "place",
        "want to go",
        "favorite place",
        "save place",
        "restaurant",
        "trip",
    ]

    # 1. Expense should be checked early because money messages are usually clear.
    if any(keyword in normalized_message for keyword in expense_keywords):
        return {
            "intent": "expense_create",
            "selected_agent": "expense_agent",
            "extracted_data": {},
        }

    # 2. Strong journal detection.
    # Long reflective text should go to Journal Agent even if it contains words like project/work/complete.
    is_reflective_journal = (
        word_count >= 15
        and (
            any(keyword in normalized_message for keyword in journal_keywords)
            or any(word in normalized_message for word in journal_mood_words)
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
    if any(keyword in normalized_message for keyword in journal_keywords):
        return {
            "intent": "journal_create",
            "selected_agent": "journal_agent",
            "extracted_data": {},
        }

    # 4. Task detection after journal detection.
    # This prevents long journal entries from becoming tasks.
    if any(keyword in normalized_message for keyword in task_keywords):
        return {
            "intent": "task_create",
            "selected_agent": "task_agent",
            "extracted_data": {},
        }

    # 5. Places.
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