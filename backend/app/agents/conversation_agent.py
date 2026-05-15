import json
import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

from app.agents.expense_agent import handle_expense_message
from app.agents.task_agent import handle_task_message
from app.agents.places_agent import handle_places_message
from app.agents.journal_agent import handle_journal_message

from app.agents.orchestrator import classify_intent
from app.services.chat_session_store import (
    append_message_to_state,
    get_or_create_chat_session,
    reset_conversation_focus,
    set_conversation_focus,
    update_chat_session,
)
from app.services.database import get_supabase_client
from app.services.llm import client, OPENAI_MODEL


YES_WORDS = {
    "yes",
    "y",
    "yeah",
    "yep",
    "correct",
    "save",
    "confirm",
    "ok",
    "okay",
}

NO_WORDS = {
    "no",
    "n",
    "nope",
    "cancel",
    "wrong",
    "do not save",
    "dont save",
    "don't save",
}


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

    greeting_words = {
        "hi",
        "hii",
        "hiii",
        "hello",
        "helo",
        "hey",
        "heyy",
        "good morning",
        "good afternoon",
        "good evening",
    }

    return normalized in greeting_words


def is_no_due_date_response(message: str) -> bool:
    normalized = normalize_message(message)

    normalized = normalized.replace("duedate", "due date")
    normalized = normalized.replace("dont", "don't")
    normalized = normalized.replace("end date", "due date")

    no_due_phrases = {
        "no",
        "no date",
        "no due date",
        "not sure",
        "i don't know",
        "don't know",
        "i dont know",
        "dont know",
        "skip",
        "none",
        "no reminder",
        "no deadline",
        "no due",
        "no need",
    }

    if normalized in no_due_phrases:
        return True

    fuzzy_patterns = [
        "no due date",
        "no date",
        "not sure",
        "don't know",
        "dont know",
        "skip",
        "no deadline",
        "no reminder",
    ]

    return any(pattern in normalized for pattern in fuzzy_patterns)


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
                {
                    "label": "Category",
                    "value": str(data.get("category", "other")).title(),
                },
                {
                    "label": "Description",
                    "value": str(data.get("description", "Expense")),
                },
                {
                    "label": "Type",
                    "value": str(data.get("transaction_type", "debit")).title(),
                },
            ],
        }

    if action_type == "task_create":
        return {
            "title": "Task Details",
            "fields": [
                {"label": "Title", "value": str(data.get("title", "Task"))},
                {
                    "label": "Description",
                    "value": str(data.get("description", "")),
                },
                {
                    "label": "Priority",
                    "value": str(data.get("priority", "medium")).title(),
                },
                {
                    "label": "Due Date",
                    "value": str(data.get("due_date_text", "Not detected")),
                },
            ],
        }

    if action_type == "place_create":
        return {
            "title": "Place Details",
            "fields": [
                {
                    "label": "Place Name",
                    "value": str(data.get("place_name", "Place")),
                },
                {
                    "label": "Category",
                    "value": str(data.get("category", "general")).title(),
                },
                {
                    "label": "Status",
                    "value": str(data.get("status", "want_to_visit"))
                    .replace("_", " ")
                    .title(),
                },
                {
                    "label": "Visited",
                    "value": "Yes" if data.get("visited") else "No",
                },
                {
                    "label": "Notes",
                    "value": str(
                        data.get("notes")
                        or data.get("description")
                        or "Not provided"
                    ),
                },
            ],
        }
    
    if action_type == "journal_create":
        return {
            "title": "Journal Entry",
            "fields": [
                {
                    "label": "Mood",
                    "value": str(data.get("mood", "neutral")).title(),
                },
                {
                    "label": "Summary",
                    "value": str(data.get("summary", "Journal entry")),
                },
                {
                    "label": "Tags",
                    "value": ", ".join(data.get("tags", []))
                    if isinstance(data.get("tags"), list)
                    else str(data.get("tags") or "None"),
                },
                {
                    "label": "Entry",
                    "value": str(data.get("entry_text", ""))[:200],
                },
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


def create_task_pending_action(collected_data: Dict[str, Any]) -> Dict[str, Any]:
    due_date_text = collected_data.get("due_date_text")
    reminder_text = collected_data.get("reminder_text") or due_date_text

    return {
        "type": "task_create",
        "selected_agent": "task_agent",
        "intent": "task_create",
        "status": "awaiting_confirmation",
        "data": {
            "title": collected_data.get("title") or "Task",
            "description": collected_data.get("description")
            or collected_data.get("title")
            or "Task",
            "priority": collected_data.get("priority") or "medium",
            "due_date_text": due_date_text,
            "reminder_text": reminder_text,
            "status": "pending",
            "created_at": utc_now_iso(),
        },
    }


def create_place_pending_action(collected_data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "type": "place_create",
        "selected_agent": "places_agent",
        "intent": "place_create",
        "status": "awaiting_confirmation",
        "data": {
            "place_name": collected_data.get("place_name") or "Place",
            "category": collected_data.get("category") or "general",
            "status": collected_data.get("status") or "want_to_visit",
            "description": collected_data.get("description") or collected_data.get("notes"),
            "notes": collected_data.get("notes") or collected_data.get("description"),
            "visited": bool(collected_data.get("visited", False)),
            "source_url": collected_data.get("source_url"),
            "created_at": utc_now_iso(),
        },
    }


def extract_expense_conversation_with_llm(
    message: str,
    conversation_state: Dict[str, Any],
) -> Dict[str, Any]:
    system_prompt = """
You are a friendly LifeOS chatbot assistant.

Your job is to help the user create an expense through conversation.

Expense required fields:
- amount
- category
- description
- transaction_type

Rules:
- If user says they spent money "going there" or "there", use previous conversation context if available.
- Do not default every expense to Lunch.
- If expense category is unclear, use "other".
- If description is unclear, use a short description from the user's words.
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


def extract_task_conversation_with_llm(
    message: str,
    conversation_state: Dict[str, Any],
) -> Dict[str, Any]:
    system_prompt = """
You are a friendly LifeOS chatbot assistant.

Your job is to help the user create a task through conversation.

Task useful fields:
- title
- description
- priority
- due_date_text
- reminder_text

Rules:
- If user says they need to do something in the future, create a task.
- If the task is a payment task such as pay rent, pay insurance, pay bill, pay loan, pay electricity:
  - amount is required
  - due_date_text is required unless the user says no due date / skip / not sure
- If amount is missing for payment task, ask: "How much is it?"
- If due date is missing for payment task after amount is known, ask: "When do you need to pay it?"
- If the task is clear enough, prepare confirmation.
- Do not save directly.
- Always ask confirmation before saving.
- Be friendly and natural.

Examples:
User: I need to pay rent tomorrow
Missing amount, ask: How much is it?

User: I need to finish resume by Friday
Enough info, confirm task.

User: Remind me to call mom tomorrow
Enough info, confirm task.

Return ONLY valid JSON:
{
  "assistant_message": "string",
  "conversation_status": "needs_more_info | awaiting_confirmation",
  "selected_agent": "task_agent",
  "intent": "task_create",
  "collected_data": {
    "title": "string or null",
    "description": "string or null",
    "priority": "low | medium | high",
    "due_date_text": "string or null",
    "reminder_text": "string or null",
    "amount": number or null
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


def extract_place_conversation_with_llm(
    message: str,
    conversation_state: Dict[str, Any],
) -> Dict[str, Any]:
    system_prompt = """
You are a friendly LifeOS chatbot assistant.

Your job is to help the user save places through conversation.

Place useful fields:
- place_name
- category
- status
- description
- notes
- visited
- source_url

Rules:
- If user says they went to a place today, visited should be true.
- If user says they want to visit a place, visited should be false and status should be want_to_visit.
- If user says favorite place, liked this place, or loved this restaurant, status should be favorite.
- If the message includes a Google Maps or website link, put it in source_url.
- Only ask a follow-up if place_name is missing.
- Do NOT ask for category. Infer category yourself.
- If category is not obvious, use "general".
- If user gives only a place name after you asked for the name, use that as place_name and prepare confirmation.
- Do not save directly.
- Always ask confirmation before saving.
- Be friendly and natural.

Category guidance:
- restaurant, cafe, food place -> restaurant
- aquarium, zoo, museum, attraction -> entertainment
- park, national park, garden -> park
- beach, ocean -> ocean
- mountain, hiking -> mountain
- city, country, travel destination -> travel
- movie/theater -> movie
- shopping/mall -> shopping
- otherwise -> general

Examples:
User: I went to national park today
Return place_name "National Park", category "park", visited true, status "want_to_visit".

User: I want to visit Goa someday
Return place_name "Goa", category "travel", visited false, status "want_to_visit".

User: I liked Bombay Grill restaurant
Return place_name "Bombay Grill", category "restaurant", visited true, status "favorite".

Return ONLY valid JSON:
{
  "assistant_message": "string",
  "conversation_status": "needs_more_info | awaiting_confirmation",
  "selected_agent": "places_agent",
  "intent": "place_create",
  "collected_data": {
    "place_name": "string or null",
    "category": "string or null",
    "status": "want_to_visit | favorite",
    "description": "string or null",
    "notes": "string or null",
    "visited": true or false,
    "source_url": "string or null"
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


def is_expense_query(message: str) -> bool:
    normalized = normalize_message(message)

    expense_words = [
        "expense",
        "expenses",
        "spend",
        "spent",
        "spending",
        "logged",
        "loged",
        "money",
        "transactions",
        "transaction",
    ]

    query_words = [
        "what",
        "show",
        "how much",
        "list",
        "tell me",
        "did i",
        "this month",
        "today",
        "this week",
        "this year",
    ]

    has_expense_word = any(word in normalized for word in expense_words)
    has_query_word = any(word in normalized for word in query_words)

    return has_expense_word and has_query_word


def get_period_range(period: str) -> tuple[str, str]:
    now = datetime.now(timezone.utc)

    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)

    elif period == "this_week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=7)

    elif period == "this_year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = start.replace(year=start.year + 1)

    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        if start.month == 12:
            end = start.replace(year=start.year + 1, month=1)
        else:
            end = start.replace(month=start.month + 1)

    return start.isoformat(), end.isoformat()


def extract_expense_query_with_llm(message: str) -> Dict[str, Any]:
    system_prompt = """
You are helping LifeOS understand a user's question about saved expenses.

Extract:
- period: today | this_week | this_month | this_year | all
- category: food | groceries | transport | rent | utilities | health | entertainment | shopping | income | other | all
- query_type: summary | list

Rules:
- If user asks "this month", period is this_month.
- If user asks "today", period is today.
- If user asks "this week", period is this_week.
- If no period is clear, use this_month.
- If no category is clear, use all.
- If user asks "what expenses" or "how much", query_type is summary.
- If user asks "show/list", query_type is list.

Return ONLY valid JSON:
{
  "period": "today | this_week | this_month | this_year | all",
  "category": "string",
  "query_type": "summary | list"
}
"""

    user_prompt = f"""
User expense question:
"{message}"
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

    return json.loads(response.choices[0].message.content)


def summarize_expenses_for_chat(message: str, user_id: str) -> Dict[str, Any]:
    try:
        query_info = extract_expense_query_with_llm(message)
    except Exception as error:
        print("EXPENSE QUERY LLM ERROR:")
        print(error)

        query_info = {
            "period": "this_month",
            "category": "all",
            "query_type": "summary",
        }

    period = query_info.get("period", "this_month")
    category = query_info.get("category", "all")
    query_type = query_info.get("query_type", "summary")

    supabase = get_supabase_client()

    query = (
        supabase.table("expenses")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
    )

    if period != "all":
        start_date, end_date = get_period_range(period)
        query = query.gte("created_at", start_date).lt("created_at", end_date)

    if category and category != "all":
        query = query.eq("category", category)

    result = query.execute()
    expenses = result.data or []

    if not expenses:
        period_text = period.replace("_", " ")
        return {
            "assistant_message": f"I did not find any expenses for {period_text}.",
            "conversation_status": "general_response",
            "selected_agent": "expense_agent",
            "intent": "expense_query",
            "collected_data": {
                "period": period,
                "category": category,
                "count": 0,
                "total_debit": 0,
                "total_credit": 0,
                "net_balance": 0,
            },
            "missing_fields": [],
            "pending_action": None,
            "confirmation_card": None,
        }

    total_debit = 0.0
    total_credit = 0.0
    category_totals: Dict[str, float] = {}

    for expense in expenses:
        amount = float(expense.get("amount") or 0)
        transaction_type = expense.get("transaction_type") or "debit"
        expense_category = expense.get("category") or "other"

        if transaction_type == "credit":
            total_credit += amount
        else:
            total_debit += amount
            category_totals[expense_category] = (
                category_totals.get(expense_category, 0.0) + amount
            )

    net_balance = total_credit - total_debit

    top_category = None
    if category_totals:
        top_category = max(category_totals.items(), key=lambda item: item[1])

    period_text = period.replace("_", " ")

    if query_type == "list":
        recent_items = expenses[:5]

        item_lines = []
        for item in recent_items:
            description = item.get("description") or "Expense"
            amount = float(item.get("amount") or 0)
            item_category = item.get("category") or "other"
            item_lines.append(f"- {description}: ${amount:.2f} ({item_category})")

        assistant_message = (
            f"Here are your recent expenses for {period_text}:\n"
            + "\n".join(item_lines)
        )

    else:
        assistant_message = (
            f"For {period_text}, you logged {len(expenses)} transaction(s). "
            f"Money out is ${total_debit:.2f}, money in is ${total_credit:.2f}, "
            f"and net balance is ${net_balance:.2f}."
        )

        if top_category:
            assistant_message += (
                f" Your biggest spending category was {top_category[0]} "
                f"with ${top_category[1]:.2f}."
            )

    confirmation_card = {
        "title": "Expense Summary",
        "fields": [
            {"label": "Period", "value": period_text.title()},
            {"label": "Transactions", "value": str(len(expenses))},
            {"label": "Money Out", "value": f"${total_debit:.2f}"},
            {"label": "Money In", "value": f"${total_credit:.2f}"},
            {"label": "Net Balance", "value": f"${net_balance:.2f}"},
        ],
    }

    if top_category:
        confirmation_card["fields"].append(
            {
                "label": "Top Category",
                "value": f"{top_category[0].title()} (${top_category[1]:.2f})",
            }
        )

    return {
        "assistant_message": assistant_message,
        "conversation_status": "general_response",
        "selected_agent": "expense_agent",
        "intent": "expense_query",
        "collected_data": {
            "period": period,
            "category": category,
            "count": len(expenses),
            "total_debit": total_debit,
            "total_credit": total_credit,
            "net_balance": net_balance,
            "top_category": top_category[0] if top_category else None,
        },
        "missing_fields": [],
        "pending_action": None,
        "confirmation_card": confirmation_card,
    }


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
        cancelled_data = pending_action.get("data", {})
        cancelled_type = pending_action.get("type")

        conversation_state = append_message_to_state(
            conversation_state,
            "user",
            message,
        )

        conversation_state = reset_conversation_focus(conversation_state)

        # Keep light context so follow-up phrases like "going there"
        # can still refer to the cancelled place.
        if cancelled_type == "place_create":
            conversation_state["last_place_context"] = {
                "place_name": cancelled_data.get("place_name"),
                "category": cancelled_data.get("category"),
                "notes": cancelled_data.get("notes") or cancelled_data.get("description"),
                "visited": cancelled_data.get("visited"),
            }

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

        if action_type == "task_create":
            title = data.get("title") or "Task"
            description = data.get("description") or title
            due_date_text = data.get("due_date_text")
            reminder_text = data.get("reminder_text")

            task_message_parts = [title, description]

            if due_date_text:
                task_message_parts.append(f"Due date: {due_date_text}")

            if reminder_text:
                task_message_parts.append(f"Reminder: {reminder_text}")

            task_message = ". ".join(task_message_parts)

            agent_result = handle_task_message(
                task_message,
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
                "assistant_message": "Done, I saved it to your tasks.",
                "conversation_status": "saved",
                "selected_agent": "task_agent",
                "intent": "task_create",
                "collected_data": data,
                "missing_fields": [],
                "pending_action": None,
                "confirmation_card": build_confirmation_card("task_create", data),
                "agent_result": agent_result,
            }

        if action_type == "place_create":
            place_name = data.get("place_name") or "Place"
            category = data.get("category") or "general"
            notes = data.get("notes") or data.get("description") or ""

            place_message_parts = [
                f"Save place: {place_name}",
                f"Category: {category}",
            ]

            if notes:
                place_message_parts.append(f"Notes: {notes}")

            if data.get("source_url"):
                place_message_parts.append(f"URL: {data.get('source_url')}")

            if data.get("visited"):
                place_message_parts.append("Visited: yes")
            else:
                place_message_parts.append("Visited: no")

            place_message = ". ".join(place_message_parts)

            agent_result = handle_places_message(
                place_message,
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
                "assistant_message": "Done, I saved it to your places.",
                "conversation_status": "saved",
                "selected_agent": "places_agent",
                "intent": "place_create",
                "collected_data": data,
                "missing_fields": [],
                "pending_action": None,
                "confirmation_card": build_confirmation_card("place_create", data),
                "agent_result": agent_result,
            }
        
        if action_type == "journal_create":
            entry_text = data.get("entry_text") or ""
            mood = data.get("mood") or "neutral"
            summary = data.get("summary") or "Journal entry"
            tags = data.get("tags") or []

            journal_message_parts = [
                entry_text,
                f"Mood: {mood}",
                f"Summary: {summary}",
            ]

            if tags:
                journal_message_parts.append(f"Tags: {', '.join(tags)}")

            journal_message = ". ".join(journal_message_parts)

            agent_result = handle_journal_message(
                journal_message,
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
                "assistant_message": "Done, I saved it to your journal.",
                "conversation_status": "saved",
                "selected_agent": "journal_agent",
                "intent": "journal_create",
                "collected_data": data,
                "missing_fields": [],
                "pending_action": None,
                "confirmation_card": build_confirmation_card("journal_create", data),
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

    amount = extract_amount_from_text(message)
    if amount is not None:
        collected_data["amount"] = amount

    last_place_context = conversation_state.get("last_place_context") or {}
    normalized_message = normalize_message(message)

    if last_place_context and any(
        phrase in normalized_message
        for phrase in ["there", "going there", "went there", "to that place", "for that place"]
    ):
        place_name = last_place_context.get("place_name")

        if place_name:
            collected_data["description"] = place_name

        # Aquarium/parks/museums are better as entertainment/travel than food.
        place_category = last_place_context.get("category") or ""

        if place_category in ["entertainment", "park", "travel", "general"]:
            collected_data["category"] = "entertainment"
        else:
            collected_data["category"] = place_category or "other"

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
        collected_data["category"] = "other"

    if not collected_data.get("description"):
        collected_data["description"] = "Expense"

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


def handle_task_conversation(
    message: str,
    session: Dict[str, Any],
) -> Dict[str, Any]:
    conversation_state = session.get("conversation_state") or {}
    previous_data = conversation_state.get("collected_data", {}) or {}

    llm_result = extract_task_conversation_with_llm(
        message=message,
        conversation_state=conversation_state,
    )

    current_data = llm_result.get("collected_data", {}) or {}

    collected_data = previous_data.copy()

    for key, value in current_data.items():
        if value not in [None, "", [], {}]:
            collected_data[key] = value

    amount = extract_amount_from_text(message)
    if amount is not None:
        collected_data["amount"] = amount

    if is_no_due_date_response(message):
        collected_data["due_date_text"] = None
        collected_data["reminder_text"] = None
        collected_data["no_due_date_confirmed"] = True

        if "missing_fields" in llm_result:
            llm_result["missing_fields"] = [
                field for field in llm_result["missing_fields"]
                if field != "due_date_text"
            ]

    title = collected_data.get("title") or ""
    description = collected_data.get("description") or ""

    previous_title = previous_data.get("title") or ""
    previous_description = previous_data.get("description") or ""

    if not title and previous_title:
        collected_data["title"] = previous_title
        title = previous_title

    if not description and previous_description:
        collected_data["description"] = previous_description
        description = previous_description

    task_text = (
        f"{previous_title} {previous_description} {title} {description} {message}"
        .lower()
    )

    payment_keywords = [
        "pay",
        "rent",
        "bill",
        "insurance",
        "electricity",
        "loan",
        "credit card",
        "fee",
        "payment",
        "service charge",
        "charge",
    ]

    is_payment_task = any(keyword in task_text for keyword in payment_keywords)

    if amount is not None and is_payment_task:
        if not collected_data.get("title"):
            collected_data["title"] = "Payment task"

        if "rent" in task_text:
            collected_data["title"] = "Pay rent"
        elif "insurance" in task_text:
            collected_data["title"] = "Pay insurance"
        elif "electricity" in task_text:
            collected_data["title"] = "Pay electricity bill"
        elif "service charge" in task_text:
            collected_data["title"] = "Pay service charge"
        elif "bill" in task_text:
            collected_data["title"] = "Pay bill"

        collected_data["description"] = (
            f"{collected_data.get('title', 'Payment task')} of ${amount:.2f}"
        )

    if previous_data.get("due_date_text") and not collected_data.get("due_date_text"):
        collected_data["due_date_text"] = previous_data.get("due_date_text")

    if previous_data.get("reminder_text") and not collected_data.get("reminder_text"):
        collected_data["reminder_text"] = previous_data.get("reminder_text")

    if collected_data.get("due_date_text") and not collected_data.get("reminder_text"):
        collected_data["reminder_text"] = collected_data.get("due_date_text")

    missing_fields = []

    if not collected_data.get("title"):
        missing_fields.append("title")

    if is_payment_task and not collected_data.get("amount"):
        missing_fields.append("amount")

    if (
        is_payment_task
        and collected_data.get("amount")
        and not collected_data.get("due_date_text")
        and not collected_data.get("no_due_date_confirmed")
    ):
        missing_fields.append("due_date_text")

    missing_fields = list(dict.fromkeys(missing_fields))

    if missing_fields:
        conversation_state = set_conversation_focus(
            conversation_state,
            intent="task_create",
            selected_agent="task_agent",
            collected_data=collected_data,
            missing_fields=missing_fields,
        )

        if "amount" in missing_fields:
            assistant_message = "How much is it?"
        elif "due_date_text" in missing_fields:
            assistant_message = "When do you need to pay it?"
        elif "title" in missing_fields:
            assistant_message = "What task should I create?"
        else:
            assistant_message = "Can you give me a little more detail?"

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
            "selected_agent": "task_agent",
            "intent": "task_create",
            "collected_data": collected_data,
            "missing_fields": missing_fields,
            "pending_action": None,
            "confirmation_card": None,
        }

    if not collected_data.get("priority"):
        collected_data["priority"] = "medium"

    if not collected_data.get("description"):
        collected_data["description"] = collected_data.get("title")

    pending_action = create_task_pending_action(collected_data)
    confirmation_card = build_confirmation_card("task_create", pending_action["data"])

    assistant_message = "I found this task. Is this correct?"

    conversation_state = set_conversation_focus(
        conversation_state,
        intent="task_create",
        selected_agent="task_agent",
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
        "selected_agent": "task_agent",
        "intent": "task_create",
        "collected_data": pending_action["data"],
        "missing_fields": [],
        "pending_action": pending_action,
        "confirmation_card": confirmation_card,
    }


def handle_place_conversation(
    message: str,
    session: Dict[str, Any],
) -> Dict[str, Any]:
    conversation_state = session.get("conversation_state") or {}
    previous_data = conversation_state.get("collected_data", {}) or {}

    llm_result = extract_place_conversation_with_llm(
        message=message,
        conversation_state=conversation_state,
    )

    current_data = llm_result.get("collected_data", {}) or {}

    collected_data = previous_data.copy()

    for key, value in current_data.items():
        if value not in [None, "", [], {}]:
            collected_data[key] = value

    missing_fields = llm_result.get("missing_fields", []) or []

    # Only place_name is truly required.
    # Category/status/visited can be inferred or defaulted.
    if not collected_data.get("place_name"):
        if "place_name" not in missing_fields:
            missing_fields.append("place_name")

    # Do not ask follow-up just for category/status/visited.
    missing_fields = [
        field
        for field in missing_fields
        if field in ["place_name"]
    ]

    missing_fields = list(dict.fromkeys(missing_fields))

    if missing_fields:
        conversation_state = set_conversation_focus(
            conversation_state,
            intent="place_create",
            selected_agent="places_agent",
            collected_data=collected_data,
            missing_fields=missing_fields,
        )

        if "place_name" in missing_fields:
            assistant_message = "What is the name of the place?"
        else:
            assistant_message = (
                llm_result.get("assistant_message")
                or "Can you give me a little more detail about the place?"
            )

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
            "selected_agent": "places_agent",
            "intent": "place_create",
            "collected_data": collected_data,
            "missing_fields": missing_fields,
            "pending_action": None,
            "confirmation_card": None,
        }

    if not collected_data.get("category"):
        collected_data["category"] = "general"

    if not collected_data.get("status"):
        collected_data["status"] = "want_to_visit"

    if "visited" not in collected_data:
        collected_data["visited"] = False

    pending_action = create_place_pending_action(collected_data)
    confirmation_card = build_confirmation_card("place_create", pending_action["data"])

    assistant_message = "I found this place. Is this correct?"

    conversation_state = set_conversation_focus(
        conversation_state,
        intent="place_create",
        selected_agent="places_agent",
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
        "selected_agent": "places_agent",
        "intent": "place_create",
        "collected_data": pending_action["data"],
        "missing_fields": [],
        "pending_action": pending_action,
        "confirmation_card": confirmation_card,
    }

def create_journal_pending_action(collected_data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "type": "journal_create",
        "selected_agent": "journal_agent",
        "intent": "journal_create",
        "status": "awaiting_confirmation",
        "data": {
            "entry_text": collected_data.get("entry_text") or "",
            "mood": collected_data.get("mood") or "neutral",
            "summary": collected_data.get("summary") or "Journal entry",
            "tags": collected_data.get("tags") or [],
            "created_at": utc_now_iso(),
        },
    }

def extract_journal_conversation_with_llm(
    message: str,
    conversation_state: Dict[str, Any],
) -> Dict[str, Any]:
    """
    LLM extracts journal data and decides what is missing.
    This does not save anything.
    """

    system_prompt = """
You are a friendly LifeOS chatbot assistant.

Your job is to help the user save journal entries through conversation.

Journal useful fields:
- entry_text
- mood
- summary
- tags

Rules:
- Journal is for feelings, reflections, thoughts, mood, personal experiences, or day summaries.
- If the user writes a meaningful reflection, prepare confirmation.
- If the message is too short or unclear, ask one short follow-up question.
- Do not save directly.
- Always ask confirmation before saving.
- Be friendly and natural.

Mood guidance:
- tired, exhausted -> tired
- stressed, anxious, worried -> stressed
- happy, good, great, excited -> happy
- productive, focused, proud -> productive
- sad, upset, angry -> negative
- otherwise -> neutral

Tags guidance:
Create 1 to 5 short lowercase tags based on the entry.
Examples:
project, work, health, family, school, productivity, stress, gratitude

Return ONLY valid JSON:
{
  "assistant_message": "string",
  "conversation_status": "needs_more_info | awaiting_confirmation",
  "selected_agent": "journal_agent",
  "intent": "journal_create",
  "collected_data": {
    "entry_text": "string or null",
    "mood": "string or null",
    "summary": "string or null",
    "tags": ["tag1", "tag2"]
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

def handle_journal_conversation(
    message: str,
    session: Dict[str, Any],
) -> Dict[str, Any]:
    conversation_state = session.get("conversation_state") or {}
    previous_data = conversation_state.get("collected_data", {}) or {}

    llm_result = extract_journal_conversation_with_llm(
        message=message,
        conversation_state=conversation_state,
    )

    current_data = llm_result.get("collected_data", {}) or {}

    collected_data = previous_data.copy()

    for key, value in current_data.items():
        if value not in [None, "", [], {}]:
            collected_data[key] = value

    missing_fields = llm_result.get("missing_fields", []) or []

    entry_text = collected_data.get("entry_text") or ""

    # Avoid saving very short unclear messages as journal.
    if len(entry_text.strip()) < 10:
        if "entry_text" not in missing_fields:
            missing_fields.append("entry_text")

    missing_fields = list(dict.fromkeys(missing_fields))

    if missing_fields:
        conversation_state = set_conversation_focus(
            conversation_state,
            intent="journal_create",
            selected_agent="journal_agent",
            collected_data=collected_data,
            missing_fields=missing_fields,
        )

        if "entry_text" in missing_fields:
            assistant_message = (
                "Can you tell me a little more about how your day went or how you felt?"
            )
        else:
            assistant_message = (
                llm_result.get("assistant_message")
                or "Can you share a little more for the journal entry?"
            )

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
            "selected_agent": "journal_agent",
            "intent": "journal_create",
            "collected_data": collected_data,
            "missing_fields": missing_fields,
            "pending_action": None,
            "confirmation_card": None,
        }

    if not collected_data.get("mood"):
        collected_data["mood"] = "neutral"

    if not collected_data.get("summary"):
        collected_data["summary"] = "Journal entry"

    if not collected_data.get("tags"):
        collected_data["tags"] = []

    pending_action = create_journal_pending_action(collected_data)
    confirmation_card = build_confirmation_card(
        "journal_create",
        pending_action["data"],
    )

    assistant_message = "I found this journal entry. Is this correct?"

    conversation_state = set_conversation_focus(
        conversation_state,
        intent="journal_create",
        selected_agent="journal_agent",
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
        "selected_agent": "journal_agent",
        "intent": "journal_create",
        "collected_data": pending_action["data"],
        "missing_fields": [],
        "pending_action": pending_action,
        "confirmation_card": confirmation_card,
    }


def handle_conversational_chat(message: str, user_id: str) -> Dict[str, Any]:
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

    if session.get("pending_action"):
        return handle_pending_confirmation(message, session, user_id)

    if is_expense_query(message):
        response = summarize_expenses_for_chat(
            message=message,
            user_id=user_id,
        )

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

    if current_intent == "expense_create" and selected_agent == "expense_agent":
        return handle_expense_conversation(message, session)

    if current_intent == "task_create" and selected_agent == "task_agent":
        return handle_task_conversation(message, session)

    if current_intent == "place_create" and selected_agent == "places_agent":
        return handle_place_conversation(message, session)
    
    if current_intent == "journal_create" and selected_agent == "journal_agent":
        return handle_journal_conversation(message, session)

    route_result = classify_intent(message)

    if route_result.get("selected_agent") == "expense_agent":
        return handle_expense_conversation(message, session)

    if route_result.get("selected_agent") == "task_agent":
        return handle_task_conversation(message, session)

    if route_result.get("selected_agent") == "places_agent":
        return handle_place_conversation(message, session)

    if route_result.get("selected_agent") == "journal_agent":
        return handle_journal_conversation(message, session)

    return {
        "assistant_message": (
            "I understood your message, but this conversational save flow is currently enabled "
            "for expenses, tasks, and places. Next we will add journals and more query flows."
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