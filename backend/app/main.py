from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import ChatRequest, ChatResponse
from app.agents.orchestrator import classify_intent
from app.agents.expense_agent import handle_expense_message
from app.agents.task_agent import handle_task_message
from app.agents.journal_agent import handle_journal_message
from app.agents.places_agent import handle_places_message

from app.schemas import (
    ChatRequest,
    ChatResponse,
    ExpensesResponse,
    DeleteExpenseResponse,
    UpdateExpenseRequest,
    UpdateExpenseResponse,
    TasksResponse,
    UpdateTaskRequest,
    UpdateTaskResponse,
    DeleteTaskResponse,
    TaskRemindersResponse,
)
from app.services.database import (
    get_expenses_by_user,
    delete_expense_by_id,
    update_expense_by_id,
    get_tasks_by_user,
    update_task_by_id,
    delete_task_by_id,
    get_task_reminders_by_user
)

from datetime import datetime, timedelta, timezone
from typing import Optional

app = FastAPI(
    title="LifeOS AI Assistant API",
    description="Backend API for the LifeOS Personal AI Assistant using a multi-agent system.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # We will restrict this later for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "LifeOS AI Assistant backend is running",
        "status": "success",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "lifeos-backend",
    }


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    routing_result = classify_intent(request.message)

    intent = routing_result["intent"]
    selected_agent = routing_result["selected_agent"]
    extracted_data = routing_result.get("extracted_data", {})

    if selected_agent == "expense_agent":
        agent_result = handle_expense_message(
            request.message,
            extracted_data,
            user_id=request.user_id,
        )

    elif selected_agent == "task_agent":
        agent_result = handle_task_message(
        request.message,
        extracted_data,
        user_id=request.user_id,
    )

    elif selected_agent == "journal_agent":
        agent_result = handle_journal_message(request.message, extracted_data)

    elif selected_agent == "places_agent":
        agent_result = handle_places_message(request.message, extracted_data)

    else:
        agent_result = {
            "response": "Orchestrator: I received your message. Soon I will handle general conversation too.",
            "extracted_data": extracted_data,
        }

    return ChatResponse(
        status="success",
        user_id=request.user_id,
        message_received=request.message,
        intent=intent,
        selected_agent=selected_agent,
        extracted_data=agent_result.get("extracted_data", {}),
        response=agent_result["response"],
    )



def get_date_range_for_period(period: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """
    Converts a period like today, this_week, this_month, this_year
    into start_date and end_date ISO strings.
    """

    if not period:
        return None, None

    now = datetime.now(timezone.utc)

    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
        return start.isoformat(), end.isoformat()

    if period == "this_week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
        return start.isoformat(), end.isoformat()

    if period == "this_month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
        return start.isoformat(), end.isoformat()

    if period == "this_year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
        return start.isoformat(), end.isoformat()

    return None, None

@app.get("/api/expenses/{user_id}", response_model=ExpensesResponse)
def get_expenses(
    user_id: str,
    period: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    period_start, period_end = get_date_range_for_period(period)

    final_start_date = start_date or period_start
    final_end_date = end_date or period_end

    expenses = get_expenses_by_user(
        user_id=user_id,
        start_date=final_start_date,
        end_date=final_end_date,
    )

    total_debit = sum(
        float(expense["amount"])
        for expense in expenses
        if expense["transaction_type"] == "debit"
    )

    total_credit = sum(
        float(expense["amount"])
        for expense in expenses
        if expense["transaction_type"] == "credit"
    )

    net_balance = total_credit - total_debit

    return ExpensesResponse(
        status="success",
        user_id=user_id,
        count=len(expenses),
        total_debit=total_debit,
        total_credit=total_credit,
        net_balance=net_balance,
        period=period,
        start_date=final_start_date,
        end_date=final_end_date,
        expenses=expenses,
    )

@app.delete("/api/expenses/{expense_id}", response_model=DeleteExpenseResponse)
def delete_expense(expense_id: str):
    deleted_expense = delete_expense_by_id(expense_id)

    return DeleteExpenseResponse(
        status="success",
        deleted_expense=deleted_expense,
        message="Expense deleted successfully",
    )

@app.patch("/api/expenses/{expense_id}", response_model=UpdateExpenseResponse)
def update_expense(expense_id: str, request: UpdateExpenseRequest):
    update_data = request.model_dump(exclude_none=True)

    if "transaction_type" in update_data:
        if update_data["transaction_type"] not in ["debit", "credit"]:
            raise HTTPException(
                status_code=400,
                detail="transaction_type must be either debit or credit",
            )

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No update fields provided",
        )

    updated_expense = update_expense_by_id(expense_id, update_data)

    return UpdateExpenseResponse(
        status="success",
        updated_expense=updated_expense,
        message="Expense updated successfully",
    )


# Reminder Task Endpoints or API for Task Agent
@app.get("/api/tasks/{user_id}", response_model=TasksResponse)
def get_tasks(user_id: str):
    tasks = get_tasks_by_user(user_id)

    pending_count = sum(1 for task in tasks if task["status"] == "pending")
    completed_count = sum(1 for task in tasks if task["status"] == "completed")

    return TasksResponse(
        status="success",
        user_id=user_id,
        count=len(tasks),
        pending_count=pending_count,
        completed_count=completed_count,
        tasks=tasks,
    )


@app.patch("/api/tasks/{task_id}", response_model=UpdateTaskResponse)
def update_task(task_id: str, request: UpdateTaskRequest):
    update_data = request.model_dump(exclude_none=True)

    if update_data.get("status") == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()

    if "status" in update_data:
        if update_data["status"] not in ["pending", "completed"]:
            raise HTTPException(
                status_code=400,
                detail="status must be either pending or completed",
            )

    if "priority" in update_data:
        if update_data["priority"] not in ["low", "medium", "high"]:
            raise HTTPException(
                status_code=400,
                detail="priority must be low, medium, or high",
            )

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No update fields provided",
        )

    updated_task = update_task_by_id(task_id, update_data)

    return UpdateTaskResponse(
        status="success",
        updated_task=updated_task,
        message="Task updated successfully",
    )


@app.delete("/api/tasks/{task_id}", response_model=DeleteTaskResponse)
def delete_task(task_id: str):
    deleted_task = delete_task_by_id(task_id)

    return DeleteTaskResponse(
        status="success",
        deleted_task=deleted_task,
        message="Task deleted successfully",
    )

@app.get("/api/tasks/reminders/{user_id}", response_model=TaskRemindersResponse)
def get_task_reminders(user_id: str):
    reminders = get_task_reminders_by_user(user_id)

    return TaskRemindersResponse(
        status="success",
        user_id=user_id,
        due_today_count=len(reminders["due_today"]),
        upcoming_count=len(reminders["upcoming"]),
        overdue_count=len(reminders["overdue"]),
        follow_up_count=len(reminders["follow_up"]),
        due_today=reminders["due_today"],
        upcoming=reminders["upcoming"],
        overdue=reminders["overdue"],
        follow_up=reminders["follow_up"],
    )