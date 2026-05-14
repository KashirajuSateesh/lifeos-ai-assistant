from typing import Any, Dict, TypedDict

from langgraph.graph import END, StateGraph

from app.agents.expense_agent import handle_expense_message
from app.agents.journal_agent import handle_journal_message
from app.agents.orchestrator import classify_intent
from app.agents.places_agent import handle_places_message
from app.agents.task_agent import handle_task_message


class LifeOSGraphState(TypedDict, total=False):
    user_id: str
    message: str
    intent: str
    selected_agent: str
    extracted_data: Dict[str, Any]
    agent_response: str
    final_response: Dict[str, Any]
    confidence: float
    routing_source: str
    routing_reason: str


def classify_intent_node(state: LifeOSGraphState) -> LifeOSGraphState:
    """
    LangGraph node that classifies the user message.
    Uses LLM orchestrator with rule-based fallback.
    """

    routing_result = classify_intent(state["message"])

    return {
        **state,
        "intent": routing_result.get("intent", "general_chat"),
        "selected_agent": routing_result.get("selected_agent", "orchestrator"),
        "extracted_data": routing_result.get("extracted_data", {}),
        "confidence": routing_result.get("confidence", 0.0),
        "routing_source": routing_result.get("routing_source", "unknown"),
        "routing_reason": routing_result.get("routing_reason", ""),
    }


def route_to_agent(state: LifeOSGraphState) -> str:
    """
    Conditional router.
    Decides which node LangGraph should execute next.
    """

    selected_agent = state.get("selected_agent")

    if selected_agent == "expense_agent":
        return "expense_node"

    if selected_agent == "task_agent":
        return "task_node"

    if selected_agent == "journal_agent":
        return "journal_node"

    if selected_agent == "places_agent":
        return "places_node"

    return "general_node"


def expense_node(state: LifeOSGraphState) -> LifeOSGraphState:
    result = handle_expense_message(
        state["message"],
        state.get("extracted_data", {}),
        user_id=state["user_id"],
    )

    return {
        **state,
        "agent_response": result["response"],
        "extracted_data": result.get("extracted_data"),
    }


def task_node(state: LifeOSGraphState) -> LifeOSGraphState:
    result = handle_task_message(
        state["message"],
        state.get("extracted_data", {}),
        user_id=state["user_id"],
    )

    return {
        **state,
        "agent_response": result["response"],
        "extracted_data": result.get("extracted_data"),
    }


def journal_node(state: LifeOSGraphState) -> LifeOSGraphState:
    result = handle_journal_message(
        state["message"],
        state.get("extracted_data", {}),
        user_id=state["user_id"],
    )

    return {
        **state,
        "agent_response": result["response"],
        "extracted_data": result.get("extracted_data"),
    }


def places_node(state: LifeOSGraphState) -> LifeOSGraphState:
    result = handle_places_message(
        state["message"],
        state.get("extracted_data", {}),
        user_id=state["user_id"],
    )

    return {
        **state,
        "agent_response": result["response"],
        "extracted_data": result.get("extracted_data"),
    }


def general_node(state: LifeOSGraphState) -> LifeOSGraphState:
    return {
        **state,
        "agent_response": (
            "I understood your message, but I could not route it to a specific "
            "LifeOS action yet. Try asking me to log an expense, create a task, "
            "write a journal entry, or save a place."
        ),
    }


def format_response_node(state: LifeOSGraphState) -> LifeOSGraphState:
    """
    Final response formatter.
    This creates a standard response object used by main.py.
    """

    final_response = {
        "intent": state.get("intent"),
        "selected_agent": state.get("selected_agent"),
        "extracted_data": state.get("extracted_data"),
        "response": state.get("agent_response"),
        "confidence": state.get("confidence"),
        "routing_source": state.get("routing_source"),
        "routing_reason": state.get("routing_reason"),
    }

    return {
        **state,
        "final_response": final_response,
    }


def build_lifeos_graph():
    graph = StateGraph(LifeOSGraphState)

    graph.add_node("classify_intent_node", classify_intent_node)
    graph.add_node("expense_node", expense_node)
    graph.add_node("task_node", task_node)
    graph.add_node("journal_node", journal_node)
    graph.add_node("places_node", places_node)
    graph.add_node("general_node", general_node)
    graph.add_node("format_response_node", format_response_node)

    graph.set_entry_point("classify_intent_node")

    graph.add_conditional_edges(
        "classify_intent_node",
        route_to_agent,
        {
            "expense_node": "expense_node",
            "task_node": "task_node",
            "journal_node": "journal_node",
            "places_node": "places_node",
            "general_node": "general_node",
        },
    )

    graph.add_edge("expense_node", "format_response_node")
    graph.add_edge("task_node", "format_response_node")
    graph.add_edge("journal_node", "format_response_node")
    graph.add_edge("places_node", "format_response_node")
    graph.add_edge("general_node", "format_response_node")

    graph.add_edge("format_response_node", END)

    return graph.compile()


lifeos_graph = build_lifeos_graph()


def run_lifeos_graph(message: str, user_id: str) -> Dict[str, Any]:
    """
    Public function used by FastAPI.
    """

    initial_state: LifeOSGraphState = {
        "message": message,
        "user_id": user_id,
        "extracted_data": {},
    }

    result = lifeos_graph.invoke(initial_state)

    return result["final_response"]