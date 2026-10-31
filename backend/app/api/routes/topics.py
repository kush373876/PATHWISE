"""
Topics API routes.
"""
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Topic, Document
from app.models.schemas import TopicResponse

router = APIRouter(tags=["topics"])


def topic_to_response(topic: Topic, include_subtopics: bool = True) -> TopicResponse:
    subs = None
    if include_subtopics and topic.subtopics:
        subs = [topic_to_response(s, include_subtopics=False) for s in topic.subtopics]
    return TopicResponse(
        id=topic.id,
        document_id=topic.document_id,
        parent_id=topic.parent_id,
        title=topic.title,
        description=topic.description,
        learning_objectives=topic.learning_objectives,
        prerequisites=topic.prerequisites,
        page_references=topic.page_references,
        estimated_minutes=topic.estimated_minutes,
        difficulty=topic.difficulty.value if topic.difficulty else "basic",
        order_index=topic.order_index,
        subtopics=subs,
    )


@router.get("/api/documents/{document_id}/topics", response_model=List[TopicResponse])
def get_document_topics(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    topics = db.query(Topic).filter(
        Topic.document_id == document_id,
        Topic.parent_id == None,
    ).order_by(Topic.order_index).all()

    return [topic_to_response(t) for t in topics]


@router.get("/api/topics/{topic_id}", response_model=TopicResponse)
def get_topic(topic_id: str, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(404, "Topic not found")
    return topic_to_response(topic)
