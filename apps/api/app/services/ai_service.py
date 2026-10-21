import json
import uuid
from pathlib import Path
from typing import Any
import httpx
from app.core.config import settings
from app.core.logging import logger
from app.schemas.file import FileMetadataResponse, OrganizationSuggestionItem
from app.utils.file_types import get_file_category, get_rule_based_suggestion
from app.utils.path_safety import sanitize_relative_path, sanitize_windows_filename


class AIService:
    """Service communicating with local Ollama instance (gemma3:1b) with rule fallback."""

    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.OLLAMA_TIMEOUT_SECONDS

    async def check_status(self) -> dict[str, Any]:
        """Check if Ollama server is up and if the model is downloaded."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    model_found = any(self.model in m for m in models)
                    return {
                        "connected": True,
                        "model": self.model,
                        "model_available": model_found,
                        "all_models": models,
                        "message": "Ollama is running" if model_found else f"Model '{self.model}' not found in Ollama",
                    }
        except Exception as e:
            logger.debug(f"Ollama health check error: {e}")

        return {
            "connected": False,
            "model": self.model,
            "model_available": False,
            "all_models": [],
            "message": f"Ollama is unreachable at {self.base_url}",
        }

    async def generate_suggestions(
        self,
        files: list[FileMetadataResponse],
        use_ai: bool = True,
    ) -> tuple[list[OrganizationSuggestionItem], bool]:
        """
        Generates organization suggestions for the given list of files.
        Returns (suggestions, fallback_used).
        """
        if not files:
            return [], False

        if not use_ai:
            return self._generate_rule_based_suggestions(files), True

        # Check if Ollama is accessible
        status = await self.check_status()
        if not status["connected"] or not status["model_available"]:
            logger.warning("Ollama unavailable or model missing. Falling back to rule-based suggestions.")
            return self._generate_rule_based_suggestions(files), True

        # Process in batches of 15 to stay within Gemma 1B's optimal context window
        batch_size = 15
        all_suggestions: list[OrganizationSuggestionItem] = []
        fallback_used = False

        for i in range(0, len(files), batch_size):
            batch = files[i : i + batch_size]
            try:
                batch_suggestions = await self._query_ollama_batch(batch)
                all_suggestions.extend(batch_suggestions)
            except Exception as e:
                logger.warning(f"Error querying Ollama for batch {i}: {e}. Using rule-based fallback for this batch.")
                fallback_used = True
                all_suggestions.extend(self._generate_rule_based_suggestions(batch))

        return all_suggestions, fallback_used

    async def _query_ollama_batch(self, files_batch: list[FileMetadataResponse]) -> list[OrganizationSuggestionItem]:
        """Query Ollama with a strict JSON format prompt."""
        files_payload = []
        for f in files_batch:
            files_payload.append({
                "original_filename": f.name,
                "relative_path": f.relative_path,
                "category": f.category,
                "extension": f.extension,
                "size": f.formatted_size,
                "modified": f.modified_at[:10] if f.modified_at else "",
            })

        system_prompt = (
            "You are Sweepy, a tidy file organizer. Recommend clean destination folders and safe filenames.\n"
            "Rules:\n"
            "1. Group into logical categories (e.g. Images/YYYY-MM/name.png, Documents/Invoices/name.pdf, Documents/Resumes/name.pdf, Audio/name.mp3, Code/name.ts, Archives/name.zip).\n"
            "2. Keep filenames clean and readable. Preserve original stem unless it's messy (e.g. clean up timestamps or random numbers if appropriate, keep extension intact).\n"
            "3. Return ONLY a valid JSON object with key 'suggestions' containing an array of objects.\n"
            "4. Each object must have: 'original_filename', 'proposed_filename', 'proposed_relative_path', 'category', 'explanation', 'confidence' (float 0.0-1.0).\n"
        )

        user_content = (
            f"Organize these files:\n{json.dumps(files_payload, indent=2)}\n\n"
            "Output JSON format:\n"
            "{\n"
            '  "suggestions": [\n'
            "    {\n"
            '      "original_filename": "example.pdf",\n'
            '      "proposed_filename": "example.pdf",\n'
            '      "proposed_relative_path": "Documents/example.pdf",\n'
            '      "category": "Documents",\n'
            '      "explanation": "Stored under Documents",\n'
            '      "confidence": 0.95\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": f"{system_prompt}\n\n{user_content}",
                    "stream": False,
                    "format": "json",
                    "options": {
                        "temperature": 0.2,
                        "num_predict": 1500,
                    },
                },
            )
            response.raise_for_status()
            res_data = response.json()
            raw_text = res_data.get("response", "{}")

            parsed = json.loads(raw_text)
            suggestions_list = parsed.get("suggestions", [])
            if not isinstance(suggestions_list, list):
                suggestions_list = []

            # Map raw suggestions back to files
            lookup = {s.get("original_filename"): s for s in suggestions_list if isinstance(s, dict)}
            result: list[OrganizationSuggestionItem] = []

            for f in files_batch:
                s_data = lookup.get(f.name)
                if s_data and s_data.get("proposed_relative_path"):
                    proposed_fn = sanitize_windows_filename(s_data.get("proposed_filename") or f.name)
                    # Ensure extension is preserved if model stripped it
                    if f.extension and not proposed_fn.lower().endswith(f.extension.lower()):
                        proposed_fn = f"{proposed_fn}{f.extension}"

                    proposed_rel = sanitize_relative_path(s_data.get("proposed_relative_path") or f"{f.category}/{proposed_fn}")
                    # Ensure proposed_relative_path ends with the proposed filename
                    if not proposed_rel.endswith(proposed_fn):
                        parent_dir = str(Path(proposed_rel).parent).replace("\\", "/")
                        if parent_dir == ".":
                            parent_dir = f.category
                        proposed_rel = f"{parent_dir}/{proposed_fn}"

                    category = s_data.get("category") or f.category
                    explanation = s_data.get("explanation") or f"Suggested organization for {f.category} file"
                    confidence = float(s_data.get("confidence", 0.85))

                    result.append(
                        OrganizationSuggestionItem(
                            id=str(uuid.uuid4()),
                            original_filename=f.name,
                            original_relative_path=f.relative_path,
                            proposed_filename=proposed_fn,
                            proposed_relative_path=proposed_rel,
                            category=category,
                            explanation=explanation,
                            confidence=min(max(confidence, 0.1), 1.0),
                            source="ai",
                            approved=True,
                            size_bytes=f.size_bytes,
                            formatted_size=f.formatted_size,
                        )
                    )
                else:
                    # Single file fallback within batch
                    rule_sug = self._single_file_rule_suggestion(f)
                    result.append(rule_sug)

            return result

    def _generate_rule_based_suggestions(self, files: list[FileMetadataResponse]) -> list[OrganizationSuggestionItem]:
        """Generate deterministic suggestions without AI."""
        return [self._single_file_rule_suggestion(f) for f in files]

    def _single_file_rule_suggestion(self, f: FileMetadataResponse) -> OrganizationSuggestionItem:
        ym = None
        if f.modified_at and len(f.modified_at) >= 7:
            ym = f.modified_at[:7]

        dest_rel, explanation = get_rule_based_suggestion(f.name, ym)
        safe_rel = sanitize_relative_path(dest_rel)
        proposed_fn = Path(safe_rel).name

        return OrganizationSuggestionItem(
            id=str(uuid.uuid4()),
            original_filename=f.name,
            original_relative_path=f.relative_path,
            proposed_filename=proposed_fn,
            proposed_relative_path=safe_rel,
            category=f.category,
            explanation=explanation,
            confidence=0.90,
            source="rule",
            approved=True,
            size_bytes=f.size_bytes,
            formatted_size=f.formatted_size,
        )


ai_service = AIService()
