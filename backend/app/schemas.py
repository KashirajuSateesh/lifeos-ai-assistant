from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class ChatRequest(BaseModel):
    user_id: str = Field(..., description="Unique ID of the user sending the message")
    message: str = Field(..., min_length=1, description="User message sent to LifeOS")


class ChatResponse(BaseModel):
    status: str
    user_id: str
    message_received: str
    intent: Optional[str] = None
    selected_agent: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    response: str