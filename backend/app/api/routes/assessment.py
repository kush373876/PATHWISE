"""
Assessment API routes: question generation, submission, hints.
"""
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    Question, AnswerKey, StudentAttempt, HintHistory,
    Topic, Document, AssessmentResult, DifficultyLevel
)
from app.models.schemas import (
    GenerateQuestionsRequest, QuestionResponse,
    SubmitAnswerRequest, SubmitAnswerResponse,
    HintRequest, HintResponse, AssessmentResultResponse,
)
from app.services.knowledge_base import generate_questions as ai_generate_questions, generate_hint
from app.services.processor import get_topic_source_content

router = APIRouter(tags=["assessment"])
PASSING_THRESHOLD = 0.7  # 70%


@router.post("/api/questions/generate", response_model=List[QuestionResponse])
async def generate_questions_endpoint(
    request: GenerateQuestionsRequest,
    db: Session = Depends(get_db),
):
    """Generate and store MCQs for a topic at a given difficulty."""
    topic = db.query(Topic).filter(Topic.id == request.topic_id).first()
    if not topic:
        raise HTTPException(404, "Topic not found")

    doc = db.query(Document).filter(Document.id == request.document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    source_content = get_topic_source_content(db, request.topic_id, request.document_id)

    raw_questions = await ai_generate_questions(
        topic_title=topic.title,
        source_content=source_content,
        difficulty=request.difficulty.value,
        count=request.count,
        page_refs=topic.page_references,
    )

    if not raw_questions:
        snippet = source_content[:250].strip() if source_content else topic.title
        raw_questions = [
            {
                "question_text": f"What is the core focus of the topic '{topic.title}'?",
                "option_a": f"The foundational principles and applications of {topic.title}.",
                "option_b": "An unrelated topic outside the course syllabus.",
                "option_c": "A legacy concept with no practical application.",
                "option_d": "A placeholder unrelated to the provided document.",
                "correct_answer": "A",
                "explanation": f"The source material specifically highlights the principles and mechanisms of {topic.title}.",
                "source_passage": snippet,
                "page_number": topic.page_references[0] if topic.page_references else 1,
            }
        ]

    saved = []
    for q in raw_questions:
        question = Question(
            document_id=request.document_id,
            topic_id=request.topic_id,
            question_text=q.get("question_text", ""),
            difficulty=_map_diff(request.difficulty.value),
            option_a=q.get("option_a", ""),
            option_b=q.get("option_b", ""),
            option_c=q.get("option_c", ""),
            option_d=q.get("option_d", ""),
            correct_answer=q.get("correct_answer", "A").upper(),
            explanation=q.get("explanation", ""),
            source_passage=q.get("source_passage", ""),
            page_number=q.get("page_number"),
            verification_status="pending",
        )
        db.add(question)
        db.flush()

        # Store answer key separately
        ak = AnswerKey(
            question_id=question.id,
            correct_answer=question.correct_answer,
            supporting_evidence=question.source_passage,
            verified_at=datetime.utcnow(),
        )
        db.add(ak)
        saved.append(question)

    db.commit()

    return [QuestionResponse(
        id=q.id,
        question_text=q.question_text,
        difficulty=q.difficulty.value,
        option_a=q.option_a,
        option_b=q.option_b,
        option_c=q.option_c,
        option_d=q.option_d,
        page_number=q.page_number,
    ) for q in saved]


@router.post("/api/assessment/submit", response_model=SubmitAnswerResponse)
async def submit_answer(request: SubmitAnswerRequest, db: Session = Depends(get_db)):
    """Submit an answer for a question."""
    question = db.query(Question).filter(Question.id == request.question_id).first()
    if not question:
        raise HTTPException(404, "Question not found")

    answer_key = db.query(AnswerKey).filter(AnswerKey.question_id == request.question_id).first()
    if not answer_key:
        raise HTTPException(500, "Answer key not found — question may be flagged for review")

    selected = request.selected_answer.upper()
    correct = answer_key.correct_answer.upper()
    is_correct = selected == correct

    # Record attempt
    attempt = StudentAttempt(
        user_id=request.user_id,
        question_id=request.question_id,
        selected_answer=selected,
        is_correct=is_correct,
        attempt_number=request.attempt_number,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    response = SubmitAnswerResponse(
        is_correct=is_correct,
        attempt_number=request.attempt_number,
    )

    if is_correct:
        response.explanation = question.explanation
        response.source_passage = question.source_passage
        response.correct_answer = correct
    else:
        # Generate progressive hint
        hint_level = min(request.attempt_number, 3)
        hint_text = await generate_hint(
            question_text=question.question_text,
            correct_answer=f"Option {correct}: {getattr(question, f'option_{correct.lower()}')}",
            source_passage=question.source_passage or "",
            hint_level=hint_level,
        )
        response.hint = hint_text

        # Store hint
        hint_record = HintHistory(
            attempt_id=attempt.id,
            hint_level=hint_level,
            hint_text=hint_text,
        )
        db.add(hint_record)
        db.commit()

        # Reveal answer on 3rd attempt
        if request.attempt_number >= 3:
            response.correct_answer = correct
            response.explanation = question.explanation
            response.source_passage = question.source_passage

    return response


@router.post("/api/assessment/hint", response_model=HintResponse)
async def get_hint(request: HintRequest, db: Session = Depends(get_db)):
    """Get a progressive hint for a question."""
    question = db.query(Question).filter(Question.id == request.question_id).first()
    if not question:
        raise HTTPException(404, "Question not found")

    answer_key = db.query(AnswerKey).filter(AnswerKey.question_id == request.question_id).first()
    correct = answer_key.correct_answer if answer_key else "A"
    hint_level = min(request.attempt_number, 3)

    hint_text = await generate_hint(
        question_text=question.question_text,
        correct_answer=f"Option {correct}: {getattr(question, f'option_{correct.lower()}')}",
        source_passage=question.source_passage or "",
        hint_level=hint_level,
    )

    return HintResponse(
        hint=hint_text,
        hint_level=hint_level,
        reveals_answer=hint_level >= 3,
    )


@router.get("/api/assessment/results", response_model=List[AssessmentResultResponse])
def get_results(user_id: str = "demo-user-001", db: Session = Depends(get_db)):
    results = db.query(AssessmentResult).filter(
        AssessmentResult.user_id == user_id
    ).order_by(AssessmentResult.created_at.desc()).limit(50).all()
    return results


def _map_diff(d: str) -> DifficultyLevel:
    if d == "intermediate":
        return DifficultyLevel.intermediate
    if d == "advanced":
        return DifficultyLevel.advanced
    return DifficultyLevel.basic
