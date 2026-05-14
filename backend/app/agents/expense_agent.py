import re
from typing import Dict, Any, Optional

from app.services.database import save_expense
from app.services.llm import extract_expense_with_llm


def extract_amount(message: str) -> Optional[float]:
    amount_pattern = r"\$?\b\d+(?:\.\d{1,2})?\b"
    matches = re.findall(amount_pattern, message)

    if not matches:
        return None

    first_amount = matches[0].replace("$", "")
    return float(first_amount)


def detect_transaction_type(message: str) -> str:
    normalized_message = message.lower()

    income_keywords = [
        "earned",
        "salary",
        "paid me",
        "received",
        "got paid",
        "income",
        "deposit",
        "credited",
    ]

    if any(keyword in normalized_message for keyword in income_keywords):
        return "credit"

    return "debit"


def detect_category(message: str) -> str:
    normalized_message = message.lower()

    category_keywords = {
        "food": ["lunch", "dinner", "breakfast", "restaurant", "subway", "coffee", "food", "meal"],
        "groceries": ["grocery", "groceries", "walmart", "costco", "kroger"],
        "transport": ["gas", "fuel", "uber", "lyft", "taxi", "bus", "train"],
        "shopping": ["shirt", "clothes", "shoes", "amazon", "shopping", "bought"],
        "rent": ["rent", "apartment"],
        "utilities": ["electricity", "water", "internet", "wifi", "phone bill"],
        "health": ["medicine", "doctor", "hospital", "pharmacy"],
        "entertainment": ["movie", "netflix", "spotify", "game"],
        "income": ["salary", "income", "got paid", "received", "deposit"],
    }

    for category, keywords in category_keywords.items():
        if any(keyword in normalized_message for keyword in keywords):
            return category

    return "other"


def clean_description(message: str) -> str:
    return message.strip()


def handle_expense_message(
    message: str,
    extracted_data: Dict[str, Any],
    user_id: str = "demo-user",
) -> Dict[str, Any]:
    """
    Expense Agent.

    Uses LLM extraction first, then validates and saves expense/income record.
    """

    try:
        llm_expense = extract_expense_with_llm(message)
    except Exception as error:
        print("LLM EXPENSE EXTRACTION ERROR:")
        print(error)
        llm_expense = {}

    amount = llm_expense.get("amount")
    category = llm_expense.get("category") or "other"
    description = llm_expense.get("description") or message
    transaction_type = llm_expense.get("transaction_type") or "debit"

    if amount is None or amount <= 0:
        return {
            "response": "Expense Agent: I understood this is a transaction, but I could not find a valid amount. Please include the amount.",
            "extracted_data": {
                "message": message,
                "category": category,
                "description": description,
                "transaction_type": transaction_type,
            },
        }

    expense_record = {
        "user_id": user_id,
        "amount": amount,
        "category": category,
        "description": description,
        "transaction_type": transaction_type,
    }

    saved_expense = save_expense(expense_record)

    if transaction_type == "credit":
        response = f"Expense Agent: Saved ${amount:.2f} as income under {category}."
    else:
        response = f"Expense Agent: Saved ${amount:.2f} as spending under {category}."

    return {
        "response": response,
        "extracted_data": saved_expense,
    }