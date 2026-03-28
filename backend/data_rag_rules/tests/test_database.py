from __future__ import annotations

import os
import tempfile
import unittest

import bcrypt

from src.db import database


class DatabaseTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tempdir.name, "test.db")
        self.previous_db_path = os.environ.get("DB_PATH")
        os.environ["DB_PATH"] = self.db_path
        database.init_db()

    def tearDown(self) -> None:
        if self.previous_db_path is None:
            os.environ.pop("DB_PATH", None)
        else:
            os.environ["DB_PATH"] = self.previous_db_path
        self.tempdir.cleanup()

    def test_init_db_applies_full_schema_and_seeds_test_user(self) -> None:
        conn = database.get_connection()
        try:
            tables = {
                row["name"]
                for row in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                ).fetchall()
            }
            self.assertTrue(
                {
                    "schema_migrations",
                    "users",
                    "chat_sessions",
                    "chat_messages",
                    "taxpayer_profiles",
                    "extracted_facts",
                    "answer_citations",
                    "feedback",
                    "error_logs",
                }.issubset(tables)
            )

            session_columns = {
                row["name"]
                for row in conn.execute("PRAGMA table_info(chat_sessions)").fetchall()
            }
            self.assertIn("knowledge_version", session_columns)
            self.assertIn("updated_at", session_columns)
            self.assertIn("user_id", session_columns)
            self.assertIn("title", session_columns)

            profile_columns = {
                row["name"]
                for row in conn.execute("PRAGMA table_info(taxpayer_profiles)").fetchall()
            }
            self.assertIn("session_id", profile_columns)
            self.assertIn("user_id", profile_columns)
        finally:
            conn.close()

        seeded_user = database.get_user_by_email("test@mail.com")
        self.assertIsNotNone(seeded_user)
        self.assertEqual(seeded_user["name"], "Test User")
        self.assertTrue(bcrypt.checkpw(b"123", seeded_user["password_hash"].encode()))

    def test_user_and_session_crud_for_auth_and_sidebar(self) -> None:
        password_hash = bcrypt.hashpw(b"secret", bcrypt.gensalt()).decode()
        user = database.create_user("user-1", "user1@mail.com", password_hash, "User One")

        created_at = "2026-03-28T12:00:00+00:00"
        legacy_session = database.create_session("legacy-session", created_at)
        session = database.create_session(
            "session-1",
            "user-1",
            created_at,
            title="Первый чат",
        )
        database.insert_message(
            "message-1",
            "session-1",
            "assistant",
            "Ответ",
            created_at,
            advice_json={"action_plan": ["A", "B"]},
            confidence=0.91,
        )
        renamed = database.update_session_title("session-1", "Новый заголовок")

        fetched_by_email = database.get_user_by_email("user1@mail.com")
        fetched_by_id = database.get_user_by_id("user-1")
        sessions = database.get_sessions_by_user("user-1")
        fetched_session = database.get_session("session-1")
        fetched_message = database.get_message("message-1")

        self.assertEqual(user["email"], "user1@mail.com")
        self.assertIsNone(legacy_session["user_id"])
        self.assertEqual(fetched_by_email["id"], "user-1")
        self.assertEqual(fetched_by_id["name"], "User One")
        self.assertEqual(session["user_id"], "user-1")
        self.assertEqual(renamed["title"], "Новый заголовок")
        self.assertEqual(len(sessions), 1)
        self.assertEqual(sessions[0]["title"], "Новый заголовок")
        self.assertEqual(fetched_session["knowledge_version"], "tax_code_2026_v1")
        self.assertEqual(fetched_message["advice_json"], {"action_plan": ["A", "B"]})
        self.assertEqual(fetched_message["confidence"], 0.91)

    def test_profile_by_user_and_related_records_crud(self) -> None:
        password_hash = bcrypt.hashpw(b"pw", bcrypt.gensalt()).decode()
        database.create_user("user-2", "user2@mail.com", password_hash, "User Two")
        database.create_session(
            "session-2",
            "user-2",
            "2026-03-28T13:00:00+00:00",
            title="Чат профиля",
        )
        database.insert_message(
            "message-2",
            "session-2",
            "assistant",
            "Текст ответа",
            "2026-03-28T13:00:00+00:00",
        )

        empty_profile = database.get_or_create_profile_by_user("user-2")
        updated_profile = database.update_profile_by_user(
            "user-2",
            {
                "taxpayer_type": "sole_proprietor",
                "tax_regime": "simplified",
                "has_foreign_income": False,
                "has_rental_income": True,
            },
            updated_at="2026-03-28T13:05:00+00:00",
        )
        legacy_profile = database.get_taxpayer_profile("session-2")

        fact = database.save_extracted_fact(
            "fact-1",
            "session-2",
            "tax_regime",
            "2026-03-28T13:05:00+00:00",
            fact_value="simplified",
            confidence=0.88,
            message_id="message-2",
        )
        citation = database.save_answer_citation(
            "citation-1",
            "message-2",
            "2026-03-28T13:05:00+00:00",
            article_number="686",
            article_title="Упрощенная декларация",
            snippet="Статья о форме 910.00",
            score=0.12,
        )
        feedback = database.save_feedback(
            "feedback-1",
            "message-2",
            "up",
            "2026-03-28T13:05:00+00:00",
            reason="Полезно",
        )

        self.assertEqual(empty_profile["user_id"], "user-2")
        self.assertEqual(updated_profile["taxpayer_type"], "sole_proprietor")
        self.assertFalse(updated_profile["has_foreign_income"])
        self.assertTrue(updated_profile["has_rental_income"])
        self.assertEqual(legacy_profile["user_id"], "user-2")
        self.assertEqual(legacy_profile["tax_regime"], "simplified")

        self.assertEqual(fact["fact_key"], "tax_regime")
        self.assertEqual(database.list_extracted_facts("session-2")[0]["fact_value"], "simplified")

        self.assertEqual(citation["article_number"], "686")
        self.assertEqual(database.list_answer_citations("message-2")[0]["article_title"], "Упрощенная декларация")

        self.assertEqual(feedback["rating"], "up")
        self.assertEqual(database.list_feedback_for_message("message-2")[0]["reason"], "Полезно")

        self.assertTrue(database.delete_extracted_fact("fact-1"))
        self.assertTrue(database.delete_answer_citation("citation-1"))
        self.assertTrue(database.delete_feedback("feedback-1"))
        self.assertTrue(database.delete_profile_by_user("user-2"))

    def test_insert_error_log(self) -> None:
        password_hash = bcrypt.hashpw(b"pw", bcrypt.gensalt()).decode()
        database.create_user("user-3", "user3@mail.com", password_hash, "User Three")
        database.create_session("session-3", "user-3", "2026-03-28T14:00:00+00:00")

        error_log = database.insert_error_log(
            "error-1",
            "gemini_error",
            "Upstream timeout",
            user_id="user-3",
            session_id="session-3",
            stack_trace="traceback...",
        )

        self.assertEqual(error_log["error_type"], "gemini_error")
        self.assertEqual(error_log["session_id"], "session-3")


if __name__ == "__main__":
    unittest.main()
