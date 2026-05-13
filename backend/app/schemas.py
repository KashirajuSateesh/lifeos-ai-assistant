from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    user_id: str = Field(..., description="Unique ID of the user sending the message")
    message: str = Field(..., min_length=1, description="User message sent to LifeOS")


class ChatResponse(BaseModel):
    status: str
    user_id: str
    message_received: str
    response: str