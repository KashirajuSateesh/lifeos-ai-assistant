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