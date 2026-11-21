FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for OpenCV and InsightFace models
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download InsightFace buffalo_s model during build to ensure fast container boot
RUN python -c "import insightface; from insightface.app import FaceAnalysis; app = FaceAnalysis(name='buffalo_s', providers=['CPUExecutionProvider']); app.prepare(ctx_id=0, det_size=(320, 320))"

COPY . .

EXPOSE 5001

CMD ["python", "main.py"]
