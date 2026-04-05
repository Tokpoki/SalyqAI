FROM python:3.11-slim AS builder

WORKDIR /app

# Build deps for chromadb native extensions
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY api_orchestrator/requirements.txt /tmp/api.txt
COPY data_rag_rules/requirements.txt /tmp/rag.txt
RUN pip install --no-cache-dir -r /tmp/api.txt -r /tmp/rag.txt

# --- runtime stage (smaller image) ---
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p /data

ENV DB_PATH=/data/salyq.db
ENV CHROMA_PATH=/data/chroma
ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

WORKDIR /app/api_orchestrator

# Seed chroma from bundled data if volume is empty, then start server
CMD sh -c '\
  if [ ! -f /data/chroma/.version ] || [ "$(cat /data/chroma/.version)" != "v2-openai" ]; then \
    rm -rf /data/chroma && cp -r /app/chroma_seed /data/chroma && \
    echo "v2-openai" > /data/chroma/.version && \
    echo "Seeded chroma v2-openai"; \
  fi && \
  uvicorn src.main:app --host 0.0.0.0 --port 8000'
