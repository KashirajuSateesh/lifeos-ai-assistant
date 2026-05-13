from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


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


class ExpenseItem(BaseModel):
    id: str
    user_id: str
    amount: float
    category: str
    description: Optional[str] = None
    transaction_type: str
    created_at: str


class ExpensesResponse(BaseModel):
    status: str
    user_id: str
    count: int
    total_debit: float
    total_credit: float
    net_balance: float
    period: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    expenses: List[ExpenseItem]

class DeleteExpenseResponse(BaseModel):
    status: str
    deleted_expense: Dict[str, Any]
    message: str