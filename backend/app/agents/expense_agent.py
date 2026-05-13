import re
from typing import Dict, Any, Optional


def extract_amount(message: str) -> Optional[float]:
    """
    Extracts money amount from user message.

    Examples:
    - "I spent $25 on lunch" -> 25
    - "paid 40 for gas" -> 40
    - "bought groceries for 32.50" -> 32.50
    """

    amount_pattern = r"\$?\b\d+(?:\.\d{1,2})?\b"
    matches = re.findall(amount_pattern, message)

    if not matches:
        return None

    first_amount = matches[0].replace("$", "")
    return float(first_amount)


def detect_transaction_type(message: str) -> str:
    """
    Detects whether the transaction is debit or credit.

    Debit means money going out.
    Credit means money coming in.
    """

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
    """
    Detects expense category using simple keywords.
    Later, we will improve this using LLM classification.
    """

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
    """
    Creates a simple description from the original message.
    Later, LLM can make this cleaner.
    """

    return message.strip()


def handle_expense_message(message: str, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Expense Agent - version 2.

    Responsibility:
    - Extract amount
    - Detect transaction type
    - Detect category
    - Prepare structured expense data
    """

    amount = extract_amount(message)
    transaction_type = detect_transaction_type(message)
    category = detect_category(message)
    description = clean_description(message)

    expense_data = {
        "amount": amount,
        "category": category,
        "description": description,
        "transaction_type": transaction_type,
    }

    if amount is None:
        return {
            "response": "Expense Agent: I detected this is an expense message, but I could not find the amount. Please include the amount, for example: I spent $25 on lunch.",
            "extracted_data": expense_data,
        }

    if transaction_type == "credit":
        response = f"Expense Agent: I detected income of ${amount:.2f} under {category}."
    else:
        response = f"Expense Agent: I detected an expense of ${amount:.2f} under {category}."

    return {
        "response": response,
        "extracted_data": expense_data,
    }