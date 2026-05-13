from typing import Dict, Any


def handle_journal_message(message: str, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Journal Agent - first version.

    Responsibility:
    - Handle journal entries and reflections.
    - Later this agent will detect mood, tags, and save the journal entry.
    """

    return {
        "response": "Journal Agent: I understood this is a journal entry. Soon I will detect mood, create tags, and save it.",
        "extracted_data": extracted_data,
    }