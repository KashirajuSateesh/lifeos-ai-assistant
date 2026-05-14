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


# Journal Agent Schemas

class JournalItem(BaseModel):
    id: str
    user_id: str
    entry_text: str
    mood: Optional[str] = None
    tags: Optional[List[str]] = None
    summary: Optional[str] = None
    entry_date: str
    created_at: str


class RecentJournalsResponse(BaseModel):
    status: str
    user_id: str
    count: int
    journals: List[JournalItem]


class MonthlyJournalsResponse(BaseModel):
    status: str
    user_id: str
    year: int
    month: int
    count: int
    journals: List[JournalItem]


class DeleteJournalResponse(BaseModel):
    status: str
    deleted_journal: Dict[str, Any]
    message: str

# Places Agent Schemas

class PlaceItem(BaseModel):
    id: str
    user_id: str
    place_name: str
    description: Optional[str] = None
    category: Optional[str] = None
    environment_tags: Optional[List[str]] = None
    status: str
    city: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source_url: Optional[str] = None
    image_url: Optional[str] = None
    image_source: Optional[str] = None
    photo_credit: Optional[str] = None
    location_known: bool = False
    visited: bool = False
    visited_at: Optional[str] = None
    reminder_enabled: bool = True
    last_suggested_at: Optional[str] = None
    notes: Optional[str] = None
    created_at: str


class PlacesResponse(BaseModel):
    status: str
    user_id: str
    count: int
    places: List[PlaceItem]


class UpdatePlaceRequest(BaseModel):
    place_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    environment_tags: Optional[List[str]] = None
    status: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source_url: Optional[str] = None
    image_url: Optional[str] = None
    image_source: Optional[str] = None
    photo_credit: Optional[str] = None
    location_known: Optional[bool] = None
    visited: Optional[bool] = None
    visited_at: Optional[str] = None
    reminder_enabled: Optional[bool] = None
    last_suggested_at: Optional[str] = None
    notes: Optional[str] = None


class UpdatePlaceResponse(BaseModel):
    status: str
    updated_place: Dict[str, Any]
    message: str


class DeletePlaceResponse(BaseModel):
    status: str
    deleted_place: Dict[str, Any]
    message: str

class NearbyPlacesResponse(BaseModel):
    status: str
    user_id: str
    latitude: float
    longitude: float
    radius_km: float
    count: int
    places: List[Dict[str, Any]]