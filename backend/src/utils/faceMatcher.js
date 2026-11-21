/**
 * SPTech AI Face Biometric Matcher & Verification Engine
 * Compares high-dimensional face embedding vectors using Cosine Similarity & Euclidean Distance.
 */

export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function euclideanDistance(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Verify live captured face against reference template
 * Supports both full-face biometrics and masked periocular biometrics.
 * @param {Array<number>} liveEmbedding 
 * @param {Array<number>|string} referenceEmbedding 
 * @param {number} threshold Default 0.60 for full face, 0.54 for masked face
 * @param {boolean} isMasked Whether subject is wearing a face mask
 */
export function verifyFaceBiometrics(liveEmbedding, referenceEmbedding, threshold = 0.60, isMasked = false) {
  let refVec = referenceEmbedding;
  if (typeof referenceEmbedding === 'string') {
    try {
      refVec = JSON.parse(referenceEmbedding);
    } catch {
      return { match: false, score: 0, reason: 'Invalid reference biometric template format' };
    }
  }

  if (!Array.isArray(liveEmbedding) || !Array.isArray(refVec)) {
    return { match: false, score: 0, reason: 'Biometric embeddings must be numerical arrays' };
  }

  // When masked, extract upper 64 dimensions (periocular region: forehead, eyebrows, eyes, nasion)
  let liveTarget = liveEmbedding;
  let refTarget = refVec;

  if (isMasked && liveEmbedding.length >= 64 && refVec.length >= 64) {
    const liveUpper = liveEmbedding.slice(0, 64);
    const refUpper = refVec.slice(0, 64);

    // Normalize periocular sub-vectors to unit length
    const normA = Math.sqrt(liveUpper.reduce((s, v) => s + v * v, 0)) || 1;
    const normB = Math.sqrt(refUpper.reduce((s, v) => s + v * v, 0)) || 1;

    liveTarget = liveUpper.map(v => v / normA);
    refTarget = refUpper.map(v => v / normB);
  }

  const similarity = cosineSimilarity(liveTarget, refTarget);
  const distance = euclideanDistance(liveTarget, refTarget);

  const effectiveThreshold = threshold;
  const isMatched = similarity >= effectiveThreshold;

  return {
    match: isMatched,
    similarity: Math.round(similarity * 1000) / 1000,
    distance: Math.round(distance * 1000) / 1000,
    threshold: effectiveThreshold,
    isMasked: !!isMasked,
    mode: isMasked ? 'PERIOCULAR_MASKED' : 'FULL_FACE',
  };
}
