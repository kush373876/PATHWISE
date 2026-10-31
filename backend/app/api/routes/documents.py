"""
Documents API routes.
"""
import os
import uuid
import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from loguru import logger

from app.db.database import get_db
from app.db.models import Document, DocumentPage, ExtractedElement, ProcessingStatus
from app.models.schemas import DocumentResponse, PageResponse, ElementResponse, BoundingBox, ExtractionReportResponse
from app.core.config import settings
from app.services.processor import process_document

router = APIRouter(prefix="/api/documents", tags=["documents"])

DEMO_USER_ID = "demo-user-001"


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload and begin processing a document."""
    # Validate extension
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in settings.allowed_extensions_list:
        raise HTTPException(400, f"Unsupported file type '.{ext}'. Allowed: {settings.ALLOWED_EXTENSIONS}")

    # Read file content and check size
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(413, f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE_MB}MB")

    # Save file
    doc_id = str(uuid.uuid4())
    safe_name = f"{doc_id}.{ext}"
    doc_dir = os.path.join(settings.UPLOAD_DIR, doc_id)
    os.makedirs(doc_dir, exist_ok=True)
    file_path = os.path.join(doc_dir, safe_name)

    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    doc = Document(
        id=doc_id,
        user_id=DEMO_USER_ID,
        filename=safe_name,
        original_filename=file.filename,
        file_path=file_path,
        file_type=ext,
        file_size=len(content),
        status=ProcessingStatus.uploading,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Kick off background processing
    background_tasks.add_task(process_document_task, doc_id)

    return doc


async def process_document_task(document_id: str):
    """Background task wrapper that creates its own DB session."""
    from app.db.database import SessionLocal
    db = SessionLocal()
    try:
        await process_document(document_id, db)
    finally:
        db.close()


@router.get("", response_model=List[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    """List all documents for the demo user."""
    docs = db.query(Document).filter(
        Document.user_id == DEMO_USER_ID
    ).order_by(Document.created_at.desc()).all()
    return docs


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.post("/{document_id}/process")
async def reprocess_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Reprocess a document (re-run extraction pipeline)."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    doc.status = ProcessingStatus.pending
    db.commit()
    background_tasks.add_task(process_document_task, document_id)
    return {"message": "Reprocessing started", "document_id": document_id}


@router.get("/{document_id}/extraction-report", response_model=ExtractionReportResponse)
def get_extraction_report(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    report = doc.extraction_report or {}
    return ExtractionReportResponse(
        document_id=document_id,
        total_pages=report.get("total_pages", doc.total_pages or 0),
        processed_pages=report.get("processed_pages", doc.processed_pages or 0),
        ocr_pages=report.get("ocr_pages", doc.ocr_pages or 0),
        diagram_pages=report.get("diagram_pages", doc.diagram_pages or 0),
        errors=report.get("errors", []),
        status=doc.status.value if doc.status else "unknown",
    )


@router.get("/{document_id}/pages/{page_number}", response_model=PageResponse)
def get_page(document_id: str, page_number: int, db: Session = Depends(get_db)):
    page = db.query(DocumentPage).filter(
        DocumentPage.document_id == document_id,
        DocumentPage.page_number == page_number,
    ).first()
    if not page:
        raise HTTPException(404, f"Page {page_number} not found")

    elements = db.query(ExtractedElement).filter(
        ExtractedElement.page_id == page.id
    ).all()

    elem_responses = []
    for e in elements:
        bbox = None
        if e.bbox_x is not None:
            bbox = BoundingBox(
                x=e.bbox_x, y=e.bbox_y,
                width=e.bbox_width, height=e.bbox_height
            )
        elem_responses.append(ElementResponse(
            id=e.id,
            page_number=e.page_number,
            element_type=e.element_type,
            content=e.content,
            bbox=bbox,
            font_size=e.font_size,
            is_bold=e.is_bold,
            is_title=e.is_title,
            extraction_method=e.extraction_method,
            topic_id=e.topic_id,
        ))

    # Thumbnail URL
    thumb_url = None
    if page.thumbnail_path and os.path.exists(page.thumbnail_path):
        thumb_url = f"/api/documents/{document_id}/thumbnail/{page_number}"

    return PageResponse(
        id=page.id,
        document_id=document_id,
        page_number=page.page_number,
        title=page.title,
        raw_text=page.raw_text,
        page_width=page.page_width,
        page_height=page.page_height,
        has_images=page.has_images,
        has_tables=page.has_tables,
        ocr_used=page.ocr_used,
        thumbnail_url=thumb_url,
        elements=elem_responses,
    )


@router.get("/{document_id}/thumbnail/{page_number}")
def get_thumbnail(document_id: str, page_number: int, db: Session = Depends(get_db)):
    """Serve the page thumbnail image."""
    page = db.query(DocumentPage).filter(
        DocumentPage.document_id == document_id,
        DocumentPage.page_number == page_number,
    ).first()
    if not page or not page.thumbnail_path or not os.path.exists(page.thumbnail_path):
        raise HTTPException(404, "Thumbnail not available")
    return FileResponse(page.thumbnail_path, media_type="image/png")


@router.get("/{document_id}/elements/{element_id}", response_model=ElementResponse)
def get_element(document_id: str, element_id: str, db: Session = Depends(get_db)):
    elem = db.query(ExtractedElement).filter(
        ExtractedElement.id == element_id,
        ExtractedElement.document_id == document_id,
    ).first()
    if not elem:
        raise HTTPException(404, "Element not found")
    bbox = None
    if elem.bbox_x is not None:
        bbox = BoundingBox(x=elem.bbox_x, y=elem.bbox_y, width=elem.bbox_width, height=elem.bbox_height)
    return ElementResponse(
        id=elem.id,
        page_number=elem.page_number,
        element_type=elem.element_type,
        content=elem.content,
        bbox=bbox,
        font_size=elem.font_size,
        is_bold=elem.is_bold,
        is_title=elem.is_title,
        extraction_method=elem.extraction_method,
        topic_id=elem.topic_id,
    )
