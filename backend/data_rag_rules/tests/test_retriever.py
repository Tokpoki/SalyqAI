from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.rag.retriever import retrieve


class RetrieveTests(unittest.TestCase):
    def test_blank_query_returns_empty_list(self) -> None:
        self.assertEqual(retrieve("   "), [])

    def test_non_positive_top_k_raises_value_error(self) -> None:
        with self.assertRaises(ValueError):
            retrieve("упрощенка", top_k=0)

    @patch("src.rag.retriever._get_collection")
    @patch("src.rag.retriever._get_embedding_model")
    def test_retrieve_queries_collection_and_formats_results(
        self,
        mock_get_embedding_model: Mock,
        mock_get_collection: Mock,
    ) -> None:
        model = Mock()
        model.encode.return_value = np.array([[0.1, 0.2, 0.3]])
        mock_get_embedding_model.return_value = model

        collection = Mock()
        collection.query.return_value = {
            "ids": [["article-686"]],
            "documents": [[("Статья 686.\n" + "Текст " * 80)]],
            "metadatas": [[{"article_number": "686", "article_title": "Упрощенная декларация"}]],
            "distances": [[0.1234]],
        }
        mock_get_collection.return_value = collection

        results = retrieve("Какие налоги платит ИП на упрощенке?", top_k=3)

        model.encode.assert_called_once_with(
            ["query: Какие налоги платит ИП на упрощенке?"],
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        collection.query.assert_called_once_with(
            query_embeddings=[[0.1, 0.2, 0.3]],
            n_results=3,
            include=["documents", "metadatas", "distances"],
        )

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["article_number"], "686")
        self.assertEqual(results[0]["article_title"], "Упрощенная декларация")
        self.assertEqual(results[0]["score"], 0.1234)
        self.assertLessEqual(len(results[0]["snippet"]), 303)
        self.assertNotIn("\n", results[0]["snippet"])


if __name__ == "__main__":
    unittest.main()
