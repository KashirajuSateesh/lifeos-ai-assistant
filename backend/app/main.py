from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import ChatRequest, ChatResponse
from app.agents.orchestrator import classify_intent

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

    selected_agent = routing_result["selected_agent"]
    intent = routing_result["intent"]

    if selected_agent == "expense_agent":
        response_text = "Expense Agent selected. I will handle expense logging soon."
    elif selected_agent == "task_agent":
        response_text = "Task Agent selected. I will handle reminders and todos soon."
    elif selected_agent == "journal_agent":
        response_text = "Journal Agent selected. I will save and summarize journal entries soon."
    elif selected_agent == "places_agent":
        response_text = "Places Agent selected. I will save favorite and want-to-visit places soon."
    else:
        response_text = "I received your message. I will handle general conversation soon."

    return ChatResponse(
        status="success",
        user_id=request.user_id,
        message_received=request.message,
        intent=intent,
        selected_agent=selected_agent,
        extracted_data=routing_result.get("extracted_data", {}),
        response=response_text,
    )