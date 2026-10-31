"""
AI Tutor API routes.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Topic, ExtractedElement, Document
from app.models.schemas import (
    ExplainRequest, ExplainResponse, ChatRequest, ChatResponse,
    SelectedContentRequest,
)
from app.services.knowledge_base import generate_teaching_content, chat_with_tutor
from app.services.processor import get_topic_source_content

router = APIRouter(prefix="/api/tutor", tags=["tutor"])


@router.post("/explain", response_model=ExplainResponse)
async def explain_topic(request: ExplainRequest, db: Session = Depends(get_db)):
    """Generate step-by-step teaching content for a topic."""
    topic = db.query(Topic).filter(Topic.id == request.topic_id).first()
    if not topic:
        raise HTTPException(404, "Topic not found")

    doc = db.query(Document).filter(Document.id == request.document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    source_content = get_topic_source_content(db, request.topic_id, request.document_id)
    page_refs = topic.page_references or []

    result = await generate_teaching_content(
        topic_title=topic.title,
        source_content=source_content,
        page_refs=page_refs,
        step=request.step,
    )

    if "error" in result:
        return ExplainResponse(
            step=request.step,
            total_steps=7,
            step_title="Content unavailable",
            has_next=False,
            has_prev=request.step > 1,
            error=result["error"],
        )

    return ExplainResponse(
        step=result.get("step", request.step),
        total_steps=result.get("total_steps", 7),
        step_title=result.get("step_title", topic.title),
        what_is_it=result.get("what_is_it"),
        source_says=result.get("source_says"),
        simple_explanation=result.get("simple_explanation"),
        why_important=result.get("why_important"),
        how_it_works=result.get("how_it_works"),
        practical_example=result.get("practical_example"),
        key_points=result.get("key_points"),
        knowledge_check=result.get("knowledge_check"),
        source_pages=result.get("source_pages", page_refs),
        has_next=result.get("has_next", request.step < 7),
        has_prev=result.get("has_prev", request.step > 1),
    )


@router.post("/chat", response_model=ChatResponse)
async def tutor_chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Free-form chat with the AI tutor about a topic."""
    topic = db.query(Topic).filter(Topic.id == request.topic_id).first()
    if not topic:
        raise HTTPException(404, "Topic not found")

    source_content = get_topic_source_content(db, request.topic_id, request.document_id)

    response = await chat_with_tutor(
        message=request.message,
        topic_title=topic.title,
        source_content=source_content,
        conversation_history=request.history,
    )

    return ChatResponse(
        response=response,
        source_pages=topic.page_references,
    )


@router.post("/selected-content", response_model=ChatResponse)
async def explain_selected_content(
    request: SelectedContentRequest,
    db: Session = Depends(get_db),
):
    """Explain a specific extracted element (Teach Me This Part)."""
    element = db.query(ExtractedElement).filter(
        ExtractedElement.id == request.element_id,
        ExtractedElement.document_id == request.document_id,
    ).first()
    if not element:
        raise HTTPException(404, "Element not found")

    topic = None
    if request.topic_id:
        topic = db.query(Topic).filter(Topic.id == request.topic_id).first()

    topic_context = f"Topic: {topic.title}" if topic else "General content"
    prompt = f"""A student has selected this specific passage from their document:

"{element.content}"

(Page/Slide {element.page_number}, {topic_context})

Please explain this selected passage clearly and thoroughly.
What does it mean? Why is it important? How does it connect to the broader topic?
Use simple language while preserving all key terms from the original material."""

    from app.services.ai_provider import ai
    try:
        response = await ai().generate(prompt)
    except Exception as e:
        response = f"Unable to explain: {e}"

    return ChatResponse(
        response=response,
        source_pages=[element.page_number],
    )
