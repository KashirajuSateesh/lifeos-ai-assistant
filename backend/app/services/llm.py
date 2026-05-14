import json
import os
from typing import Any, Dict

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

client = OpenAI(api_key=OPENAI_API_KEY)


def classify_message_with_llm(message: str) -> Dict[str, Any]:
    """
    Uses OpenAI to classify the user's message and return structured routing data.

    Output shape:
    {
        "intent": "...",
        "selected_agent": "...",
        "confidence": 0.0-1.0,
        "extracted_data": {},
        "reason": "short explanation"
    }
    """

    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is missing")

    system_prompt = """
You are the Orchestrator Agent for a personal AI assistant app.

Your job is to classify the user's message into exactly one agent.

Available agents:
1. expense_agent
   - Use for money, spending, income, payments, purchases, salary, bills, rent, groceries, food expenses.
   - Intents: expense_create

2. task_agent
   - Use for reminders, todos, due dates, things to complete, calls, follow-ups, deadlines.
   - Intents: task_create

3. journal_agent
   - Use for personal reflections, mood, feelings, long daily updates, thoughts, experiences.
   - Intents: journal_create

4. places_agent
   - Use for saved places, restaurants, trips, locations, Google Maps links, favorite places, want-to-visit places.
   - Intents: place_create

5. orchestrator
   - Use only when the message is general chat and does not fit any app action.
   - Intents: general_chat

Rules:
- If a message is a long reflection about the user's day, feelings, progress, or experience, choose journal_agent.
- If a message says "I liked this restaurant called..." choose places_agent, not task_agent.
- If a message includes a Google Maps link, choose places_agent.
- If a message contains money amount and purchase/spending context, choose expense_agent.
- If a message asks to remind, complete, submit, call, or do something later, choose task_agent.
- Return only valid JSON.
- Do not include markdown.
- Do not explain outside JSON.

Required JSON format:
{
  "intent": "expense_create | task_create | journal_create | place_create | general_chat",
  "selected_agent": "expense_agent | task_agent | journal_agent | places_agent | orchestrator",
  "confidence": 0.0,
  "extracted_data": {
    "summary": "short summary of what the user wants"
  },
  "reason": "short reason"
}
"""

    user_prompt = f"""
Classify this user message:

{message}
"""

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt.strip()},
            {"role": "user", "content": user_prompt.strip()},
        ],
    )

    content = response.choices[0].message.content

    if not content:
        raise RuntimeError("OpenAI returned empty classification response")

    parsed = json.loads(content)

    return validate_llm_routing_result(parsed)


def validate_llm_routing_result(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates and normalizes LLM routing result.
    """

    allowed_agents = {
        "expense_agent",
        "task_agent",
        "journal_agent",
        "places_agent",
        "orchestrator",
    }

    allowed_intents = {
        "expense_create",
        "task_create",
        "journal_create",
        "place_create",
        "general_chat",
    }

    selected_agent = result.get("selected_agent", "orchestrator")
    intent = result.get("intent", "general_chat")

    if selected_agent not in allowed_agents:
        selected_agent = "orchestrator"

    if intent not in allowed_intents:
        intent = "general_chat"

    confidence = result.get("confidence", 0.0)

    try:
        confidence = float(confidence)
    except Exception:
        confidence = 0.0

    confidence = max(0.0, min(1.0, confidence))

    extracted_data = result.get("extracted_data") or {}

    if not isinstance(extracted_data, dict):
        extracted_data = {}

    return {
        "intent": intent,
        "selected_agent": selected_agent,
        "confidence": confidence,
        "extracted_data": extracted_data,
        "reason": result.get("reason", ""),
    }


# LLM Extraction Function
def extract_expense_with_llm(message: str) -> Dict[str, Any]:
    """
    Uses OpenAI to extract structured expense/income data.
    """

    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is missing")

    system_prompt = """
You are an Expense Extraction Agent.

Extract expense or income data from the user's message.

Return only valid JSON. Do not include markdown.

Fields:
{
  "amount": number or null,
  "category": "food | groceries | transport | rent | utilities | health | entertainment | shopping | income | other",
  "description": "short readable description",
  "transaction_type": "debit | credit",
  "date_text": "today | yesterday | last Friday | null",
  "confidence": 0.0
}

Rules:
- Use "debit" for money spent, paid, bought, cost, bills, purchases.
- Use "credit" for money received, salary, paycheck, refund, friend sent money.
- If category is unclear, use "other".
- If no amount is found, amount should be null.
- Description should be concise.
"""

    user_prompt = f"""
Extract expense data from this message:

{message}
"""

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt.strip()},
            {"role": "user", "content": user_prompt.strip()},
        ],
    )

    content = response.choices[0].message.content

    if not content:
        raise RuntimeError("OpenAI returned empty expense extraction response")

    parsed = json.loads(content)

    return validate_expense_extraction(parsed)


def validate_expense_extraction(data: Dict[str, Any]) -> Dict[str, Any]:
    allowed_categories = {
        "food",
        "groceries",
        "transport",
        "rent",
        "utilities",
        "health",
        "entertainment",
        "shopping",
        "income",
        "other",
    }

    allowed_transaction_types = {"debit", "credit"}

    amount = data.get("amount")

    try:
        amount = float(amount) if amount is not None else None
    except Exception:
        amount = None

    category = data.get("category", "other")

    if category not in allowed_categories:
        category = "other"

    transaction_type = data.get("transaction_type", "debit")

    if transaction_type not in allowed_transaction_types:
        transaction_type = "debit"

    confidence = data.get("confidence", 0.0)

    try:
        confidence = float(confidence)
    except Exception:
        confidence = 0.0

    confidence = max(0.0, min(1.0, confidence))

    return {
        "amount": amount,
        "category": category,
        "description": data.get("description") or "Expense transaction",
        "transaction_type": transaction_type,
        "date_text": data.get("date_text"),
        "confidence": confidence,
    }

# LLM Task Function
def extract_task_with_llm(message: str) -> Dict[str, Any]:
    """
    Uses OpenAI to extract structured task/reminder data.
    """

    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is missing")

    system_prompt = """
You are a Task Extraction Agent.

Extract task/reminder data from the user's message.

Return only valid JSON. Do not include markdown.

Fields:
{
  "title": "short task title",
  "description": "clear task description",
  "priority": "low | medium | high",
  "due_date_text": "today | tomorrow | next Friday evening | null",
  "reminder_text": "same or similar to due date if reminder exists, else null",
  "status": "pending",
  "confidence": 0.0
}

Rules:
- If user says urgent, important, ASAP, deadline, high priority → priority high.
- If user says later, someday, low priority → priority low.
- Otherwise priority medium.
- Title should be concise and action-oriented.
- If the user mentions any date or time phrase, always extract it into due_date_text.
- Examples:
  "by Friday evening" → "Friday evening"
  "tomorrow morning" → "tomorrow morning"
  "next Monday" → "next Monday"
  "tonight" → "tonight"
- Do not return null if a natural language date phrase exists.
- status should always be pending.
"""

    user_prompt = f"""
Extract task data from this message:

{message}
"""

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt.strip()},
            {"role": "user", "content": user_prompt.strip()},
        ],
    )

    content = response.choices[0].message.content

    if not content:
        raise RuntimeError("OpenAI returned empty task extraction response")

    parsed = json.loads(content)

    return validate_task_extraction(parsed)


def validate_task_extraction(data: Dict[str, Any]) -> Dict[str, Any]:
    allowed_priorities = {"low", "medium", "high"}

    title = data.get("title") or "Untitled task"
    description = data.get("description") or title

    priority = data.get("priority", "medium")
    if priority not in allowed_priorities:
        priority = "medium"

    confidence = data.get("confidence", 0.0)

    try:
        confidence = float(confidence)
    except Exception:
        confidence = 0.0

    confidence = max(0.0, min(1.0, confidence))

    return {
        "title": title,
        "description": description,
        "priority": priority,
        "due_date_text": data.get("due_date_text"),
        "reminder_text": data.get("reminder_text"),
        "status": "pending",
        "confidence": confidence,
    }