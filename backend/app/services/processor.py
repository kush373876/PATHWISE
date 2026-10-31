"""
Document processing orchestrator.
Runs as a background task: extract → chunk → topics → roadmap.
"""
import asyncio
import os
from datetime import datetime
from typing import Optional
from loguru import logger
from sqlalchemy.orm import Session

from app.db.models import (
    Document, DocumentPage, ExtractedElement, ContentChunk,
    Topic, Roadmap, LearningStep, AnswerKey, ProcessingStatus, DifficultyLevel
)
from app.services.extractor import extract_document
from app.services.knowledge_base import extract_topics, generate_roadmap


async def process_document(document_id: str, db: Session):
    """Full processing pipeline for an uploaded document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        logger.error(f"Document {document_id} not found")
        return

    def update_status(status: ProcessingStatus, error: Optional[str] = None):
        doc.status = status
        if error:
            doc.error_message = error
        doc.updated_at = datetime.utcnow()
        db.commit()

    try:
        update_status(ProcessingStatus.reading)
        await asyncio.sleep(0.1)  # yield for async

        # --- PHASE 1: EXTRACT ---
        update_status(ProcessingStatus.extracting_text)
        upload_dir = os.path.dirname(doc.file_path)
        result = extract_document(doc.file_path, doc.file_type, upload_dir)

        if result.errors and not result.pages:
            update_status(ProcessingStatus.failed, "; ".join(result.errors[:3]))
            return

        doc.total_pages = result.total_pages
        doc.processed_pages = result.processed_pages
        doc.ocr_pages = result.ocr_pages
        doc.diagram_pages = result.diagram_pages
        doc.extraction_report = result.to_dict()
        db.commit()

        # Save pages
        page_map = {}  # page_number -> DocumentPage
        for page_data in result.pages:
            dp = DocumentPage(
                document_id=document_id,
                page_number=page_data["page_number"],
                title=page_data.get("title"),
                raw_text=page_data.get("raw_text", ""),
                page_width=page_data.get("page_width"),
                page_height=page_data.get("page_height"),
                has_images=page_data.get("has_images", False),
                has_tables=page_data.get("has_tables", False),
                ocr_used=page_data.get("ocr_used", False),
                extraction_method=page_data.get("extraction_method"),
                thumbnail_path=page_data.get("thumbnail_path"),
            )
            db.add(dp)
            db.flush()
            page_map[page_data["page_number"]] = dp

        update_status(ProcessingStatus.extracting_visuals)

        # Save elements
        for elem in result.elements:
            page_num = elem.get("page_number", 1)
            page_obj = page_map.get(page_num)
            if not page_obj:
                continue
            ee = ExtractedElement(
                document_id=document_id,
                page_id=page_obj.id,
                page_number=page_num,
                element_type=elem.get("element_type", "paragraph"),
                content=elem.get("content", ""),
                bbox_x=elem.get("bbox_x"),
                bbox_y=elem.get("bbox_y"),
                bbox_width=elem.get("bbox_width"),
                bbox_height=elem.get("bbox_height"),
                font_size=elem.get("font_size"),
                font_name=elem.get("font_name"),
                is_bold=elem.get("is_bold", False),
                is_title=elem.get("is_title", False),
                image_path=elem.get("image_path"),
                extraction_method=elem.get("extraction_method"),
            )
            db.add(ee)

        db.commit()

        # --- PHASE 2: CHUNK ---
        update_status(ProcessingStatus.identifying_topics)
        full_text = _build_full_text(result.pages)
        _create_chunks(db, document_id, result.pages)
        db.commit()

        # --- PHASE 3: TOPICS ---
        update_status(ProcessingStatus.building_knowledge_base)
        topic_data = await extract_topics(full_text, document_id)
        main_topics = topic_data.get("main_topics", [])

        # Graceful fallback if AI returned no topics
        if not main_topics and result.pages:
            for p in result.pages:
                title = p.get("title") or f"Module: Page {p['page_number']}"
                snippet = (p.get("raw_text") or "").strip()[:200]
                main_topics.append({
                    "title": title,
                    "description": snippet if snippet else f"Content and concepts covered on page {p['page_number']}.",
                    "learning_objectives": [f"Master key concepts presented on page {p['page_number']}"],
                    "prerequisites": [],
                    "page_references": [p["page_number"]],
                    "estimated_minutes": 15,
                    "difficulty": "basic",
                })

        saved_topics = []
        for idx, t in enumerate(main_topics):
            topic = Topic(
                document_id=document_id,
                title=t.get("title", f"Topic {idx+1}"),
                description=t.get("description", ""),
                learning_objectives=t.get("learning_objectives", []),
                prerequisites=t.get("prerequisites", []),
                page_references=t.get("page_references", []),
                estimated_minutes=t.get("estimated_minutes", 15),
                difficulty=_map_difficulty(t.get("difficulty", "basic")),
                order_index=idx,
            )
            db.add(topic)
            db.flush()
            saved_topics.append(topic)

            # Save subtopics
            for sub in t.get("subtopics", []):
                subtopic = Topic(
                    document_id=document_id,
                    parent_id=topic.id,
                    title=sub.get("title", ""),
                    description=sub.get("description", ""),
                    page_references=sub.get("page_references", []),
                    estimated_minutes=sub.get("estimated_minutes", 10),
                    difficulty=_map_difficulty(sub.get("difficulty", "basic")),
                    order_index=idx,
                )
                db.add(subtopic)

        db.commit()

        # --- PHASE 4: ROADMAP ---
        update_status(ProcessingStatus.generating_roadmap)
        topics_for_roadmap = [
            {"title": t.title, "description": t.description, "difficulty": t.difficulty.value}
            for t in saved_topics
        ]
        roadmap_data = await generate_roadmap(topics_for_roadmap, doc.original_filename)

        learning_path = roadmap_data.get("learning_path", [])
        if not learning_path and saved_topics:
            learning_path = [
                {
                    "step_number": idx + 1,
                    "topic_title": t.title,
                    "description": t.description or f"Comprehensive guide to {t.title}",
                }
                for idx, t in enumerate(saved_topics)
            ]

        roadmap = Roadmap(
            document_id=document_id,
            title=roadmap_data.get("title", f"Learning Roadmap: {doc.original_filename}"),
            description=roadmap_data.get("description", "A sequenced learning pathway for this course."),
            total_topics=len(saved_topics),
            estimated_total_minutes=roadmap_data.get("total_estimated_minutes") or (len(saved_topics) * 15),
        )
        db.add(roadmap)
        db.flush()

        for step_data in learning_path:
            step_num = step_data.get("step_number", 1)
            topic_title = step_data.get("topic_title", "")
            # Find matching topic safely
            matched_topic = next(
                (t for t in saved_topics if t.title.lower() == topic_title.lower()),
                saved_topics[min(step_num - 1, len(saved_topics) - 1)] if saved_topics else None
            )
            if not matched_topic:
                continue

            step = LearningStep(
                roadmap_id=roadmap.id,
                topic_id=matched_topic.id,
                step_number=step_num,
                title=step_data.get("topic_title", matched_topic.title),
                content=step_data.get("description", ""),
                step_type="lesson",
            )
            db.add(step)
            db.add(step)

        db.commit()
        update_status(ProcessingStatus.completed)
        logger.info(f"Document {document_id} processed successfully")

    except Exception as e:
        logger.error(f"Document processing failed: {e}")
        update_status(ProcessingStatus.failed, str(e)[:500])


def _build_full_text(pages) -> str:
    parts = []
    for p in pages:
        parts.append(f"=== Page/Slide {p['page_number']} ===\n{p.get('raw_text', '')}")
    return "\n\n".join(parts)


def _create_chunks(db: Session, document_id: str, pages, chunk_size: int = 500):
    """Split page text into overlapping chunks for retrieval."""
    chunk_index = 0
    for page in pages:
        text = page.get("raw_text", "").strip()
        if not text:
            continue
        words = text.split()
        step = max(1, chunk_size - 100)  # 100-word overlap
        for i in range(0, len(words), step):
            chunk_words = words[i:i + chunk_size]
            chunk_text = " ".join(chunk_words)
            if len(chunk_text.strip()) < 20:
                continue
            chunk = ContentChunk(
                document_id=document_id,
                page_number=page["page_number"],
                content=chunk_text,
                chunk_index=chunk_index,
                metadata_json={"page": page["page_number"]},
            )
            db.add(chunk)
            chunk_index += 1


def _map_difficulty(d: str) -> DifficultyLevel:
    d = d.lower()
    if d in ("intermediate", "medium"):
        return DifficultyLevel.intermediate
    if d in ("advanced", "hard", "complex"):
        return DifficultyLevel.advanced
    return DifficultyLevel.basic


def get_topic_source_content(db: Session, topic_id: str, document_id: str) -> str:
    """Retrieve all source content relevant to a topic."""
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        return ""

    page_refs = topic.page_references or []
    chunks = db.query(ContentChunk).filter(
        ContentChunk.document_id == document_id,
        ContentChunk.page_number.in_(page_refs) if page_refs else True
    ).all()

    if not chunks:
        # Fallback: get all chunks
        chunks = db.query(ContentChunk).filter(
            ContentChunk.document_id == document_id
        ).limit(20).all()

    parts = []
    for chunk in chunks:
        parts.append(f"[Page {chunk.page_number}] {chunk.content}")
    return "\n\n".join(parts)
