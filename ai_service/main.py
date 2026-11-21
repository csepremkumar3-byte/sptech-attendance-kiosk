import base64
import io
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import insightface
from insightface.app import FaceAnalysis

app = FastAPI(title="SPTech InsightFace Biometric AI Service", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize InsightFace Buffalo_s (ArcFace 512-D + RetinaFace detector)
print("Loading InsightFace Buffalo_s Model...")
face_app = FaceAnalysis(name='buffalo_s', providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0, det_size=(320, 320))
print("[OK] InsightFace ArcFace 512-D Biometric Engine Ready!")

class ExtractRequest(BaseModel):
    image: str  # Base64 data URL or raw base64
    is_masked: Optional[bool] = False

class Candidate(BaseModel):
    id: int
    employee_code: str
    name: str
    embedding: List[float]
    department: Optional[str] = None
    designation: Optional[str] = None

class MatchRequest(BaseModel):
    live_embedding: List[float]
    candidates: List[Candidate]
    threshold: Optional[float] = 0.62
    is_masked: Optional[bool] = False

def decode_base64_image(base64_str: str) -> np.ndarray:
    if ',' in base64_str:
        base64_str = base64_str.split(',')[1]
    image_bytes = base64.b64decode(base64_str)
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode base64 image")
    return img

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "SPTech InsightFace Biometric AI Engine",
        "engine": "ArcFace 512-D (buffalo_s)",
        "accuracy_benchmark": "99.83% LFW",
    }

@app.post("/extract-face")
def extract_face(req: ExtractRequest):
    try:
        img = decode_base64_image(req.image)
        faces = face_app.get(img)

        if not faces or len(faces) == 0:
            return {
                "success": False,
                "has_face": False,
                "message": "No face detected in camera frame. Ensure adequate lighting and face camera directly."
            }

        # Select primary face (largest bounding box or highest confidence)
        best_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

        # Normalize 512-D ArcFace embedding to unit length
        raw_embedding = best_face.embedding
        norm = np.linalg.norm(raw_embedding)
        if norm == 0:
            norm = 1.0
        normalized_embedding = (raw_embedding / norm).tolist()

        # Mask detection analysis (check skin contrast in lower face vs upper face)
        x1, y1, x2, y2 = [int(v) for v in best_face.bbox]
        h, w = img.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        face_roi = img[y1:y2, x1:x2]
        is_masked = req.is_masked
        if face_roi.size > 0:
            fh, fw = face_roi.shape[:2]
            upper_roi = face_roi[:int(fh * 0.45), :]
            lower_roi = face_roi[int(fh * 0.45):, :]
            
            # Simple color variance comparison
            upper_std = np.std(upper_roi)
            lower_std = np.std(lower_roi)
            if lower_std < upper_std * 0.60:
                is_masked = True

        return {
            "success": True,
            "has_face": True,
            "embedding": normalized_embedding,
            "embedding_dims": len(normalized_embedding),
            "confidence": float(best_face.det_score),
            "bbox": [float(x) for x in best_face.bbox],
            "landmarks": [float(x) for x in best_face.kps.flatten()] if hasattr(best_face, 'kps') else [],
            "is_masked": bool(is_masked),
        }
    except Exception as e:
        return {
            "success": False,
            "has_face": False,
            "message": f"Biometric extraction error: {str(e)}"
        }

@app.post("/match-face")
def match_face(req: MatchRequest):
    try:
        live_vec = np.array(req.live_embedding, dtype=np.float32)
        live_norm = np.linalg.norm(live_vec)
        if live_norm > 0:
            live_vec = live_vec / live_norm

        threshold = req.threshold or (0.52 if req.is_masked else 0.62)

        best_candidate = None
        highest_similarity = -1.0
        candidate_scores = []

        for cand in req.candidates:
            ref_vec = np.array(cand.embedding, dtype=np.float32)
            ref_norm = np.linalg.norm(ref_vec)
            if ref_norm > 0:
                ref_vec = ref_vec / ref_norm

            sim = float(np.dot(live_vec, ref_vec))
            candidate_scores.append({
                "id": cand.id,
                "employee_code": cand.employee_code,
                "name": cand.name,
                "similarity": round(sim, 4)
            })

            if sim > highest_similarity:
                highest_similarity = sim
                if sim >= threshold:
                    best_candidate = cand

        return {
            "success": True,
            "matched": best_candidate is not None,
            "highest_similarity": round(highest_similarity, 4),
            "threshold": threshold,
            "best_match": best_candidate.dict() if best_candidate else None,
            "scores": sorted(candidate_scores, key=lambda x: x["similarity"], reverse=True)[:5]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
