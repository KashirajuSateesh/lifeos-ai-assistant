from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.agents.expense_agent import handle_expense_message
from app.agents.journal_agent import handle_journal_message
from app.agents.orchestrator import classify_intent
from app.agents.places_agent import handle_places_message
from app.agents.task_agent import handle_task_message

from app.schemas import (
    ChatRequest,
    ChatResponse,
    DeleteExpenseResponse,
    DeleteJournalResponse,
    DeletePlaceResponse,
    DeleteTaskResponse,
    ExpensesResponse,
    MonthlyJournalsResponse,
    NearbyPlacesResponse,
    PlaceSuggestionsResponse,
    PlacesResponse,
    PlacesWithDistancesResponse,
    RecentJournalsResponse,
    TaskRemindersResponse,
    TasksResponse,
    UpdateExpenseRequest,
    UpdateExpenseResponse,
    UpdatePlaceRequest,
    UpdatePlaceResponse,
    UpdateTaskRequest,
    UpdateTaskResponse,
    ProfileRequest,
    ProfileResponse,
    UpdateProfileResponse,
    DeleteAccountResponse,
)

from app.services.auth import get_authenticated_user_id, delete_supabase_auth_user

from app.services.database import (
    delete_expense_by_id,
    delete_journal_by_id,
    delete_place_by_id,
    delete_task_by_id,
    get_expenses_by_user,
    get_journals_by_month,
    get_nearby_places_by_user,
    get_place_suggestions_by_user,
    get_places_by_user,
    get_places_with_distances_by_user,
    get_recent_journals_by_user,
    get_task_reminders_by_user,
    get_tasks_by_user,
    update_expense_by_id,
    update_place_by_id,
    update_place_last_suggested,
    update_task_by_id,
    get_profile_by_user,
    upsert_profile,
    update_profile_by_user,
    delete_all_user_app_data,
)

app = FastAPI(
    title="LifeOS AI Assistant API",
    description="Personal AI assistant backend using multi-agent system",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------
# Health / Root
# -------------------------

@app.get("/")
def root():
    return {
        "status": "success",
        "message": "LifeOS AI Assistant backend is running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
    }


@app.get("/api/auth/test")
def auth_test(user_id: str = Depends(get_authenticated_user_id)):
    return {
        "status": "success",
        "message": "Token verified successfully",
        "user_id": user_id,
    }


# -------------------------
# Helper: Expense date filters
# -------------------------

def get_period_date_range(period: Optional[str]):
    now = datetime.now(timezone.utc)

    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        return start_date.isoformat(), end_date.isoformat()

    if period == "this_week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        return start_date.isoformat(), end_date.isoformat()

    if period == "this_month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        return start_date.isoformat(), end_date.isoformat()

    if period == "this_year":
        start_date = now.replace(
            month=1,
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        return start_date.isoformat(), end_date.isoformat()

    return None, None


# -------------------------
# Chat / Orchestrator
# -------------------------

@app.post("/api/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    routing_result = classify_intent(request.message)

    selected_agent = routing_result["selected_agent"]
    extracted_data = routing_result.get("extracted_data", {})

    if selected_agent == "expense_agent":
        agent_result = handle_expense_message(
            request.message,
            extracted_data,
            user_id=authenticated_user_id,
        )

    elif selected_agent == "task_agent":
        agent_result = handle_task_message(
            request.message,
            extracted_data,
            user_id=authenticated_user_id,
        )

    elif selected_agent == "journal_agent":
        agent_result = handle_journal_message(
            request.message,
            extracted_data,
            user_id=authenticated_user_id,
        )

    elif selected_agent == "places_agent":
        agent_result = handle_places_message(
            request.message,
            extracted_data,
            user_id=authenticated_user_id,
        )

    else:
        agent_result = {
            "response": "I understood your message, but I could not route it to a specific agent yet.",
            "extracted_data": extracted_data,
        }

    return ChatResponse(
        status="success",
        user_id=authenticated_user_id,
        message_received=request.message,
        intent=routing_result["intent"],
        selected_agent=selected_agent,
        extracted_data=agent_result.get("extracted_data"),
        response=agent_result["response"],
        confidence=routing_result.get("confidence"),
        routing_source=routing_result.get("routing_source"),
        routing_reason=routing_result.get("routing_reason"),
    )


# -------------------------
# Expenses - Authenticated
# -------------------------

@app.get("/api/expenses/me", response_model=ExpensesResponse)
def get_my_expenses(
    period: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    period_start_date, period_end_date = get_period_date_range(period)

    final_start_date = start_date or period_start_date
    final_end_date = end_date or period_end_date

    expenses = get_expenses_by_user(
        user_id=authenticated_user_id,
        start_date=final_start_date,
        end_date=final_end_date,
        category=category,
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

    return ExpensesResponse(
        status="success",
        user_id=authenticated_user_id,
        count=len(expenses),
        total_debit=total_debit,
        total_credit=total_credit,
        net_balance=total_credit - total_debit,
        period=period,
        start_date=final_start_date,
        end_date=final_end_date,
        expenses=expenses,
    )


@app.patch("/api/expenses/{expense_id}", response_model=UpdateExpenseResponse)
def update_expense(
    expense_id: str,
    request: UpdateExpenseRequest,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
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


@app.delete("/api/expenses/{expense_id}", response_model=DeleteExpenseResponse)
def delete_expense(
    expense_id: str,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    deleted_expense = delete_expense_by_id(expense_id)

    return DeleteExpenseResponse(
        status="success",
        deleted_expense=deleted_expense,
        message="Expense deleted successfully",
    )


# -------------------------
# Tasks - Authenticated
# -------------------------

@app.get("/api/tasks/me", response_model=TasksResponse)
def get_my_tasks(
    priority: Optional[str] = None,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    tasks = get_tasks_by_user(
        user_id=authenticated_user_id,
        priority=priority,
    )

    pending_count = sum(1 for task in tasks if task["status"] == "pending")
    completed_count = sum(1 for task in tasks if task["status"] == "completed")

    return TasksResponse(
        status="success",
        user_id=authenticated_user_id,
        count=len(tasks),
        pending_count=pending_count,
        completed_count=completed_count,
        tasks=tasks,
    )


@app.get("/api/tasks/reminders/me", response_model=TaskRemindersResponse)
def get_my_task_reminders(
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    reminders = get_task_reminders_by_user(authenticated_user_id)

    return TaskRemindersResponse(
        status="success",
        user_id=authenticated_user_id,
        due_today_count=len(reminders["due_today"]),
        upcoming_count=len(reminders["upcoming"]),
        overdue_count=len(reminders["overdue"]),
        follow_up_count=len(reminders["follow_up"]),
        due_today=reminders["due_today"],
        upcoming=reminders["upcoming"],
        overdue=reminders["overdue"],
        follow_up=reminders["follow_up"],
    )


@app.patch("/api/tasks/{task_id}", response_model=UpdateTaskResponse)
def update_task(
    task_id: str,
    request: UpdateTaskRequest,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    update_data = request.model_dump(exclude_none=True)

    if "status" in update_data:
        if update_data["status"] not in ["pending", "completed"]:
            raise HTTPException(
                status_code=400,
                detail="status must be either pending or completed",
            )

        if update_data["status"] == "completed":
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()

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
def delete_task(
    task_id: str,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    deleted_task = delete_task_by_id(task_id)

    return DeleteTaskResponse(
        status="success",
        deleted_task=deleted_task,
        message="Task deleted successfully",
    )


# -------------------------
# Journals - Authenticated
# -------------------------

@app.get("/api/journals/recent/me", response_model=RecentJournalsResponse)
def get_my_recent_journals(
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    journals = get_recent_journals_by_user(
        user_id=authenticated_user_id,
        limit=5,
    )

    return RecentJournalsResponse(
        status="success",
        user_id=authenticated_user_id,
        count=len(journals),
        journals=journals,
    )


@app.get("/api/journals/me", response_model=MonthlyJournalsResponse)
def get_my_monthly_journals(
    year: int,
    month: int,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    journals = get_journals_by_month(
        user_id=authenticated_user_id,
        year=year,
        month=month,
    )

    return MonthlyJournalsResponse(
        status="success",
        user_id=authenticated_user_id,
        year=year,
        month=month,
        count=len(journals),
        journals=journals,
    )


@app.delete("/api/journals/{journal_id}", response_model=DeleteJournalResponse)
def delete_journal(
    journal_id: str,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    deleted_journal = delete_journal_by_id(journal_id)

    return DeleteJournalResponse(
        status="success",
        deleted_journal=deleted_journal,
        message="Journal entry deleted successfully",
    )


# -------------------------
# Places - Authenticated
# -------------------------

@app.get("/api/places/me", response_model=PlacesResponse)
def get_my_places(
    status: Optional[str] = None,
    category: Optional[str] = None,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    places = get_places_by_user(
        user_id=authenticated_user_id,
        status=status,
        category=category,
    )

    return PlacesResponse(
        status="success",
        user_id=authenticated_user_id,
        count=len(places),
        places=places,
    )


@app.get("/api/places/nearby/me", response_model=NearbyPlacesResponse)
def get_my_nearby_places(
    latitude: float,
    longitude: float,
    radius_km: float = 10,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    nearby_places = get_nearby_places_by_user(
        user_id=authenticated_user_id,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
    )

    return NearbyPlacesResponse(
        status="success",
        user_id=authenticated_user_id,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        count=len(nearby_places),
        places=nearby_places,
    )


@app.get("/api/places/distances/me", response_model=PlacesWithDistancesResponse)
def get_my_places_with_distances(
    latitude: float,
    longitude: float,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    places = get_places_with_distances_by_user(
        user_id=authenticated_user_id,
        latitude=latitude,
        longitude=longitude,
    )

    return PlacesWithDistancesResponse(
        status="success",
        user_id=authenticated_user_id,
        latitude=latitude,
        longitude=longitude,
        count=len(places),
        places=places,
    )


@app.get("/api/places/suggestions/me", response_model=PlaceSuggestionsResponse)
def get_my_place_suggestions(
    older_than_days: int = 7,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    suggestions = get_place_suggestions_by_user(
        user_id=authenticated_user_id,
        older_than_days=older_than_days,
    )

    for place in suggestions:
        update_place_last_suggested(place["id"])

    return PlaceSuggestionsResponse(
        status="success",
        user_id=authenticated_user_id,
        count=len(suggestions),
        places=suggestions,
    )


@app.patch("/api/places/{place_id}", response_model=UpdatePlaceResponse)
def update_place(
    place_id: str,
    request: UpdatePlaceRequest,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    update_data = request.model_dump(exclude_none=True)

    if "status" in update_data:
        if update_data["status"] not in ["want_to_visit", "favorite"]:
            raise HTTPException(
                status_code=400,
                detail="status must be either want_to_visit or favorite",
            )

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No update fields provided",
        )

    updated_place = update_place_by_id(place_id, update_data)

    return UpdatePlaceResponse(
        status="success",
        updated_place=updated_place,
        message="Place updated successfully",
    )


@app.delete("/api/places/{place_id}", response_model=DeletePlaceResponse)
def delete_place(
    place_id: str,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    deleted_place = delete_place_by_id(place_id)

    return DeletePlaceResponse(
        status="success",
        deleted_place=deleted_place,
        message="Place deleted successfully",
    )

# -------------------------
# Profile - Authenticated
# -------------------------

@app.get("/api/profile/me", response_model=ProfileResponse)
def get_my_profile(
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    profile = get_profile_by_user(authenticated_user_id)

    if not profile:
        return ProfileResponse(
            status="success",
            profile=None,
            message="Profile not found",
        )

    return ProfileResponse(
        status="success",
        profile=profile,
        message="Profile fetched successfully",
    )


@app.post("/api/profile/me", response_model=UpdateProfileResponse)
def create_or_update_my_profile(
    request: ProfileRequest,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    profile_data = request.model_dump(exclude_none=True)
    profile_data["user_id"] = authenticated_user_id

    profile = upsert_profile(profile_data)

    return UpdateProfileResponse(
        status="success",
        profile=profile,
        message="Profile saved successfully",
    )


@app.patch("/api/profile/me", response_model=UpdateProfileResponse)
def update_my_profile(
    request: ProfileRequest,
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    update_data = request.model_dump(exclude_none=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No profile fields provided",
        )

    existing_profile = get_profile_by_user(authenticated_user_id)

    if not existing_profile:
        update_data["user_id"] = authenticated_user_id
        profile = upsert_profile(update_data)
    else:
        profile = update_profile_by_user(
            user_id=authenticated_user_id,
            update_data=update_data,
        )

    return UpdateProfileResponse(
        status="success",
        profile=profile,
        message="Profile updated successfully",
    )


# -------------------------
# Account Deletion - Authenticated
# -------------------------

@app.delete("/api/account/me", response_model=DeleteAccountResponse)
def delete_my_account(
    authenticated_user_id: str = Depends(get_authenticated_user_id),
):
    deleted_data = delete_all_user_app_data(authenticated_user_id)

    delete_supabase_auth_user(authenticated_user_id)

    return DeleteAccountResponse(
        status="success",
        user_id=authenticated_user_id,
        deleted_data=deleted_data,
        message="Account and all related app data deleted successfully",
    )