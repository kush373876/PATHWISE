"""
Knowledge base service: chunking, topic extraction, roadmap generation.
"""
import json
from typing import List, Dict, Any, Optional
from loguru import logger
from app.services.ai_provider import ai


TOPIC_EXTRACTION_SYSTEM = """You are an expert educational content analyzer.
Your job is to analyze extracted document content and identify the main topics, subtopics, and their relationships.
Always respond in valid JSON only. Never add explanations outside the JSON."""

ROADMAP_SYSTEM = """You are an expert educational curriculum designer.
Your job is to create a structured, logical learning roadmap from the provided topics.
Always respond in valid JSON only."""

TEACHING_SYSTEM = """You are a patient, expert AI tutor.
Your role is to teach concepts step-by-step using the actual content from the student's uploaded document.
Always ground your explanations in the provided source material.
Never fabricate information not present in the source."""

QUESTION_SYSTEM = """You are an expert educational assessment designer.
Create high-quality multiple-choice questions strictly based on the provided source content.
Every question must be answerable from the source material.
Always respond in valid JSON only."""


async def extract_topics(document_text: str, doc_id: str) -> Dict[str, Any]:
    """Extract topics and subtopics from the full document text."""
    prompt = f"""Analyze this educational document content and extract ALL topics and subtopics.

DOCUMENT CONTENT:
{document_text[:12000]}

Return a JSON object with this exact structure:
{{
  "main_topics": [
    {{
      "title": "Topic Name",
      "description": "Brief description",
      "learning_objectives": ["objective 1", "objective 2"],
      "prerequisites": ["prerequisite 1"],
      "page_references": [1, 2, 3],
      "estimated_minutes": 15,
      "difficulty": "basic",
      "subtopics": [
        {{
          "title": "Subtopic Name",
          "description": "Brief description",
          "page_references": [2],
          "estimated_minutes": 10,
          "difficulty": "basic"
        }}
      ]
    }}
  ],
  "total_topics": 5,
  "document_summary": "Brief summary of what this document covers"
}}

Use the TEACHER'S EXACT TERMINOLOGY. Extract ALL topics from the document, not just the first few.
Identify every distinct concept, definition, procedure, and topic covered."""

    try:
        result = await ai().generate_json(prompt, TOPIC_EXTRACTION_SYSTEM)
        return result
    except Exception as e:
        logger.error(f"Topic extraction failed: {e}")
        return {"main_topics": [], "error": str(e)}


async def generate_roadmap(topics: List[Dict], document_title: str) -> Dict[str, Any]:
    """Generate a structured learning roadmap from extracted topics."""
    topics_json = json.dumps(topics, indent=2)
    prompt = f"""Create a structured learning roadmap for: "{document_title}"

EXTRACTED TOPICS:
{topics_json[:8000]}

Return JSON:
{{
  "title": "Learning Roadmap: {document_title}",
  "description": "What this roadmap covers",
  "total_estimated_minutes": 120,
  "learning_path": [
    {{
      "step_number": 1,
      "topic_title": "Topic Name",
      "description": "What student will learn",
      "why_this_order": "Reason for this position",
      "dependencies": [],
      "milestone": "What student can do after this step"
    }}
  ]
}}

Order topics logically: fundamentals first, then intermediate, then advanced.
Show how topics build on each other."""

    try:
        return await ai().generate_json(prompt, ROADMAP_SYSTEM)
    except Exception as e:
        logger.error(f"Roadmap generation failed: {e}")
        return {"title": "Learning Roadmap", "learning_path": [], "error": str(e)}


async def generate_teaching_content(
    topic_title: str,
    source_content: str,
    page_refs: List[int],
    step: int = 1,
) -> Dict[str, Any]:
    """Generate step-by-step teaching content for a topic."""
    prompt = f"""Teach this topic using ONLY the provided source material.

TOPIC: {topic_title}
SOURCE PAGES: {page_refs}
SOURCE CONTENT:
{source_content[:6000]}

Teaching Step {step} of 7. Return JSON:
{{
  "step": {step},
  "total_steps": 7,
  "step_title": "Step title",
  "what_is_it": "What is this concept? (from source)",
  "source_says": "Exact or near-exact quote from source material",
  "simple_explanation": "Plain language explanation",
  "why_important": "Why does this matter?",
  "how_it_works": "Mechanism or process",
  "practical_example": "Real-world example",
  "key_points": ["point 1", "point 2", "point 3"],
  "knowledge_check": "One short question to check understanding",
  "source_pages": {page_refs},
  "has_next": true,
  "has_prev": {step > 1}
}}

CRITICAL: Only use information from the provided source content. If source is insufficient, say so."""

    try:
        data = await ai().generate_json(prompt, TEACHING_SYSTEM)
        if isinstance(data, dict) and "step_title" in data:
            return data
        raise ValueError("Invalid format from AI")
    except Exception as e:
        logger.warning(f"Teaching content AI call failed ({e}) — generating grounded fallback")
        snippet = source_content[:400].strip() if source_content else topic_title
        return {
            "step": step,
            "total_steps": 3,
            "step_title": f"Understanding {topic_title}",
            "what_is_it": f"{topic_title} is a core subject area extracted from your study material.",
            "source_says": snippet,
            "simple_explanation": f"This section reviews the principles of {topic_title} and how they are applied in practice.",
            "why_important": "Mastering this concept provides the foundation for downstream topics and exam success.",
            "how_it_works": "Review the source equations, slide diagrams, and procedural definitions in this module.",
            "practical_example": f"Applying the concepts of {topic_title} in typical problem-solving scenarios.",
            "key_points": [
                f"Core definition of {topic_title}",
                "Theoretical foundation and properties",
                "Practical applications and usage"
            ],
            "knowledge_check": f"What is the primary objective of studying {topic_title}?",
            "source_pages": page_refs or [1],
            "has_next": step < 3,
            "has_prev": step > 1,
        }


async def generate_questions(
    topic_title: str,
    source_content: str,
    difficulty: str,
    count: int = 5,
    page_refs: Optional[List[int]] = None,
) -> List[Dict[str, Any]]:
    """Generate MCQs from source material."""
    prompt = f"""Generate exactly {count} {difficulty.upper()} level multiple-choice questions about "{topic_title}".

SOURCE MATERIAL (use ONLY this):
{source_content[:6000]}

Source Pages: {page_refs or []}

Difficulty Guidelines:
- basic: Definitions, direct recall, fundamental concepts
- intermediate: Application, comparison, reasoning from content
- advanced: Multi-concept, critical thinking, complex scenarios

Return JSON array ONLY:
[
  {{
    "question_text": "Clear, specific question?",
    "option_a": "First option",
    "option_b": "Second option",
    "option_c": "Third option",
    "option_d": "Fourth option",
    "correct_answer": "A",
    "explanation": "Why this answer is correct, with source reference",
    "source_passage": "Exact passage from source that supports this answer",
    "page_number": 1,
    "verification_note": "This is directly supported by the source"
  }}
]

RULES:
- All 4 options must be plausible
- Only ONE option is correct
- All answers must be verifiable in the source
- Questions must test understanding, not just memory
- Do NOT reveal the answer in the question"""

    try:
        result = await ai().generate_json(prompt, QUESTION_SYSTEM)
        if isinstance(result, list):
            return result
        # If AI returned object with key
        for key in ["questions", "items", "data"]:
            if key in result and isinstance(result[key], list):
                return result[key]
        return []
    except Exception as e:
        logger.error(f"Question generation failed: {e}")
        return []


async def generate_hint(
    question_text: str,
    correct_answer: str,
    source_passage: str,
    hint_level: int,
) -> str:
    """Generate a progressive hint (levels 1, 2, 3)."""
    level_instructions = {
        1: "Give a general conceptual hint. Do NOT reveal the answer or specific details.",
        2: "Give a more specific hint referencing the source material. Still do not reveal the answer.",
        3: "Reveal the correct answer and explain it fully using the source passage.",
    }
    instruction = level_instructions.get(hint_level, level_instructions[1])

    prompt = f"""Question: {question_text}
Correct Answer: {correct_answer}
Source Material: {source_passage}

Hint Level {hint_level}/3: {instruction}

Provide the hint as plain text. Be educational and encouraging."""

    try:
        return await ai().generate(prompt, TEACHING_SYSTEM)
    except Exception as e:
        return f"Hint unavailable: {e}"


async def chat_with_tutor(
    message: str,
    topic_title: str,
    source_content: str,
    conversation_history: List[Dict],
) -> str:
    """Handle free-form student questions in the tutor chat."""
    history_text = ""
    for msg in conversation_history[-6:]:  # last 3 exchanges
        role = "Student" if msg["role"] == "user" else "Tutor"
        history_text += f"{role}: {msg['content']}\n"

    prompt = f"""You are teaching: {topic_title}

SOURCE MATERIAL FROM STUDENT'S DOCUMENT:
{source_content[:4000]}

CONVERSATION SO FAR:
{history_text}

Student's question: {message}

Respond as a patient tutor. Prioritize information from the source material.
If the question cannot be answered from the source, say:
"This information is not clearly available in your uploaded material."
Then optionally add: "Additional explanation beyond your uploaded material:" followed by general knowledge."""

    try:
        return await ai().generate(prompt, TEACHING_SYSTEM)
    except Exception as e:
        logger.warning(f"AI chat failed ({e}) — providing grounded excerpt fallback")
        excerpt = source_content[:500].strip() if source_content else f"Key principles of {topic_title}."
        return f"Here is the relevant passage from your source material regarding '{topic_title}':\n\n\"{excerpt}\"\n\nLet me know which specific formula, diagram, or section you would like to explore further!"
