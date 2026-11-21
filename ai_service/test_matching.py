import numpy as np
import urllib.request
import json

# Generate two distinct normalized 512-D vectors representing two different people
np.random.seed(42)
person_a_ref = np.random.randn(512).astype(np.float32)
person_a_ref /= np.linalg.norm(person_a_ref)

person_b_ref = np.random.randn(512).astype(np.float32)
person_b_ref /= np.linalg.norm(person_b_ref)

# Simulate live capture of Person A with small natural noise (cosine sim ~ 0.85)
person_a_live = person_a_ref + np.random.randn(512) * 0.15
person_a_live /= np.linalg.norm(person_a_live)

# Simulate live capture of a complete stranger (Person C)
person_c_live = np.random.randn(512).astype(np.float32)
person_c_live /= np.linalg.norm(person_c_live)

candidates = [
    {"id": 1, "employee_code": "EMP001", "name": "John Doe", "embedding": person_a_ref.tolist()},
    {"id": 2, "employee_code": "EMP002", "name": "Jane Smith", "embedding": person_b_ref.tolist()}
]

def test_match(live_vec, label):
    req_data = json.dumps({
        "live_embedding": live_vec.tolist(),
        "candidates": candidates,
        "threshold": 0.62
    }).encode('utf-8')
    req = urllib.request.Request("http://127.0.0.1:5001/match-face", data=req_data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print(f"=== {label} ===")
        print("Matched:", res["matched"])
        if res["best_match"]:
            print("Identified Employee:", res["best_match"]["name"], f"({res['best_match']['employee_code']})")
        print("Similarity Score:", res["highest_similarity"])
        print("Scores:", res["scores"])
        print()

test_match(person_a_live, "TEST 1: Live John Doe (EMP001)")
test_match(person_c_live, "TEST 2: Unknown Stranger / Non-enrolled Person")
