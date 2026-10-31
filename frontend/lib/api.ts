const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ---- Documents ----
export async function uploadDocument(file: File, onProgress?: (p: number) => void) {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise<DocumentRecord>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/documents/upload`);
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || `Upload failed ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed ${xhr.status}`));
        }
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.send(formData);
  });
}

export const getDocuments = () => apiFetch<DocumentRecord[]>('/api/documents');
export const getDocument = (id: string) => apiFetch<DocumentRecord>(`/api/documents/${id}`);
export const getExtractionReport = (id: string) => apiFetch<ExtractionReport>(`/api/documents/${id}/extraction-report`);
export const reprocessDocument = (id: string) => apiFetch<void>(`/api/documents/${id}/process`, { method: 'POST' });
export const getPage = (docId: string, pageNum: number) => apiFetch<PageData>(`/api/documents/${docId}/pages/${pageNum}`);
export const thumbnailUrl = (docId: string, pageNum: number) => `${API_BASE}/api/documents/${docId}/thumbnail/${pageNum}`;

// ---- Topics ----
export const getTopics = (docId: string) => apiFetch<Topic[]>(`/api/documents/${docId}/topics`);
export const getTopic = (id: string) => apiFetch<Topic>(`/api/topics/${id}`);

// ---- Roadmap ----
export const getRoadmap = (docId: string) => apiFetch<Roadmap>(`/api/roadmap/${docId}`);

// ---- Tutor ----
export const explainTopic = (body: { document_id: string; topic_id: string; step: number }) =>
  apiFetch<ExplainResponse>('/api/tutor/explain', { method: 'POST', body: JSON.stringify(body) });

export const tutorChat = (body: { document_id: string; topic_id: string; message: string; history: ChatMessage[] }) =>
  apiFetch<ChatResponse>('/api/tutor/chat', { method: 'POST', body: JSON.stringify(body) });

export const explainSelectedContent = (body: { document_id: string; element_id: string; topic_id?: string }) =>
  apiFetch<ChatResponse>('/api/tutor/selected-content', { method: 'POST', body: JSON.stringify(body) });

// ---- Assessment ----
export const generateQuestions = (body: { document_id: string; topic_id: string; difficulty: string; count: number }) =>
  apiFetch<Question[]>('/api/questions/generate', { method: 'POST', body: JSON.stringify(body) });

export const submitAnswer = (body: { question_id: string; selected_answer: string; user_id: string; attempt_number: number }) =>
  apiFetch<SubmitResponse>('/api/assessment/submit', { method: 'POST', body: JSON.stringify(body) });

export const getHint = (body: { question_id: string; user_id: string; attempt_number: number }) =>
  apiFetch<HintResponse>('/api/assessment/hint', { method: 'POST', body: JSON.stringify(body) });

export const getResults = (userId?: string) =>
  apiFetch<AssessmentResult[]>(`/api/assessment/results${userId ? `?user_id=${userId}` : ''}`);

// ---- Progress ----
export const getDashboard = () => apiFetch<Dashboard>('/api/progress');
export const getDocumentProgress = (docId: string) => apiFetch<TopicProgress[]>(`/api/progress/${docId}`);
export const updateProgress = (body: object) => apiFetch<void>('/api/progress/update', { method: 'POST', body: JSON.stringify(body) });

// ---- Settings ----
export const getSettings = () => apiFetch<AppSettings>('/api/settings');

// ---- Types ----
export interface DocumentRecord {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  status: string;
  total_pages?: number;
  processed_pages?: number;
  ocr_pages?: number;
  diagram_pages?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractionReport {
  document_id: string;
  total_pages: number;
  processed_pages: number;
  ocr_pages: number;
  diagram_pages: number;
  errors: string[];
  status: string;
}

export interface BoundingBox { x: number; y: number; width: number; height: number; }

export interface ExtractedElement {
  id: string;
  page_number: number;
  element_type: string;
  content?: string;
  bbox?: BoundingBox;
  font_size?: number;
  is_bold?: boolean;
  is_title?: boolean;
  extraction_method?: string;
  topic_id?: string;
}

export interface PageData {
  id: string;
  document_id: string;
  page_number: number;
  title?: string;
  raw_text?: string;
  page_width?: number;
  page_height?: number;
  has_images: boolean;
  has_tables: boolean;
  ocr_used: boolean;
  thumbnail_url?: string;
  elements?: ExtractedElement[];
}

export interface Topic {
  id: string;
  document_id: string;
  parent_id?: string;
  title: string;
  description?: string;
  learning_objectives?: string[];
  prerequisites?: string[];
  page_references?: number[];
  estimated_minutes?: number;
  difficulty: string;
  order_index: number;
  subtopics?: Topic[];
}

export interface LearningStep {
  id: string;
  step_number: number;
  title: string;
  content?: string;
  step_type: string;
  topic_id: string;
  topic?: Topic;
}

export interface Roadmap {
  id: string;
  document_id: string;
  title: string;
  description?: string;
  total_topics: number;
  estimated_total_minutes: number;
  steps: LearningStep[];
}

export interface ExplainResponse {
  step: number;
  total_steps: number;
  step_title: string;
  what_is_it?: string;
  source_says?: string;
  simple_explanation?: string;
  why_important?: string;
  how_it_works?: string;
  practical_example?: string;
  key_points?: string[];
  knowledge_check?: string;
  source_pages?: number[];
  has_next: boolean;
  has_prev: boolean;
  error?: string;
}

export interface ChatMessage { role: string; content: string; }
export interface ChatResponse { response: string; source_pages?: number[]; }

export interface Question {
  id: string;
  question_text: string;
  difficulty: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  page_number?: number;
}

export interface SubmitResponse {
  is_correct: boolean;
  correct_answer?: string;
  explanation?: string;
  source_passage?: string;
  hint?: string;
  attempt_number: number;
}

export interface HintResponse {
  hint: string;
  hint_level: number;
  reveals_answer: boolean;
}

export interface AssessmentResult {
  id: string;
  document_id: string;
  topic_id?: string;
  difficulty: string;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  passed: boolean;
  created_at: string;
}

export interface TopicProgress {
  id: string;
  topic_id: string;
  document_id: string;
  is_completed: boolean;
  level1_score?: number;
  level2_score?: number;
  level3_score?: number;
  level1_unlocked: boolean;
  level2_unlocked: boolean;
  level3_unlocked: boolean;
  attempts_count: number;
  last_studied_at?: string;
}

export interface Dashboard {
  total_documents: number;
  active_roadmaps: number;
  completed_topics: number;
  total_topics: number;
  assessment_scores: Record<string, number>;
  weak_topics: string[];
  recent_activity: Array<{ type: string; document: string; topic: string; timestamp: string }>;
  learning_streak_days: number;
}

export interface AppSettings {
  ai_provider: string;
  ai_model: string;
  max_upload_size_mb: number;
  allowed_extensions: string[];
  has_gemini: boolean;
  has_openai: boolean;
}
