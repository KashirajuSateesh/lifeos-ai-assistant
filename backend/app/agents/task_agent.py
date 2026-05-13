from typing import Dict, Any


def handle_task_message(message: str, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Task Agent - first version.

    Responsibility:
    - Handle todo and reminder-related messages.
    - Later this agent will extract task title, due date, priority, and reminder time.
    """

    return {
        "response": "Task Agent: I understood this is a task or reminder. Soon I will extract task details and save it.",
        "extracted_data": extracted_data,
    }