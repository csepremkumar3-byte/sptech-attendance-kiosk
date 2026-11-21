/**
 * SPTech InsightFace Biometric AI Client Service
 * Communicates with the local InsightFace ArcFace 512-D inference engine (Port 5001)
 */

const AI_SERVICE_URL = process.env.AI_BIOMETRIC_URL || 'http://127.0.0.1:5001';

export async function extractFaceFromImage(imageBase64, isMasked = false) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const response = await fetch(`${AI_SERVICE_URL}/extract-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageBase64,
        is_masked: !!isMasked,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, offline: false, message: `AI service returned status ${response.status}` };
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.warn('InsightFace AI service unavailable (falling back to lightweight client/node engine):', err.message);
    return { success: false, offline: true, message: err.message };
  }
}

export async function matchFaceBiometrics(liveEmbedding, candidates, threshold = 0.55, isMasked = false) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const response = await fetch(`${AI_SERVICE_URL}/match-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        live_embedding: liveEmbedding,
        candidates,
        threshold,
        is_masked: !!isMasked,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { matched: false, offline: false, highest_similarity: 0 };
    }

    const data = await response.json();
    return data;
  } catch (err) {
    return { matched: false, offline: true, highest_similarity: 0 };
  }
}
