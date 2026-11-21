/**
 * SPTech InsightFace Biometric AI Client Service
 * Communicates with the local InsightFace ArcFace 512-D inference engine (Port 5001)
 */

const AI_SERVICE_URL = process.env.AI_BIOMETRIC_URL || 'http://127.0.0.1:5001';

export async function extractFaceFromImage(imageBase64, isMasked = false) {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/extract-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageBase64,
        is_masked: !!isMasked,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service returned status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error connecting to InsightFace AI service:', err.message);
    throw new Error(`Biometric AI Engine error: ${err.message}`);
  }
}

export async function matchFaceBiometrics(liveEmbedding, candidates, threshold = 0.62, isMasked = false) {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/match-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        live_embedding: liveEmbedding,
        candidates,
        threshold,
        is_masked: !!isMasked,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service match returned status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error matching face biometrics:', err.message);
    throw new Error(`Biometric matching engine error: ${err.message}`);
  }
}
