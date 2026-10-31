"""
Integration and unit tests for the Pathwise API.
"""
import unittest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.core.config import settings
from app.main import app
from app.db.database import init_db
import app.services.ai_provider as ai_p

class TestPathwiseAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        settings.AI_PROVIDER = "mock"
        ai_p._provider = ai_p.MockProvider()
        init_db()
        cls.client = TestClient(app)
        cls.test_doc_id = None
        cls.test_topic_id = None

    def test_01_health(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("version", data)

    def test_02_settings(self):
        res = self.client.get("/api/settings")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("ai_provider", data)
        self.assertIn("allowed_extensions", data)
        self.assertIn("max_upload_size_mb", data)

    def test_03_upload_document(self):
        sample_path = "uploads/sample_ml_course.pdf"
        self.assertTrue(os.path.exists(sample_path), "Sample PDF should exist")
        with open(sample_path, "rb") as f:
            res = self.client.post(
                "/api/documents/upload",
                files={"file": ("sample_ml_course.pdf", f, "application/pdf")},
            )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("id", data)
        self.assertEqual(data["original_filename"], "sample_ml_course.pdf")
        TestPathwiseAPI.test_doc_id = data["id"]

    def test_04_get_document_and_pages(self):
        self.assertIsNotNone(self.test_doc_id)
        res = self.client.get(f"/api/documents/{self.test_doc_id}")
        self.assertEqual(res.status_code, 200)
        doc = res.json()
        self.assertEqual(doc["status"], "completed")

        # Page check
        p_res = self.client.get(f"/api/documents/{self.test_doc_id}/pages/1")
        self.assertEqual(p_res.status_code, 200)
        page_data = p_res.json()
        self.assertEqual(page_data["page_number"], 1)

    def test_05_extraction_report(self):
        res = self.client.get(f"/api/documents/{self.test_doc_id}/extraction-report")
        self.assertEqual(res.status_code, 200)
        report = res.json()
        self.assertGreaterEqual(report["total_pages"], 1)

    def test_06_topics_and_roadmap(self):
        res = self.client.get(f"/api/documents/{self.test_doc_id}/topics")
        self.assertEqual(res.status_code, 200)
        topics = res.json()
        self.assertGreaterEqual(len(topics), 1)
        TestPathwiseAPI.test_topic_id = topics[0]["id"]

        r_res = self.client.get(f"/api/roadmap/{self.test_doc_id}")
        self.assertEqual(r_res.status_code, 200)
        roadmap = r_res.json()
        self.assertIn("steps", roadmap)

    def test_07_tutor_explain_and_chat(self):
        self.assertIsNotNone(self.test_topic_id)
        # Explain
        res = self.client.post(
            "/api/tutor/explain",
            json={
                "document_id": self.test_doc_id,
                "topic_id": self.test_topic_id,
                "step": 1,
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("step_title", data)

        # Chat
        c_res = self.client.post(
            "/api/tutor/chat",
            json={
                "document_id": self.test_doc_id,
                "topic_id": self.test_topic_id,
                "message": "What is machine learning in one sentence?",
                "history": [],
            },
        )
        self.assertEqual(c_res.status_code, 200)
        self.assertIn("response", c_res.json())

    def test_08_assessment_generate_and_submit(self):
        self.assertIsNotNone(self.test_topic_id)
        # Generate questions
        q_res = self.client.post(
            "/api/questions/generate",
            json={
                "document_id": self.test_doc_id,
                "topic_id": self.test_topic_id,
                "difficulty": "basic",
                "count": 2,
            },
        )
        self.assertEqual(q_res.status_code, 200)
        questions = q_res.json()
        self.assertGreaterEqual(len(questions), 1)
        q1 = questions[0]

        # Request hint
        h_res = self.client.post(
            "/api/assessment/hint",
            json={
                "question_id": q1["id"],
                "user_id": "demo-user-001",
                "attempt_number": 1,
            },
        )
        self.assertEqual(h_res.status_code, 200)
        self.assertIn("hint", h_res.json())

        # Submit answer
        s_res = self.client.post(
            "/api/assessment/submit",
            json={
                "question_id": q1["id"],
                "selected_answer": "A",
                "user_id": "demo-user-001",
                "attempt_number": 1,
            },
        )
        self.assertEqual(s_res.status_code, 200)
        self.assertIn("is_correct", s_res.json())

    def test_09_progress_update_and_dashboard(self):
        u_res = self.client.post(
            "/api/progress/update",
            json={
                "document_id": self.test_doc_id,
                "topic_id": self.test_topic_id,
                "user_id": "demo-user-001",
                "is_completed": True,
            },
        )
        self.assertEqual(u_res.status_code, 200)

        # Dashboard check
        d_res = self.client.get("/api/progress")
        self.assertEqual(d_res.status_code, 200)
        dash = d_res.json()
        self.assertGreaterEqual(dash["total_documents"], 1)

if __name__ == "__main__":
    unittest.main()
