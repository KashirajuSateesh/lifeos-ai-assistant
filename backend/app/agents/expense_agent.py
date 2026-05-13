from typing import Dict, Any


def handle_expense_message(message: str, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Expense Agent - first version.

    Responsibility:
    - Handle expense-related messages.
    - Later this agent will extract amount, category, date, and save to database.
    """

    return {
        "response": "Expense Agent: I understood this is an expense-related message. Soon I will extract amount, category, date, and save it.",
        "extracted_data": extracted_data,
    }