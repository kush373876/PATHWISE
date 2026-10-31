"""
Progress tracking API routes.
"""
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.db.models import (
    TopicProgress, Topic, Document, LearningSession,
    StudentAttempt, Question, AssessmentResult
)
from app.models.schemas import TopicProgressResponse, DashboardResponse

router = APIRouter(prefix="/api/progress", tags=["progress"])
DEMO_USER = "demo-user-001"
PASSING_THRESHOLD = 0.7


@router.get("", response_model=DashboardResponse)
def get_dashboard(user_id: str = DEMO_USER, db: Session = Depends(get_db)):
    """Get dashboard analytics for the user."""
    # Documents
    docs = db.query(Document).filter(Document.user_id == user_id).all()
    total_docs = len(docs)
    doc_ids = [d.id for d in docs]

    # Topics
    all_topics = db.query(Topic).filter(Topic.document_id.in_(doc_ids)).all() if doc_ids else []
    total_topics = len([t for t in all_topics if t.parent_id is None])

    # Progress
    progress_records = db.query(TopicProgress).filter(
        TopicProgress.user_id == user_id
    ).all() if doc_ids else []
    completed = [p for p in progress_records if p.is_completed]

    # Active roadmaps (docs that are processing or completed with topics)
    active_roadmaps = len([d for d in docs if d.status and d.status.value == "completed"])

    # Scores
    results = db.query(AssessmentResult).filter(
        AssessmentResult.user_id == user_id
    ).all()
    scores = {"basic": 0.0, "intermediate": 0.0, "advanced": 0.0}
    counts = {"basic": 0, "intermediate": 0, "advanced": 0}
    for r in results:
        diff = r.difficulty.value if r.difficulty else "basic"
        scores[diff] = scores.get(diff, 0) + r.score_percentage
        counts[diff] = counts.get(diff, 0) + 1
    avg_scores = {
        k: round(scores[k] / counts[k], 1) if counts[k] > 0 else 0.0
        for k in scores
    }

    # Weak topics (score < 70%)
    weak = []
    for p in progress_records:
        scores_list = [s for s in [p.level1_score, p.level2_score, p.level3_score] if s is not None]
        if scores_list and min(scores_list) < PASSING_THRESHOLD * 100:
            topic = db.query(Topic).filter(Topic.id == p.topic_id).first()
            if topic:
                weak.append(topic.title)

    # Recent activity
    recent_sessions = db.query(LearningSession).filter(
        LearningSession.user_id == user_id
    ).order_by(LearningSession.started_at.desc()).limit(5).all()
    recent_activity = []
    for s in recent_sessions:
        doc = db.query(Document).filter(Document.id == s.document_id).first()
        topic = db.query(Topic).filter(Topic.id == s.topic_id).first() if s.topic_id else None
        recent_activity.append({
            "type": "study_session",
            "document": doc.original_filename if doc else "Unknown",
            "topic": topic.title if topic else "General",
            "timestamp": s.started_at.isoformat() if s.started_at else None,
        })

    # Streak calculation
    streak = _calculate_streak(user_id, db)

    return DashboardResponse(
        total_documents=total_docs,
        active_roadmaps=active_roadmaps,
        completed_topics=len(completed),
        total_topics=total_topics,
        assessment_scores=avg_scores,
        weak_topics=weak[:5],
        recent_activity=recent_activity,
        learning_streak_days=streak,
    )


@router.get("/{document_id}", response_model=List[TopicProgressResponse])
def get_document_progress(document_id: str, user_id: str = DEMO_USER, db: Session = Depends(get_db)):
    records = db.query(TopicProgress).filter(
        TopicProgress.user_id == user_id,
        TopicProgress.document_id == document_id,
    ).all()
    return records


@router.post("/update")
def update_progress(payload: dict, db: Session = Depends(get_db)):
    """Update topic progress after assessment."""
    user_id = payload.get("user_id", DEMO_USER)
    topic_id = payload.get("topic_id")
    document_id = payload.get("document_id")
    difficulty = payload.get("difficulty", "basic")
    score = payload.get("score", 0.0)

    if not topic_id or not document_id:
        raise HTTPException(400, "topic_id and document_id required")

    progress = db.query(TopicProgress).filter(
        TopicProgress.user_id == user_id,
        TopicProgress.topic_id == topic_id,
    ).first()

    if not progress:
        progress = TopicProgress(
            user_id=user_id,
            topic_id=topic_id,
            document_id=document_id,
        )
        db.add(progress)

    passed = score >= PASSING_THRESHOLD * 100

    if difficulty == "basic":
        progress.level1_score = score
        if passed:
            progress.level2_unlocked = True
    elif difficulty == "intermediate":
        progress.level2_score = score
        if passed:
            progress.level3_unlocked = True
    elif difficulty == "advanced":
        progress.level3_score = score
        if passed:
            progress.is_completed = True

    progress.attempts_count = (progress.attempts_count or 0) + 1
    progress.last_studied_at = datetime.utcnow()
    progress.updated_at = datetime.utcnow()

    # Store assessment result
    result = AssessmentResult(
        user_id=user_id,
        document_id=document_id,
        topic_id=topic_id,
        difficulty=_map_diff(difficulty),
        total_questions=payload.get("total_questions", 5),
        correct_answers=payload.get("correct_answers", 0),
        score_percentage=score,
        passed=passed,
        time_spent_seconds=payload.get("time_spent_seconds"),
    )
    db.add(result)
    db.commit()

    return {"message": "Progress updated", "passed": passed, "unlocked_next": passed}


def _calculate_streak(user_id: str, db: Session) -> int:
    """Calculate consecutive days of learning activity."""
    sessions = db.query(LearningSession).filter(
        LearningSession.user_id == user_id
    ).order_by(LearningSession.started_at.desc()).all()

    if not sessions:
        return 0

    streak = 0
    current_date = datetime.utcnow().date()
    seen_dates = set()

    for session in sessions:
        if not session.started_at:
            continue
        date = session.started_at.date()
        seen_dates.add(date)

    for i in range(365):
        check_date = current_date - timedelta(days=i)
        if check_date in seen_dates:
            streak += 1
        else:
            break

    return streak


def _map_diff(d: str):
    from app.db.models import DifficultyLevel
    if d == "intermediate":
        return DifficultyLevel.intermediate
    if d == "advanced":
        return DifficultyLevel.advanced
    return DifficultyLevel.basic
