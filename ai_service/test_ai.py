import urllib.request
import json
import numpy as np
import cv2
import base64

# Create a test synthetic face canvas with eyes, nose, mouth to verify pipeline
img = np.full((320, 320, 3), 220, dtype=np.uint8)
# Draw simple face structure
cv2.circle(img, (160, 160), 100, (180, 190, 210), -1) # face oval
cv2.circle(img, (125, 130), 12, (50, 40, 30), -1)     # left eye
cv2.circle(img, (195, 130), 12, (50, 40, 30), -1)     # right eye
cv2.line(img, (160, 150), (160, 180), (120, 130, 150), 3) # nose
cv2.ellipse(img, (160, 205), (35, 15), 0, 0, 180, (70, 60, 160), 4) # mouth

_, buffer = cv2.imencode('.jpg', img)
base64_str = base64.b64encode(buffer).decode('utf-8')

# Call InsightFace extract-face endpoint
url = "http://127.0.0.1:5001/extract-face"
req_data = json.dumps({"image": f"data:image/jpeg;base64,{base64_str}"}).encode('utf-8')

req = urllib.request.Request(url, data=req_data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode('utf-8'))
        print("InsightFace Extraction Result:", result.get("success"), "Has Face:", result.get("has_face"))
        if result.get("embedding"):
            print("Embedding vector dimensions:", len(result["embedding"]))
except Exception as e:
    print("Error calling InsightFace:", e)
