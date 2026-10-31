"""
Pydantic schemas for request/response validation.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class ProcessingStatus(str, Enum):
    pending = "pending"
    uploading = "uploading"
    reading = "reading"
    extracting_text = "extracting_text"
    extracting_visuals = "extracting_visuals"
    identifying_topics = "identifying_topics"
    building_knowledge_base = "building_knowledge_base"
    generating_roadmap = "generating_roadmap"
    completed = "completed"
    failed = "failed"


class DifficultyLevel(str, Enum):
    basic = "basic"
    intermediate = "intermediate"
    advanced = "advanced"


# ---- User ----
class UserCreate(BaseModel):
    email: str
    name: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Documents ----
class DocumentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    status: str
    total_pages: Optional[int]
    processed_pages: Optional[int]
    ocr_pages: Optional[int]
    diagram_pages: Optional[int]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExtractionReportResponse(BaseModel):
    document_id: str
    total_pages: int
    processed_pages: int
    ocr_pages: int
    diagram_pages: int
    errors: List[str]
    status: str


# ---- Pages / Elements ----
class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class ElementResponse(BaseModel):
    id: str
    page_number: int
    element_type: str
    content: Optional[str]
    bbox: Optional[BoundingBox]
    font_size: Optional[float]
    is_bold: Optional[bool]
    is_title: Optional[bool]
    extraction_method: Optional[str]
    topic_id: Optional[str]

    class Config:
        from_attributes = True


class PageResponse(BaseModel):
    id: str
    document_id: str
    page_number: int
    title: Optional[str]
    raw_text: Optional[str]
    page_width: Optional[float]
    page_height: Optional[float]
    has_images: bool
    has_tables: bool
    ocr_used: bool
    thumbnail_url: Optional[str]
    elements: Optional[List[ElementResponse]] = None

    class Config:
        from_attributes = True


# ---- Topics ----
class TopicResponse(BaseModel):
    id: str
    document_id: str
    parent_id: Optional[str]
    title: str
    description: Optional[str]
    learning_objectives: Optional[List[str]]
    prerequisites: Optional[List[str]]
    page_references: Optional[List[int]]
    estimated_minutes: Optional[int]
    difficulty: str
    order_index: int
    subtopics: Optional[List["TopicResponse"]] = None

    class Config:
        from_attributes = True


TopicResponse.model_rebuild()


# ---- Roadmap ----
class LearningStepResponse(BaseModel):
    id: str
    step_number: int
    title: str
    content: Optional[str]
    step_type: str
    topic_id: str
    topic: Optional[TopicResponse] = None

    class Config:
        from_attributes = True


class RoadmapResponse(BaseModel):
    id: str
    document_id: str
    title: str
    description: Optional[str]
    total_topics: int
    estimated_total_minutes: int
    steps: List[LearningStepResponse]

    class Config:
        from_attributes = True


# ---- Tutor ----
class ExplainRequest(BaseModel):
    document_id: str
    topic_id: str
    step: int = 1


class ExplainResponse(BaseModel):
    step: int
    total_steps: int
    step_title: str
    what_is_it: Optional[str]
    source_says: Optional[str]
    simple_explanation: Optional[str]
    why_important: Optional[str]
    how_it_works: Optional[str]
    practical_example: Optional[str]
    key_points: Optional[List[str]]
    knowledge_check: Optional[str]
    source_pages: Optional[List[int]]
    has_next: bool
    has_prev: bool
    error: Optional[str] = None


class ChatRequest(BaseModel):
    document_id: str
    topic_id: str
    message: str
    history: List[Dict[str, str]] = []


class ChatResponse(BaseModel):
    response: str
    source_pages: Optional[List[int]] = None


class SelectedContentRequest(BaseModel):
    document_id: str
    element_id: str
    topic_id: Optional[str] = None


# ---- Questions ----
class GenerateQuestionsRequest(BaseModel):
    document_id: str
    topic_id: str
    difficulty: DifficultyLevel
    count: int = Field(default=5, ge=1, le=20)


class QuestionResponse(BaseModel):
    id: str
    question_text: str
    difficulty: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    page_number: Optional[int]
    # correct_answer NOT included — only shown after submission

    class Config:
        from_attributes = True


class SubmitAnswerRequest(BaseModel):
    question_id: str
    selected_answer: str  # A, B, C, D
    user_id: str
    attempt_number: int = 1


class SubmitAnswerResponse(BaseModel):
    is_correct: bool
    correct_answer: Optional[str] = None  # revealed only if wrong on attempt >= 3
    explanation: Optional[str] = None
    source_passage: Optional[str] = None
    hint: Optional[str] = None
    attempt_number: int


class HintRequest(BaseModel):
    question_id: str
    user_id: str
    attempt_number: int


class HintResponse(BaseModel):
    hint: str
    hint_level: int
    reveals_answer: bool


# ---- Assessment ----
class AssessmentResultResponse(BaseModel):
    id: str
    document_id: str
    topic_id: Optional[str]
    difficulty: str
    total_questions: int
    correct_answers: int
    score_percentage: float
    passed: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Progress ----
class TopicProgressResponse(BaseModel):
    id: str
    topic_id: str
    document_id: str
    is_completed: bool
    level1_score: Optional[float]
    level2_score: Optional[float]
    level3_score: Optional[float]
    level1_unlocked: bool
    level2_unlocked: bool
    level3_unlocked: bool
    attempts_count: int
    last_studied_at: Optional[datetime]

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    total_documents: int
    active_roadmaps: int
    completed_topics: int
    total_topics: int
    assessment_scores: Dict[str, float]
    weak_topics: List[str]
    recent_activity: List[Dict[str, Any]]
    learning_streak_days: int
