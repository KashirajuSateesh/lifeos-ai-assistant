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

class UpdateExpenseRequest(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    transaction_type: Optional[str] = None


class UpdateExpenseResponse(BaseModel):
    status: str
    updated_expense: Dict[str, Any]
    message: str


# Reminder Task Schemas

class TaskItem(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[str] = None
    reminder_at: Optional[str] = None
    created_at: str


class TasksResponse(BaseModel):
    status: str
    user_id: str
    count: int
    pending_count: int
    completed_count: int
    tasks: List[TaskItem]


class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    reminder_at: Optional[str] = None


class UpdateTaskResponse(BaseModel):
    status: str
    updated_task: Dict[str, Any]
    message: str


class DeleteTaskResponse(BaseModel):
    status: str
    deleted_task: Dict[str, Any]
    message: str

class TaskRemindersResponse(BaseModel):
    status: str
    user_id: str
    due_today_count: int
    upcoming_count: int
    overdue_count: int
    follow_up_count: int
    due_today: List[TaskItem]
    upcoming: List[TaskItem]
    overdue: List[TaskItem]
    follow_up: List[TaskItem]