"""
SQLAlchemy ORM models for the Pathwise platform.
Designed for SQLite (MVP) with PostgreSQL migration in mind.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship, backref
from app.db.database import Base
import enum


def gen_uuid():
    return str(uuid.uuid4())


class ProcessingStatus(str, enum.Enum):
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


class DifficultyLevel(str, enum.Enum):
    basic = "basic"
    intermediate = "intermediate"
    advanced = "advanced"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)  # optional for demo
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    documents = relationship("Document", back_populates="user")
    progress = relationship("TopicProgress", back_populates="user")
    sessions = relationship("LearningSession", back_populates="user")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, ppt, pptx
    file_size = Column(Integer, nullable=False)
    status = Column(SAEnum(ProcessingStatus), default=ProcessingStatus.pending)
    error_message = Column(Text, nullable=True)
    total_pages = Column(Integer, nullable=True)
    processed_pages = Column(Integer, nullable=True)
    ocr_pages = Column(Integer, default=0)
    diagram_pages = Column(Integer, default=0)
    extraction_report = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="documents")
    pages = relationship("DocumentPage", back_populates="document", cascade="all, delete-orphan")
    elements = relationship("ExtractedElement", back_populates="document", cascade="all, delete-orphan")
    chunks = relationship("ContentChunk", back_populates="document", cascade="all, delete-orphan")
    topics = relationship("Topic", back_populates="document", cascade="all, delete-orphan")
    roadmaps = relationship("Roadmap", back_populates="document", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="document", cascade="all, delete-orphan")


class DocumentPage(Base):
    __tablename__ = "document_pages"

    id = Column(String, primary_key=True, default=gen_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    page_number = Column(Integer, nullable=False)
    title = Column(String, nullable=True)
    raw_text = Column(Text, nullable=True)
    page_width = Column(Float, nullable=True)
    page_height = Column(Float, nullable=True)
    has_images = Column(Boolean, default=False)
    has_tables = Column(Boolean, default=False)
    ocr_used = Column(Boolean, default=False)
    extraction_method = Column(String, nullable=True)
    thumbnail_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="pages")
    elements = relationship("ExtractedElement", back_populates="page", cascade="all, delete-orphan")


class ExtractedElement(Base):
    __tablename__ = "extracted_elements"

    id = Column(String, primary_key=True, default=gen_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    page_id = Column(String, ForeignKey("document_pages.id"), nullable=False, index=True)
    page_number = Column(Integer, nullable=False)
    element_type = Column(String, nullable=False)  # text_box, paragraph, image, table, shape
    content = Column(Text, nullable=True)
    bbox_x = Column(Float, nullable=True)
    bbox_y = Column(Float, nullable=True)
    bbox_width = Column(Float, nullable=True)
    bbox_height = Column(Float, nullable=True)
    font_size = Column(Float, nullable=True)
    font_name = Column(String, nullable=True)
    is_bold = Column(Boolean, default=False)
    is_title = Column(Boolean, default=False)
    image_path = Column(String, nullable=True)
    ocr_confidence = Column(Float, nullable=True)
    extraction_method = Column(String, nullable=True)
    topic_id = Column(String, ForeignKey("topics.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="elements")
    page = relationship("DocumentPage", back_populates="elements")
    topic = relationship("Topic", back_populates="elements")


class ContentChunk(Base):
    __tablename__ = "content_chunks"

    id = Column(String, primary_key=True, default=gen_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    page_number = Column(Integer, nullable=False)
    topic_id = Column(String, ForeignKey("topics.id"), nullable=True)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(Text, nullable=True)  # JSON serialized vector
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="chunks")
    topic = relationship("Topic", back_populates="chunks")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(String, primary_key=True, default=gen_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    parent_id = Column(String, ForeignKey("topics.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    learning_objectives = Column(JSON, nullable=True)
    prerequisites = Column(JSON, nullable=True)
    related_topics = Column(JSON, nullable=True)
    page_references = Column(JSON, nullable=True)  # list of page numbers
    estimated_minutes = Column(Integer, nullable=True)
    difficulty = Column(SAEnum(DifficultyLevel), default=DifficultyLevel.basic)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="topics")
    subtopics = relationship(
        "Topic",
        backref=backref("parent", remote_side="Topic.id"),
        foreign_keys=[parent_id],
    )
    elements = relationship("ExtractedElement", back_populates="topic")
    chunks = relationship("ContentChunk", back_populates="topic")
    roadmap_steps = relationship("LearningStep", back_populates="topic")
    questions = relationship("Question", back_populates="topic")
    progress = relationship("TopicProgress", back_populates="topic")


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(String, primary_key=True, default=gen_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    total_topics = Column(Integer, default=0)
    estimated_total_minutes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="roadmaps")
    steps = relationship("LearningStep", back_populates="roadmap", cascade="all, delete-orphan")


class LearningStep(Base):
    __tablename__ = "learning_steps"

    id = Column(String, primary_key=True, default=gen_uuid)
    roadmap_id = Column(String, ForeignKey("roadmaps.id"), nullable=False, index=True)
    topic_id = Column(String, ForeignKey("topics.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    step_type = Column(String, default="lesson")  # lesson, quiz, review
    created_at = Column(DateTime, default=datetime.utcnow)

    roadmap = relationship("Roadmap", back_populates="steps")
    topic = relationship("Topic", back_populates="roadmap_steps")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=gen_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    topic_id = Column(String, ForeignKey("topics.id"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    difficulty = Column(SAEnum(DifficultyLevel), nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    correct_answer = Column(String(1), nullable=False)  # A, B, C, or D
    explanation = Column(Text, nullable=False)
    source_passage = Column(Text, nullable=True)
    page_number = Column(Integer, nullable=True)
    element_id = Column(String, nullable=True)
    verification_status = Column(String, default="pending")  # pending, verified, flagged
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="questions")
    topic = relationship("Topic", back_populates="questions")
    attempts = relationship("StudentAttempt", back_populates="question")
    answer_key = relationship("AnswerKey", back_populates="question", uselist=False)


class AnswerKey(Base):
    __tablename__ = "answer_keys"

    id = Column(String, primary_key=True, default=gen_uuid)
    question_id = Column(String, ForeignKey("questions.id"), unique=True, nullable=False)
    correct_answer = Column(String(1), nullable=False)
    supporting_evidence = Column(Text, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    question = relationship("Question", back_populates="answer_key")


class StudentAttempt(Base):
    __tablename__ = "student_attempts"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False, index=True)
    selected_answer = Column(String(1), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    attempt_number = Column(Integer, default=1)
    hints_used = Column(Integer, default=0)
    time_spent_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    question = relationship("Question", back_populates="attempts")
    hints = relationship("HintHistory", back_populates="attempt")


class HintHistory(Base):
    __tablename__ = "hint_history"

    id = Column(String, primary_key=True, default=gen_uuid)
    attempt_id = Column(String, ForeignKey("student_attempts.id"), nullable=False)
    hint_level = Column(Integer, nullable=False)  # 1, 2, 3
    hint_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    attempt = relationship("StudentAttempt", back_populates="hints")


class LearningSession(Base):
    __tablename__ = "learning_sessions"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    topic_id = Column(String, ForeignKey("topics.id"), nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    current_step = Column(Integer, default=0)

    user = relationship("User", back_populates="sessions")


class TopicProgress(Base):
    __tablename__ = "topic_progress"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    topic_id = Column(String, ForeignKey("topics.id"), nullable=False, index=True)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    level1_score = Column(Float, nullable=True)
    level2_score = Column(Float, nullable=True)
    level3_score = Column(Float, nullable=True)
    level1_unlocked = Column(Boolean, default=True)
    level2_unlocked = Column(Boolean, default=False)
    level3_unlocked = Column(Boolean, default=False)
    attempts_count = Column(Integer, default=0)
    last_studied_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="progress")
    topic = relationship("Topic", back_populates="progress")


class AssessmentResult(Base):
    __tablename__ = "assessment_results"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    topic_id = Column(String, ForeignKey("topics.id"), nullable=True)
    difficulty = Column(SAEnum(DifficultyLevel), nullable=False)
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    score_percentage = Column(Float, nullable=False)
    passed = Column(Boolean, nullable=False)
    time_spent_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
