"""
Roadmap API routes.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Roadmap, LearningStep, Topic, Document
from app.models.schemas import RoadmapResponse, LearningStepResponse, TopicResponse
from app.api.routes.topics import topic_to_response

router = APIRouter(prefix="/api/roadmap", tags=["roadmap"])


@router.post("/generate")
async def generate_roadmap_endpoint(
    payload: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Trigger roadmap generation for a document."""
    document_id = payload.get("document_id")
    if not document_id:
        raise HTTPException(400, "document_id required")

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    return {"message": "Roadmap is generated during document processing", "document_id": document_id}


@router.get("/{document_id}", response_model=RoadmapResponse)
def get_roadmap(document_id: str, db: Session = Depends(get_db)):
    roadmap = db.query(Roadmap).filter(Roadmap.document_id == document_id).first()
    if not roadmap:
        raise HTTPException(404, "Roadmap not found. Document may still be processing.")

    steps = db.query(LearningStep).filter(
        LearningStep.roadmap_id == roadmap.id
    ).order_by(LearningStep.step_number).all()

    step_responses = []
    for s in steps:
        topic = db.query(Topic).filter(Topic.id == s.topic_id).first()
        step_responses.append(LearningStepResponse(
            id=s.id,
            step_number=s.step_number,
            title=s.title,
            content=s.content,
            step_type=s.step_type,
            topic_id=s.topic_id,
            topic=topic_to_response(topic, include_subtopics=False) if topic else None,
        ))

    return RoadmapResponse(
        id=roadmap.id,
        document_id=roadmap.document_id,
        title=roadmap.title,
        description=roadmap.description,
        total_topics=roadmap.total_topics,
        estimated_total_minutes=roadmap.estimated_total_minutes,
        steps=step_responses,
    )
