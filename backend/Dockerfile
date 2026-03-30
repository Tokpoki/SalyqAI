FROM python:3.11-slim

WORKDIR /app

# Install dependencies for both modules
COPY api_orchestrator/requirements.txt /tmp/api.txt
COPY data_rag_rules/requirements.txt /tmp/rag.txt
RUN pip install --no-cache-dir -r /tmp/api.txt -r /tmp/rag.txt

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p /data

# Bundle chroma seed data into image
COPY chroma_seed /app/chroma_seed

ENV DB_PATH=/data/salyq.db
ENV CHROMA_PATH=/data/chroma
ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

WORKDIR /app/api_orchestrator

# Seed chroma on first run if /data/chroma is empty, then start server
CMD sh -c 'if [ ! -f /data/chroma/chroma.sqlite3 ]; then cp -r /app/chroma_seed /data/chroma && echo "Seeded chroma"; fi && uvicorn src.main:app --host 0.0.0.0 --port 8000'
