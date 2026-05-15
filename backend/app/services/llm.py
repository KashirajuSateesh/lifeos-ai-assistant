import json
import os
from typing import Any, Dict

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

client = OpenAI(api_key=OPENAI_API_KEY)


def classify_message_with_llm(message: str) -> dict:
    """
    Uses LLM to classify the user's message into the correct LifeOS agent.

    Main rule:
    - Incomplete but likely expense messages should still route to expense_agent.
    - The conversation agent will ask for missing fields later.
    """

    system_prompt = """
You are the intent router for LifeOS, a multi-agent personal AI assistant.

Your job is to choose exactly one agent for the user's message.

IMPORTANT:
You are only routing the message. You do NOT need all required fields.
If information is missing, still choose the correct agent. The chatbot will ask follow-up questions later.

Available agents:

1. expense_agent
Use when the user is describing spending, income, or a likely financial activity.
This includes incomplete expense messages where amount is missing.

Examples:
- I spent $18 on lunch -> expense_agent
- I paid $350 rent yesterday -> expense_agent
- I bought groceries for $45 -> expense_agent
- I received $3000 salary -> expense_agent
- I went for lunch today -> expense_agent
- I had dinner outside -> expense_agent
- I got gas today -> expense_agent
- I went grocery shopping -> expense_agent

Important:
If user mentions lunch, dinner, groceries, gas, shopping, rent already paid, bought, spent, paid, or received money, route to expense_agent.
Even if amount is missing, route to expense_agent.

2. task_agent
Use when the user wants to do something later, needs a reminder, has a due date, or has a future obligation.
This includes future money-related obligations.

Examples:
- I need to pay rent of $350 tomorrow -> task_agent
- Remind me to pay electricity bill Friday -> task_agent
- I have to pay $200 insurance next week -> task_agent
- Need to finish my resume by Friday -> task_agent
- Call mom tomorrow -> task_agent
- Submit project report tonight -> task_agent

CRITICAL RULE:
Future/planned money obligation = task_agent.
Completed/already happened money activity = expense_agent.

Examples:
- I need to pay rent tomorrow -> task_agent
- I paid rent yesterday -> expense_agent
- I have to buy groceries tomorrow -> task_agent
- I bought groceries today -> expense_agent

3. journal_agent
Use only when the user is reflecting about feelings, mood, thoughts, or personal experience.

Examples:
- Today I felt stressed but productive -> journal_agent
- My day was exhausting -> journal_agent
- I feel proud because I finished my project -> journal_agent
- Journal this: I had a good day -> journal_agent
- I was anxious today -> journal_agent

Do NOT choose journal_agent just because the message contains "today".
"I went for lunch today" is expense_agent, not journal_agent.

4. places_agent
Use when the user wants to save, remember, visit, or describe a place, restaurant, park, trip, location, or Google Maps link.

Examples:
- I liked this restaurant called Bombay Grill -> places_agent
- I want to visit New York someday -> places_agent
- Save this Google Maps link -> places_agent
- I want to go to a beach place -> places_agent

5. orchestrator
Use only for greetings, general chat, or unclear messages.

Examples:
- Hi -> orchestrator
- Hello -> orchestrator
- What can you do? -> orchestrator

Return ONLY valid JSON with this schema:
{
  "intent": "expense_create | task_create | journal_create | place_create | general_chat",
  "selected_agent": "expense_agent | task_agent | journal_agent | places_agent | orchestrator",
  "confidence": 0.0,
  "reason": "short reason",
  "extracted_data": {}
}

Confidence guidance:
- 0.90+ when routing is obvious
- 0.70-0.89 when likely but missing details
- below 0.60 when unclear

Do not include markdown.
Do not include explanations outside JSON.
"""

    user_prompt = f"""
Classify this LifeOS user message:

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

    content = response.choices[0].message.content

    return json.loads(content)

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


# LLM Journal Extractor
def extract_journal_with_llm(message: str) -> Dict[str, Any]:
    """
    Uses OpenAI to extract journal mood, tags, and summary.
    """

    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is missing")

    system_prompt = """
You are a Journal Analysis Agent.

Analyze the user's journal entry and return structured JSON.

Return only valid JSON. Do not include markdown.

Fields:
{
  "mood": "positive | negative | neutral | mixed",
  "tags": ["short_tag_1", "short_tag_2"],
  "summary": "1 sentence summary of the journal entry",
  "confidence": 0.0
}

Rules:
- Use "mixed" when the user expresses both positive and negative emotions.
- Tags should be lowercase and concise, like: work, project, family, health, stress, productivity, learning, career, finance, relationship, personal_growth.
- Summary should be short, clear, and human-readable.
- Do not include more than 5 tags.
"""

    user_prompt = f"""
Analyze this journal entry:

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
        raise RuntimeError("OpenAI returned empty journal extraction response")

    parsed = json.loads(content)

    return validate_journal_extraction(parsed)


def validate_journal_extraction(data: Dict[str, Any]) -> Dict[str, Any]:
    allowed_moods = {"positive", "negative", "neutral", "mixed"}

    mood = data.get("mood", "neutral")

    if mood not in allowed_moods:
        mood = "neutral"

    tags = data.get("tags") or []

    if not isinstance(tags, list):
        tags = ["general"]

    cleaned_tags = []

    for tag in tags:
        if isinstance(tag, str):
            cleaned = tag.strip().lower().replace(" ", "_")
            if cleaned:
                cleaned_tags.append(cleaned)

    cleaned_tags = cleaned_tags[:5] or ["general"]

    summary = data.get("summary") or "Journal entry saved."

    confidence = data.get("confidence", 0.0)

    try:
        confidence = float(confidence)
    except Exception:
        confidence = 0.0

    confidence = max(0.0, min(1.0, confidence))

    return {
        "mood": mood,
        "tags": cleaned_tags,
        "summary": summary,
        "confidence": confidence,
    }


# LLM Places Extractor

def extract_place_with_llm(message: str) -> Dict[str, Any]:
    """
    Uses OpenAI to extract structured place data.
    """

    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is missing")

    system_prompt = """
You are a Places Extraction Agent.

Extract structured place/location data from the user's message.

Return only valid JSON. Do not include markdown.

Fields:
{
  "place_name": "specific place name or short readable title",
  "description": "clean description of the place or user note",
  "category": "ocean | mountain | desert | adventure | restaurant | movie | park | city | shopping | travel | residential | general",
  "environment_tags": ["tag1", "tag2"],
  "status": "want_to_visit | favorite",
  "city": "city name or null",
  "location_query": "best text to use for geocoding or null",
  "source_url": "url if user pasted one or null",
  "confidence": 0.0
}

Rules:
- If user says liked, loved, favorite, good place, best place → status should be favorite.
- If user says want to visit, want to go, save for later, try someday → status should be want_to_visit.
- If user provides a street/address/city/state, put the full location in location_query.
- If user provides Google Maps or any map link, put it in source_url.
- If exact place name is unclear but user describes a type of place, create a readable place_name from the description.
- environment_tags should be lowercase and concise.
- Do not include more than 5 tags.
"""

    user_prompt = f"""
Extract place data from this message:

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
        raise RuntimeError("OpenAI returned empty place extraction response")

    parsed = json.loads(content)

    return validate_place_extraction(parsed)


def validate_place_extraction(data: Dict[str, Any]) -> Dict[str, Any]:
    allowed_categories = {
        "ocean",
        "mountain",
        "desert",
        "adventure",
        "restaurant",
        "movie",
        "park",
        "city",
        "shopping",
        "travel",
        "residential",
        "general",
    }

    allowed_statuses = {"want_to_visit", "favorite"}

    place_name = data.get("place_name") or "Saved place"
    description = data.get("description") or place_name

    category = data.get("category", "general")
    if category not in allowed_categories:
        category = "general"

    status = data.get("status", "want_to_visit")
    if status not in allowed_statuses:
        status = "want_to_visit"

    tags = data.get("environment_tags") or []

    if not isinstance(tags, list):
        tags = ["general"]

    cleaned_tags = []

    for tag in tags:
        if isinstance(tag, str):
            cleaned = tag.strip().lower().replace(" ", "_")
            if cleaned:
                cleaned_tags.append(cleaned)

    cleaned_tags = cleaned_tags[:5] or ["general"]

    confidence = data.get("confidence", 0.0)

    try:
        confidence = float(confidence)
    except Exception:
        confidence = 0.0

    confidence = max(0.0, min(1.0, confidence))

    return {
        "place_name": str(place_name).strip(),
        "description": str(description).strip(),
        "category": category,
        "environment_tags": cleaned_tags,
        "status": status,
        "city": data.get("city"),
        "location_query": data.get("location_query"),
        "source_url": data.get("source_url"),
        "confidence": confidence,
    }