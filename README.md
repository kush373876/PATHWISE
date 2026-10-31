# Pathwise &mdash; AI-Powered Personalized Learning Platform

Pathwise transforms static course materials (textbooks, lecture slides, research papers) into active, personalized learning journeys. It parses documents, segments complex topics, sequences prerequisite-grounded learning roadmaps, provides interactive step-by-step tutoring, and tests comprehension with adaptive assessments and progressive hints.

---

## 🌟 Key Features

1. **Intelligent Document Extraction Pipeline**
   - **Multi-Format Ingestion**: Upload PDF documents, PowerPoint presentations (`.ppt`, `.pptx`), or syllabi.
   - **Semantic Segmentation**: Extracts raw text, titles, section headings, tables, mathematical formulas, and visual diagrams.
   - **Diagnostic Extraction Reports**: Track total pages, OCR fallbacks, detected visual elements, and status diagnostics.

2. **AI-Synthesized Learning Roadmaps**
   - Automatically clusters document concepts into progressive modules.
   - Explicit prerequisite mapping, difficulty levels (*Basic*, *Intermediate*, *Advanced*), and estimated study durations.
   - Check off completed milestones to track syllabus coverage.

3. **Multi-Modal AI Tutor (Grounded in Source Content)**
   - **Step-by-Step Guided Lessons**: Structured conceptual breakdowns featuring:
     - *What is it?* (Core concept overview)
     - *Source Grounding* (Direct quotes with page citations)
     - *Plain-English Intuition* (Everyday mental models)
     - *Why it matters & How it works* (Practical rationale)
     - *Real-World Analogy*
     - *Core Takeaways Checklist*
     - *Knowledge Reflection Check*
   - **Interactive Q&A Chat**: Ask conversational follow-ups with instant document citations.
   - **Visual Element Inquisitor**: Click any extracted diagram or formula in the Document Reader and ask the tutor to explain its mechanics.

4. **Adaptive Assessment Engine**
   - Topic-tailored quizzes with customizable difficulty (*Basic*, *Intermediate*, *Advanced*).
   - **Progressive Multi-Tier Hints**:
     - *Level 1*: Gentle contextual nudge.
     - *Level 2*: Targeted clue.
     - *Level 3*: Full guided breakdown (available on repeat attempts).
   - Instant feedback with rationale and direct source passage quotations.

5. **Student Progress & Analytics Dashboard**
   - Topic mastery percentage and active roadmaps.
   - Quiz score history and trend analysis.
   - **Weak Topic Diagnostics**: Identifies lower-scoring areas and suggests targeted review sessions.
   - Daily learning streak tracking.

---

## 🏗️ Project Architecture

```
Pathwise/
├── backend/
│   ├── app/
│   │   ├── api/routes/        # REST endpoints (documents, topics, roadmap, tutor, assessment, progress)
│   │   ├── core/config.py     # Application settings & environment configuration
│   │   ├── db/                # SQLAlchemy database models & SQLite session setup
│   │   ├── models/schemas.py  # Pydantic request & response validation schemas
│   │   ├── services/          # Document extractors (PyMuPDF, python-pptx), knowledge base, AI provider
│   │   └── main.py            # FastAPI application entry point with CORS & demo user seeding
│   ├── tests/                 # Backend API test suite
│   ├── uploads/               # Processed documents & generated page thumbnails
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Environment template
│
└── frontend/
    ├── app/                   # Next.js 14 App Router
    │   ├── layout.tsx         # App shell & persistent navigation
    │   ├── page.tsx           # Student Learning Dashboard
    │   ├── documents/         # Document Library & Drag-and-Drop Uploader
    │   │   └── [id]/page.tsx  # Document Study Hub (Roadmap, Reader, AI Tutor, Quiz)
    │   ├── analytics/page.tsx # Mastery Analytics & Quiz Performance
    │   └── settings/page.tsx  # System Health, Diagnostics & AI Provider Status
    ├── components/            # Reusable UI modules (Navbar, FileUpload, RoadmapView, AITutor, etc.)
    ├── lib/api.ts             # Complete typed REST API client
    └── package.json           # Frontend dependencies (Next.js, React 18, Tailwind CSS, Lucide)
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ and **npm**
- **Python** 3.9+

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Configure AI Provider in .env
cp .env.example .env
# Set GEMINI_API_KEY=your_key or OPENAI_API_KEY=your_key

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
The backend API documentation will be available at:
- Swagger UI: `http://localhost:8000/api/docs`
- Redoc: `http://localhost:8000/api/redoc`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies (already prepared)
npm install

# Start Next.js development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🧪 Testing

To run the backend integration test suite:

```bash
cd backend
pytest tests/
```

To run a production frontend build:

```bash
cd frontend
npm run build
```
# PATHWISE
