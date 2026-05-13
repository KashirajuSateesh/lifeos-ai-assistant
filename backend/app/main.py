from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import ChatRequest, ChatResponse

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
    return ChatResponse(
        status="success",
        user_id=request.user_id,
        message_received=request.message,
        response="LifeOS received your message. Agent routing will be added next.",
    )