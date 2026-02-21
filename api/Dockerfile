FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first (cached unless pyproject.toml changes)
COPY pyproject.toml ./
RUN mkdir -p agnt_api && touch agnt_api/__init__.py \
    && pip install --no-cache-dir . \
    && rm -rf agnt_api

# Copy application source
COPY agnt_api ./agnt_api
COPY alembic ./alembic
COPY alembic.ini ./

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x /app/entrypoint.sh

RUN adduser --disabled-password --no-create-home appuser
USER appuser

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
