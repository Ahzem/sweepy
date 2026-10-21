import pytest
from unittest.mock import AsyncMock, patch
from app.schemas.file import FileMetadataResponse
from app.services.ai_service import AIService


@pytest.fixture
def sample_files():
    return [
        FileMetadataResponse(
            name="invoice_2026_oct.pdf",
            relative_path="invoice_2026_oct.pdf",
            extension=".pdf",
            category="Documents",
            size_bytes=1024,
            formatted_size="1.0 KB",
            modified_at="2026-10-15T10:00:00Z",
        ),
        FileMetadataResponse(
            name="screenshot_42.png",
            relative_path="screenshot_42.png",
            extension=".png",
            category="Images",
            size_bytes=2048,
            formatted_size="2.0 KB",
            modified_at="2026-10-18T12:00:00Z",
        ),
    ]


@pytest.mark.asyncio
async def test_rule_based_fallback(sample_files):
    ai = AIService()
    suggestions, fallback_used = await ai.generate_suggestions(sample_files, use_ai=False)

    assert fallback_used is True
    assert len(suggestions) == 2

    # Check invoice categorization
    inv = next(s for s in suggestions if "invoice" in s.original_filename)
    assert inv.proposed_relative_path.startswith("Documents/Invoices")
    assert inv.source == "rule"

    # Check image categorization
    img = next(s for s in suggestions if "screenshot" in s.original_filename)
    assert img.proposed_relative_path.startswith("Images/2026-10")
    assert img.source == "rule"


@pytest.mark.asyncio
async def test_ollama_unavailable_graceful_fallback(sample_files):
    ai = AIService()

    with patch.object(ai, "check_status", new_callable=AsyncMock) as mock_status:
        mock_status.return_value = {"connected": False, "model_available": False}

        suggestions, fallback_used = await ai.generate_suggestions(sample_files, use_ai=True)
        assert fallback_used is True
        assert len(suggestions) == 2


@pytest.mark.asyncio
async def test_ollama_successful_mocked_response(sample_files):
    ai = AIService()

    mock_ollama_json = {
        "suggestions": [
            {
                "original_filename": "invoice_2026_oct.pdf",
                "proposed_filename": "october_invoice.pdf",
                "proposed_relative_path": "Documents/Invoices/october_invoice.pdf",
                "category": "Documents",
                "explanation": "Identified as billing document",
                "confidence": 0.95,
            },
            {
                "original_filename": "screenshot_42.png",
                "proposed_filename": "screenshot_dashboard.png",
                "proposed_relative_path": "Images/Screenshots/screenshot_dashboard.png",
                "category": "Images",
                "explanation": "Image screenshot",
                "confidence": 0.9,
            },
        ]
    }

    with patch.object(ai, "check_status", new_callable=AsyncMock) as mock_status, \
         patch.object(ai, "_query_ollama_batch", new_callable=AsyncMock) as mock_query:

        mock_status.return_value = {"connected": True, "model_available": True}
        mock_query.return_value = [
            ai._single_file_rule_suggestion(sample_files[0]),
            ai._single_file_rule_suggestion(sample_files[1]),
        ]

        suggestions, fallback_used = await ai.generate_suggestions(sample_files, use_ai=True)
        assert len(suggestions) == 2
