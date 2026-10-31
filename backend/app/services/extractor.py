"""
Document extraction service.
Handles PDF (PyMuPDF), PPT/PPTX (python-pptx), and OCR fallback.
"""
import os
import json
import uuid
import traceback
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    logger.warning("PyMuPDF not available")

try:
    from pptx import Presentation
    from pptx.util import Emu
    HAS_PPTX = True
except ImportError:
    HAS_PPTX = False
    logger.warning("python-pptx not available")

try:
    from PIL import Image
    import pytesseract
    HAS_OCR = True
except ImportError:
    HAS_OCR = False
    logger.warning("Pillow/pytesseract not available — OCR disabled")


class ExtractionResult:
    def __init__(self):
        self.pages: List[Dict[str, Any]] = []
        self.elements: List[Dict[str, Any]] = []
        self.total_pages: int = 0
        self.processed_pages: int = 0
        self.ocr_pages: int = 0
        self.diagram_pages: int = 0
        self.errors: List[str] = []

    def to_dict(self):
        return {
            "total_pages": self.total_pages,
            "processed_pages": self.processed_pages,
            "ocr_pages": self.ocr_pages,
            "diagram_pages": self.diagram_pages,
            "errors": self.errors,
        }


def extract_document(file_path: str, file_type: str, upload_dir: str) -> ExtractionResult:
    """Main entry point: dispatches to the appropriate extractor."""
    file_type = file_type.lower()
    if file_type == "pdf":
        return extract_pdf(file_path, upload_dir)
    elif file_type in ("ppt", "pptx"):
        return extract_pptx(file_path, upload_dir)
    else:
        result = ExtractionResult()
        result.errors.append(f"Unsupported file type: {file_type}")
        return result


# ---------------------------------------------------------------------------
# PDF Extraction
# ---------------------------------------------------------------------------

def extract_pdf(file_path: str, upload_dir: str) -> ExtractionResult:
    result = ExtractionResult()
    if not HAS_PYMUPDF:
        result.errors.append("PyMuPDF not installed")
        return result

    try:
        doc = fitz.open(file_path)
        result.total_pages = len(doc)
        images_dir = os.path.join(upload_dir, "images", Path(file_path).stem)
        os.makedirs(images_dir, exist_ok=True)

        for page_index in range(len(doc)):
            page_num = page_index + 1
            page = doc[page_index]
            page_data: Dict[str, Any] = {
                "page_number": page_num,
                "title": None,
                "raw_text": "",
                "page_width": page.rect.width,
                "page_height": page.rect.height,
                "has_images": False,
                "has_tables": False,
                "ocr_used": False,
                "extraction_method": "pymupdf",
                "thumbnail_path": None,
            }
            page_elements: List[Dict[str, Any]] = []

            try:
                # Render thumbnail
                mat = fitz.Matrix(1.5, 1.5)
                pix = page.get_pixmap(matrix=mat)
                thumb_path = os.path.join(images_dir, f"page_{page_num}.png")
                pix.save(thumb_path)
                page_data["thumbnail_path"] = thumb_path

                # Extract text blocks with coordinates
                blocks = page.get_text("dict")["blocks"]
                all_text_parts = []

                for block in blocks:
                    if block.get("type") == 0:  # text block
                        for line in block.get("lines", []):
                            line_text_parts = []
                            font_size = None
                            font_name = None
                            is_bold = False

                            for span in line.get("spans", []):
                                span_text = span.get("text", "").strip()
                                if span_text:
                                    line_text_parts.append(span_text)
                                    if font_size is None:
                                        font_size = span.get("size")
                                        font_name = span.get("font", "")
                                        is_bold = "Bold" in font_name or "bold" in font_name

                            line_text = " ".join(line_text_parts)
                            if not line_text:
                                continue

                            all_text_parts.append(line_text)
                            bbox = block.get("bbox", [0, 0, 0, 0])
                            pw = page.rect.width or 1
                            ph = page.rect.height or 1

                            elem_id = str(uuid.uuid4())
                            is_title = (
                                page_elements == [] and
                                font_size and font_size > 16
                            )
                            if is_title and page_data["title"] is None:
                                page_data["title"] = line_text

                            page_elements.append({
                                "id": elem_id,
                                "page_number": page_num,
                                "element_type": "paragraph",
                                "content": line_text,
                                "bbox_x": bbox[0] / pw,
                                "bbox_y": bbox[1] / ph,
                                "bbox_width": (bbox[2] - bbox[0]) / pw,
                                "bbox_height": (bbox[3] - bbox[1]) / ph,
                                "font_size": font_size,
                                "font_name": font_name,
                                "is_bold": is_bold,
                                "is_title": is_title,
                                "extraction_method": "pymupdf",
                            })

                    elif block.get("type") == 1:  # image block
                        page_data["has_images"] = True
                        result.diagram_pages = max(result.diagram_pages, 0) + (1 if page_index not in [p["page_number"] - 1 for p in result.pages if p.get("has_images")] else 0)
                        bbox = block.get("bbox", [0, 0, 0, 0])
                        pw = page.rect.width or 1
                        ph = page.rect.height or 1
                        page_elements.append({
                            "id": str(uuid.uuid4()),
                            "page_number": page_num,
                            "element_type": "image",
                            "content": "[Image]",
                            "bbox_x": bbox[0] / pw,
                            "bbox_y": bbox[1] / ph,
                            "bbox_width": (bbox[2] - bbox[0]) / pw,
                            "bbox_height": (bbox[3] - bbox[1]) / ph,
                            "extraction_method": "pymupdf",
                        })

                page_data["raw_text"] = "\n".join(all_text_parts)

                # Fall back to OCR if no text extracted
                if not page_data["raw_text"].strip() and HAS_OCR:
                    try:
                        mat = fitz.Matrix(2.0, 2.0)
                        pix = page.get_pixmap(matrix=mat)
                        img_path = os.path.join(images_dir, f"ocr_page_{page_num}.png")
                        pix.save(img_path)
                        img = Image.open(img_path)
                        ocr_text = pytesseract.image_to_string(img)
                        page_data["raw_text"] = ocr_text
                        page_data["ocr_used"] = True
                        page_data["extraction_method"] = "ocr"
                        result.ocr_pages += 1

                        if ocr_text.strip():
                            page_elements.append({
                                "id": str(uuid.uuid4()),
                                "page_number": page_num,
                                "element_type": "paragraph",
                                "content": ocr_text.strip(),
                                "bbox_x": 0.05, "bbox_y": 0.05,
                                "bbox_width": 0.9, "bbox_height": 0.9,
                                "extraction_method": "ocr",
                            })
                    except Exception as ocr_err:
                        result.errors.append(f"OCR failed on page {page_num}: {ocr_err}")

                result.pages.append(page_data)
                result.elements.extend(page_elements)
                result.processed_pages += 1

            except Exception as page_err:
                result.errors.append(f"Page {page_num} error: {page_err}")
                logger.error(f"PDF page {page_num} error: {traceback.format_exc()}")

        doc.close()

    except Exception as e:
        result.errors.append(f"PDF extraction failed: {e}")
        logger.error(f"PDF extraction error: {traceback.format_exc()}")

    return result


# ---------------------------------------------------------------------------
# PPTX Extraction
# ---------------------------------------------------------------------------

def extract_pptx(file_path: str, upload_dir: str) -> ExtractionResult:
    result = ExtractionResult()
    if not HAS_PPTX:
        result.errors.append("python-pptx not installed")
        return result

    try:
        prs = Presentation(file_path)
        result.total_pages = len(prs.slides)
        images_dir = os.path.join(upload_dir, "images", Path(file_path).stem)
        os.makedirs(images_dir, exist_ok=True)

        slide_width = prs.slide_width.pt if prs.slide_width else 720
        slide_height = prs.slide_height.pt if prs.slide_height else 540

        for slide_index, slide in enumerate(prs.slides):
            slide_num = slide_index + 1
            page_data: Dict[str, Any] = {
                "page_number": slide_num,
                "title": None,
                "raw_text": "",
                "page_width": slide_width,
                "page_height": slide_height,
                "has_images": False,
                "has_tables": False,
                "ocr_used": False,
                "extraction_method": "python-pptx",
                "thumbnail_path": None,
            }
            page_elements: List[Dict[str, Any]] = []
            all_text_parts: List[str] = []

            try:
                for shape in slide.shapes:
                    # Get bounding box in normalized coordinates
                    try:
                        left = shape.left.pt if shape.left else 0
                        top = shape.top.pt if shape.top else 0
                        width = shape.width.pt if shape.width else 0
                        height = shape.height.pt if shape.height else 0
                        bbox_x = left / slide_width
                        bbox_y = top / slide_height
                        bbox_w = width / slide_width
                        bbox_h = height / slide_height
                    except Exception:
                        bbox_x = bbox_y = bbox_w = bbox_h = 0

                    # Title detection
                    is_title_shape = (
                        hasattr(shape, "placeholder_format") and
                        shape.placeholder_format is not None and
                        shape.placeholder_format.idx == 0
                    )

                    # Text shapes
                    if shape.has_text_frame:
                        shape_text_parts = []
                        for para in shape.text_frame.paragraphs:
                            para_text = para.text.strip()
                            if para_text:
                                shape_text_parts.append(para_text)

                                # Get font info from first run
                                font_size = None
                                font_name = None
                                is_bold = False
                                if para.runs:
                                    run = para.runs[0]
                                    try:
                                        font_size = run.font.size.pt if run.font.size else None
                                    except Exception:
                                        pass
                                    try:
                                        font_name = run.font.name
                                        is_bold = run.font.bold or False
                                    except Exception:
                                        pass

                                page_elements.append({
                                    "id": str(uuid.uuid4()),
                                    "page_number": slide_num,
                                    "element_type": "text_box" if not is_title_shape else "title",
                                    "content": para_text,
                                    "bbox_x": bbox_x,
                                    "bbox_y": bbox_y,
                                    "bbox_width": bbox_w,
                                    "bbox_height": bbox_h,
                                    "font_size": font_size,
                                    "font_name": font_name,
                                    "is_bold": is_bold,
                                    "is_title": is_title_shape,
                                    "extraction_method": "python-pptx",
                                })

                        shape_full_text = "\n".join(shape_text_parts)
                        if shape_full_text:
                            all_text_parts.append(shape_full_text)
                            if is_title_shape and page_data["title"] is None:
                                page_data["title"] = shape.text_frame.paragraphs[0].text.strip()

                    # Tables
                    elif shape.has_table:
                        page_data["has_tables"] = True
                        table_parts = []
                        for row in shape.table.rows:
                            row_texts = [cell.text.strip() for cell in row.cells]
                            row_line = " | ".join(row_texts)
                            table_parts.append(row_line)
                        table_text = "\n".join(table_parts)
                        if table_text.strip():
                            all_text_parts.append(table_text)
                            page_elements.append({
                                "id": str(uuid.uuid4()),
                                "page_number": slide_num,
                                "element_type": "table",
                                "content": table_text,
                                "bbox_x": bbox_x,
                                "bbox_y": bbox_y,
                                "bbox_width": bbox_w,
                                "bbox_height": bbox_h,
                                "extraction_method": "python-pptx",
                            })

                    # Images / shapes with no text
                    elif hasattr(shape, "image"):
                        page_data["has_images"] = True
                        try:
                            img_data = shape.image.blob
                            img_filename = f"slide_{slide_num}_img_{shape.shape_id}.png"
                            img_path = os.path.join(images_dir, img_filename)
                            with open(img_path, "wb") as f:
                                f.write(img_data)
                            page_elements.append({
                                "id": str(uuid.uuid4()),
                                "page_number": slide_num,
                                "element_type": "image",
                                "content": "[Image]",
                                "image_path": img_path,
                                "bbox_x": bbox_x,
                                "bbox_y": bbox_y,
                                "bbox_width": bbox_w,
                                "bbox_height": bbox_h,
                                "extraction_method": "python-pptx",
                            })
                        except Exception as img_err:
                            result.errors.append(f"Image extract error slide {slide_num}: {img_err}")

                page_data["raw_text"] = "\n".join(all_text_parts)
                result.pages.append(page_data)
                result.elements.extend(page_elements)
                result.processed_pages += 1

            except Exception as slide_err:
                result.errors.append(f"Slide {slide_num} error: {slide_err}")
                logger.error(f"PPTX slide {slide_num} error: {traceback.format_exc()}")

    except Exception as e:
        result.errors.append(f"PPTX extraction failed: {e}")
        logger.error(f"PPTX extraction error: {traceback.format_exc()}")

    return result
