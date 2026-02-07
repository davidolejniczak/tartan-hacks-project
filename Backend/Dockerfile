FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/.cache/huggingface

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        pkg-config \
        libcairo2-dev \
        libffi-dev \
        libjpeg-dev \
        zlib1g-dev \
        libpango1.0-dev \
        libgdk-pixbuf-2.0-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Pre-download BLIP base model weights during build
RUN python - <<'PY'
from transformers import BlipProcessor, BlipForConditionalGeneration
BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
print("BLIP base cached")
PY

COPY . /app

EXPOSE 8080

CMD ["uvicorn", "FastAPI.app:app", "--host", "0.0.0.0", "--port", "8080"]
