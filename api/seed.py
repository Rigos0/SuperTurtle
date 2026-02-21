from __future__ import annotations

import asyncio
import uuid
from typing import Any

from agnt_api.db import SessionLocal
from agnt_api.models import Agent

SAMPLE_AGENTS: list[dict[str, Any]] = [
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "text-summarizer-pro",
        "description": "Summarize long-form text into concise bullet points and takeaways.",
        "tags": ["text", "summarization", "productivity"],
        "pricing": {"currency": "USD", "unit": "job", "amount": 0.25},
        "input_schema": {
            "type": "object",
            "required": ["text"],
            "properties": {
                "text": {"type": "string"},
                "max_bullets": {"type": "integer", "minimum": 1, "maximum": 20},
            },
        },
        "output_schema": {
            "type": "object",
            "required": ["summary", "bullets"],
            "properties": {
                "summary": {"type": "string"},
                "bullets": {"type": "array", "items": {"type": "string"}},
            },
        },
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "name": "invoice-extractor",
        "description": "Extract structured invoice fields from OCR text or plain text.",
        "tags": ["ocr", "finance", "extraction"],
        "pricing": {"currency": "USD", "unit": "job", "amount": 0.4},
        "input_schema": {
            "type": "object",
            "required": ["document_text"],
            "properties": {
                "document_text": {"type": "string"},
                "locale": {"type": "string", "default": "en-US"},
            },
        },
        "output_schema": {
            "type": "object",
            "required": ["vendor", "invoice_number", "total_amount"],
            "properties": {
                "vendor": {"type": "string"},
                "invoice_number": {"type": "string"},
                "total_amount": {"type": "number"},
                "currency": {"type": "string"},
                "due_date": {"type": "string"},
            },
        },
    },
    {
        "id": "33333333-3333-3333-3333-333333333333",
        "name": "translation-engine",
        "description": "Translate text between major languages with optional tone control.",
        "tags": ["translation", "text", "localization"],
        "pricing": {"currency": "USD", "unit": "job", "amount": 0.3},
        "input_schema": {
            "type": "object",
            "required": ["text", "target_language"],
            "properties": {
                "text": {"type": "string"},
                "target_language": {"type": "string"},
                "source_language": {"type": "string"},
                "tone": {"type": "string", "enum": ["formal", "neutral", "casual"]},
            },
        },
        "output_schema": {
            "type": "object",
            "required": ["translated_text", "detected_source_language"],
            "properties": {
                "translated_text": {"type": "string"},
                "detected_source_language": {"type": "string"},
            },
        },
    },
    {
        "id": "44444444-4444-4444-4444-444444444444",
        "name": "sentiment-monitor",
        "description": "Classify sentiment and urgency for customer support messages.",
        "tags": ["nlp", "support", "classification"],
        "pricing": {"currency": "USD", "unit": "job", "amount": 0.2},
        "input_schema": {
            "type": "object",
            "required": ["message"],
            "properties": {
                "message": {"type": "string"},
                "include_entities": {"type": "boolean", "default": False},
            },
        },
        "output_schema": {
            "type": "object",
            "required": ["sentiment", "score", "urgency"],
            "properties": {
                "sentiment": {"type": "string", "enum": ["positive", "neutral", "negative"]},
                "score": {"type": "number"},
                "urgency": {"type": "string", "enum": ["low", "medium", "high"]},
                "entities": {"type": "array", "items": {"type": "string"}},
            },
        },
    },
]


async def seed_agents() -> tuple[int, int]:
    inserted = 0
    updated = 0

    async with SessionLocal() as session:
        try:
            for payload in SAMPLE_AGENTS:
                agent_id = uuid.UUID(payload["id"])
                agent = await session.get(Agent, agent_id)

                if agent is None:
                    session.add(
                        Agent(
                            id=agent_id,
                            name=payload["name"],
                            description=payload["description"],
                            tags=payload["tags"],
                            pricing=payload["pricing"],
                            input_schema=payload["input_schema"],
                            output_schema=payload["output_schema"],
                        )
                    )
                    inserted += 1
                    continue

                agent.name = payload["name"]
                agent.description = payload["description"]
                agent.tags = payload["tags"]
                agent.pricing = payload["pricing"]
                agent.input_schema = payload["input_schema"]
                agent.output_schema = payload["output_schema"]
                updated += 1

            await session.commit()
        except Exception:
            await session.rollback()
            raise

    return inserted, updated


async def main() -> None:
    inserted, updated = await seed_agents()
    print(f"Seed complete: inserted={inserted} updated={updated} total={len(SAMPLE_AGENTS)}")


if __name__ == "__main__":
    asyncio.run(main())
