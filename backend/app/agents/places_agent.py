from typing import Dict, Any


def handle_places_message(message: str, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Places Agent - first version.

    Responsibility:
    - Handle favorite places and want-to-visit places.
    - Later this agent will extract place name, category, status, and notes.
    """

    return {
        "response": "Places Agent: I understood this is a place-related message. Soon I will save favorite and want-to-visit places.",
        "extracted_data": extracted_data,
    }