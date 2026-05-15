import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.agents.expense_agent import handle_expense_message
from app.agents.orchestrator import classify_intent
from app.services.chat_session_store import (
    append_message_to_state,
    clear_pending_action,
    get_or_create_chat_session,
    reset_conversation_focus,
    set_conversation_focus,
    update_chat_session,
)
from app.services.llm import client, OPENAI_MODEL


YES_WORDS = {"yes", "y", "yeah", "yep", "correct", "save", "confirm", "ok", "okay"}
NO_WORDS = {"no", "n", "nope", "cancel", "wrong", "do not save", "dont save", "don't save"}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_message(message: str) -> str:
    return message.lower().strip()


def is_yes(message: str) -> bool:
    normalized = normalize_message(message)
    return normalized in YES_WORDS


def is_no(message: str) -> bool:
    normalized = normalize_message(message)
    return normalized in NO_WORDS


def is_greeting(message: str) -> bool:
    normalized = normalize_message(message)
    return normalized in {"hi", "hello", "hey", "hii", "good morning", "good evening"}


def extract_amount_from_text(message: str) -> Optional[float]:
    """
    Extract amount from short messages like:
    - 20$
    - $20
    - 20 dollars
    - it was 20
    """

    patterns = [
        r"\$\s*(\d+(?:\.\d{1,2})?)",
        r"(\d+(?:\.\d{1,2})?)\s*\$",
        r"(\d+(?:\.\d{1,2})?)\s*(?:dollar|dollars|usd)",
        r"^\s*(\d+(?:\.\d{1,2})?)\s*$",
    ]

    for pattern in patterns:
        match = re.search(pattern, message.lower())
        if match:
            return float(match.group(1))

    return None


def build_confirmation_card(action_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
    if action_type == "expense_create":
        return {
            "title": "Expense Details",
            "fields": [
                {"label": "Amount", "value": f"${float(data.get('amount', 0)):.2f}"},
                {"label": "Category", "value": str(data.get("category", "other")).title()},
                {"label": "Description", "value": str(data.get("description", "Expense"))},
                {"label": "Type", "value": str(data.get("transaction_type", "debit")).title()},
            ],
        }

    return {
        "title": "Action Details",
        "fields": [{"label": key, "value": str(value)} for key, value in data.items()],
    }


def friendly_response(message: str) -> Dict[str, Any]:
    return {
        "assistant_message": "Hi! How can I help you today?",
        "conversation_status": "general_response",
        "selected_agent": "orchestrator",
        "intent": "general_chat",
        "collected_data": {},
        "missing_fields": [],
        "pending_action": None,
        "confirmation_card": None,
    }


def create_expense_pending_action(collected_data: Dict[str, Any]) -> Dict[str, Any]:
    amount = collected_data.get("amount")

    return {
        "type": "expense_create",
        "selected_agent": "expense_agent",
        "intent": "expense_create",
        "status": "awaiting_confirmation",
        "data": {
            "amount": float(amount),
            "category": collected_data.get("category") or "food",
            "description": collected_data.get("description") or "Lunch",
            "transaction_type": collected_data.get("transaction_type") or "debit",
            "created_at": utc_now_iso(),
        },
    }


def extract_expense_conversation_with_llm(
    message: str,
    conversation_state: Dict[str, Any],
) -> Dict[str, Any]:
    """
    LLM extracts partial expense data and decides what is missing.
    This does not save anything.
    """

    system_prompt = """
You are a friendly LifeOS chatbot assistant.

Your job is to help the user create an expense through conversation.

You must extract expense information from the current message and previous conversation state.

Expense required fields:
- amount
- category
- description
- transaction_type

Rules:
- If user says they went for lunch, category is food and description is Lunch.
- If amount is missing, ask how much it cost.
- If amount is present, prepare a confirmation.
- Do not save directly.
- Always ask confirmation before saving.
- Be friendly and natural.

Return ONLY valid JSON:
{
  "assistant_message": "string",
  "conversation_status": "needs_more_info | awaiting_confirmation",
  "selected_agent": "expense_agent",
  "intent": "expense_create",
  "collected_data": {
    "amount": number or null,
    "category": "string or null",
    "description": "string or null",
    "transaction_type": "debit or credit"
  },
  "missing_fields": ["field_name"]
}
"""

    user_prompt = f"""
Current user message:
{message}

Current conversation state:
{json.dumps(conversation_state)}
"""

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    return json.loads(content)


def handle_pending_confirmation(
    message: str,
    session: Dict[str, Any],
    user_id: str,
) -> Dict[str, Any]:
    pending_action = session.get("pending_action")
    conversation_state = session.get("conversation_state") or {}

    if not pending_action:
        return {}

    if is_no(message):
        conversation_state = append_message_to_state(
            conversation_state,
            "user",
            message,
        )
        conversation_state = reset_conversation_focus(conversation_state)

        update_chat_session(
            session_id=session["id"],
            conversation_state=conversation_state,
            pending_action=None,
        )

        return {
            "assistant_message": "No problem, I cancelled it. Tell me again with the correct details whenever you are ready.",
            "conversation_status": "cancelled",
            "selected_agent": pending_action.get("selected_agent"),
            "intent": pending_action.get("intent"),
            "collected_data": pending_action.get("data", {}),
            "missing_fields": [],
            "pending_action": None,
            "confirmation_card": None,
        }

    if is_yes(message):
        action_type = pending_action.get("type")
        data = pending_action.get("data", {})

        if action_type == "expense_create":
            expense_message = (
                f"I spent {data.get('amount')} dollars on "
                f"{data.get('description', 'expense')}"
            )

            agent_result = handle_expense_message(
                expense_message,
                data,
                user_id=user_id,
            )

            conversation_state = append_message_to_state(
                conversation_state,
                "user",
                message,
            )
            conversation_state = reset_conversation_focus(conversation_state)

            update_chat_session(
                session_id=session["id"],
                conversation_state=conversation_state,
                pending_action=None,
            )

            return {
                "assistant_message": "Done, I saved it to your expenses.",
                "conversation_status": "saved",
                "selected_agent": "expense_agent",
                "intent": "expense_create",
                "collected_data": data,
                "missing_fields": [],
                "pending_action": None,
                "confirmation_card": build_confirmation_card("expense_create", data),
                "agent_result": agent_result,
            }

        return {
            "assistant_message": "I found a pending action, but I do not know how to save this type yet.",
            "conversation_status": "general_response",
            "selected_agent": pending_action.get("selected_agent"),
            "intent": pending_action.get("intent"),
            "collected_data": data,
            "missing_fields": [],
            "pending_action": pending_action,
            "confirmation_card": None,
        }

    return {
        "assistant_message": "Please reply yes to save it, or no to cancel it.",
        "conversation_status": "awaiting_confirmation",
        "selected_agent": pending_action.get("selected_agent"),
        "intent": pending_action.get("intent"),
        "collected_data": pending_action.get("data", {}),
        "missing_fields": [],
        "pending_action": pending_action,
        "confirmation_card": build_confirmation_card(
            pending_action.get("type"),
            pending_action.get("data", {}),
        ),
    }


def handle_expense_conversation(
    message: str,
    session: Dict[str, Any],
) -> Dict[str, Any]:
    conversation_state = session.get("conversation_state") or {}

    llm_result = extract_expense_conversation_with_llm(
        message=message,
        conversation_state=conversation_state,
    )

    collected_data = llm_result.get("collected_data", {}) or {}

    # Backup extraction for short amount-only replies like "20$"
    amount = extract_amount_from_text(message)
    if amount is not None:
        collected_data["amount"] = amount

    if not collected_data.get("transaction_type"):
        collected_data["transaction_type"] = "debit"

    missing_fields = []

    if not collected_data.get("amount"):
        missing_fields.append("amount")

    if missing_fields:
        conversation_state = set_conversation_focus(
            conversation_state,
            intent="expense_create",
            selected_agent="expense_agent",
            collected_data=collected_data,
            missing_fields=missing_fields,
        )

        assistant_message = llm_result.get("assistant_message") or "How much did it cost?"

        conversation_state = append_message_to_state(
            conversation_state,
            "assistant",
            assistant_message,
        )

        update_chat_session(
            session_id=session["id"],
            conversation_state=conversation_state,
            pending_action=None,
        )

        return {
            "assistant_message": assistant_message,
            "conversation_status": "needs_more_info",
            "selected_agent": "expense_agent",
            "intent": "expense_create",
            "collected_data": collected_data,
            "missing_fields": missing_fields,
            "pending_action": None,
            "confirmation_card": None,
        }

    if not collected_data.get("category"):
        collected_data["category"] = "food"

    if not collected_data.get("description"):
        collected_data["description"] = "Lunch"

    pending_action = create_expense_pending_action(collected_data)
    confirmation_card = build_confirmation_card("expense_create", pending_action["data"])

    assistant_message = "I found this expense. Is this correct?"

    conversation_state = set_conversation_focus(
        conversation_state,
        intent="expense_create",
        selected_agent="expense_agent",
        collected_data=pending_action["data"],
        missing_fields=[],
    )

    conversation_state = append_message_to_state(
        conversation_state,
        "assistant",
        assistant_message,
    )

    update_chat_session(
        session_id=session["id"],
        conversation_state=conversation_state,
        pending_action=pending_action,
    )

    return {
        "assistant_message": assistant_message,
        "conversation_status": "awaiting_confirmation",
        "selected_agent": "expense_agent",
        "intent": "expense_create",
        "collected_data": pending_action["data"],
        "missing_fields": [],
        "pending_action": pending_action,
        "confirmation_card": confirmation_card,
    }


def handle_conversational_chat(message: str, user_id: str) -> Dict[str, Any]:
    """
    Main conversational chatbot handler.
    This is the new chat brain.

    For now:
    - Greetings
    - Expense multi-turn flow
    - Confirmation yes/no
    - Fallback to old intent classifier for routing
    """

    session = get_or_create_chat_session(user_id)
    conversation_state = session.get("conversation_state") or {}

    conversation_state = append_message_to_state(
        conversation_state,
        "user",
        message,
    )

    update_chat_session(
        session_id=session["id"],
        conversation_state=conversation_state,
    )

    # If waiting for confirmation, handle yes/no first.
    if session.get("pending_action"):
        return handle_pending_confirmation(message, session, user_id)

    if is_greeting(message):
        response = friendly_response(message)

        conversation_state = append_message_to_state(
            conversation_state,
            "assistant",
            response["assistant_message"],
        )

        update_chat_session(
            session_id=session["id"],
            conversation_state=conversation_state,
        )

        return response

    current_intent = conversation_state.get("current_intent")
    selected_agent = conversation_state.get("selected_agent")

    # Continue existing expense conversation after bot asked a follow-up.
    if current_intent == "expense_create" and selected_agent == "expense_agent":
        return handle_expense_conversation(message, session)

    route_result = classify_intent(message)

    if route_result.get("selected_agent") == "expense_agent":
        return handle_expense_conversation(message, session)

    # For agents not converted yet, respond conversationally but do not save.
    return {
        "assistant_message": (
            "I understood your message, but this conversational save flow is currently enabled for expenses first. "
            "Next we will add tasks, journals, and places confirmation flow."
        ),
        "conversation_status": "general_response",
        "selected_agent": route_result.get("selected_agent", "orchestrator"),
        "intent": route_result.get("intent", "general_chat"),
        "collected_data": route_result.get("extracted_data", {}),
        "missing_fields": [],
        "pending_action": None,
        "confirmation_card": None,
        "routing_source": route_result.get("routing_source"),
        "routing_reason": route_result.get("routing_reason"),
    }