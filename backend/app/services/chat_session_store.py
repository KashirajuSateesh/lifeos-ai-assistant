from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.services.database import supabase


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_active_chat_session(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the active chat session for a user.
    For now, we keep one active session per user.
    """

    result = (
        supabase.table("chat_sessions")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "active")
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )

    if result.data:
        return result.data[0]

    return None


def create_chat_session(user_id: str) -> Dict[str, Any]:
    """
    Create a new active chat session.
    """

    session_data = {
        "user_id": user_id,
        "conversation_state": {
            "last_messages": [],
            "current_intent": None,
            "selected_agent": None,
        },
        "pending_action": None,
        "status": "active",
        "updated_at": utc_now_iso(),
    }

    result = supabase.table("chat_sessions").insert(session_data).execute()

    return result.data[0]


def get_or_create_chat_session(user_id: str) -> Dict[str, Any]:
    """
    Get the user's active chat session.
    If there is no active session, create one.
    """

    existing_session = get_active_chat_session(user_id)

    if existing_session:
        return existing_session

    return create_chat_session(user_id)


def update_chat_session(
    session_id: str,
    conversation_state: Optional[Dict[str, Any]] = None,
    pending_action: Optional[Dict[str, Any]] = None,
    status: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Update chat session state.
    """

    update_data: Dict[str, Any] = {
        "updated_at": utc_now_iso(),
    }

    if conversation_state is not None:
        update_data["conversation_state"] = conversation_state

    if pending_action is not None:
        update_data["pending_action"] = pending_action

    if status is not None:
        update_data["status"] = status

    result = (
        supabase.table("chat_sessions")
        .update(update_data)
        .eq("id", session_id)
        .execute()
    )

    return result.data[0]


def clear_pending_action(session_id: str) -> Dict[str, Any]:
    """
    Clear the pending action after save/cancel.
    """

    result = (
        supabase.table("chat_sessions")
        .update(
            {
                "pending_action": None,
                "updated_at": utc_now_iso(),
            }
        )
        .eq("id", session_id)
        .execute()
    )

    return result.data[0]


def append_message_to_state(
    conversation_state: Dict[str, Any],
    role: str,
    content: str,
    max_messages: int = 10,
) -> Dict[str, Any]:
    """
    Keep a short rolling conversation history.
    This helps LLM understand short replies like:
    - 20$
    - yes
    - no
    - tomorrow
    """

    state = conversation_state or {}

    last_messages = state.get("last_messages", [])

    last_messages.append(
        {
            "role": role,
            "content": content,
            "timestamp": utc_now_iso(),
        }
    )

    state["last_messages"] = last_messages[-max_messages:]

    return state


def set_conversation_focus(
    conversation_state: Dict[str, Any],
    intent: Optional[str],
    selected_agent: Optional[str],
    collected_data: Optional[Dict[str, Any]] = None,
    missing_fields: Optional[list[str]] = None,
) -> Dict[str, Any]:
    """
    Store the current conversation focus.
    Example:
    User: I went for lunch today
    Bot: How much did it cost?

    State stores:
    current_intent = expense_create
    selected_agent = expense_agent
    collected_data = {"description": "Lunch", "category": "food"}
    missing_fields = ["amount"]
    """

    state = conversation_state or {}

    state["current_intent"] = intent
    state["selected_agent"] = selected_agent
    state["collected_data"] = collected_data or {}
    state["missing_fields"] = missing_fields or []

    return state


def reset_conversation_focus(conversation_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Reset current intent after action is saved/cancelled.
    Keep last_messages for conversational continuity.
    """

    state = conversation_state or {}

    state["current_intent"] = None
    state["selected_agent"] = None
    state["collected_data"] = {}
    state["missing_fields"] = []

    return state