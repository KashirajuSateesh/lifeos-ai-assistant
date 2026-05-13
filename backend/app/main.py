from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import ChatRequest, ChatResponse
from app.agents.orchestrator import classify_intent
from app.agents.expense_agent import handle_expense_message
from app.agents.task_agent import handle_task_message
from app.agents.journal_agent import handle_journal_message
from app.agents.places_agent import handle_places_message

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
        agent_result = handle_task_message(request.message, extracted_data)

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