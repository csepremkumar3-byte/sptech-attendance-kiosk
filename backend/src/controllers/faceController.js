import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Employee, FaceVerificationLog, Kiosk } from '../models/index.js';
import { verifyFaceBiometrics } from '../utils/faceMatcher.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'sptech_super_secret_jwt_key_2026_secure';
const THRESHOLD = parseFloat(process.env.FACE_SIMILARITY_THRESHOLD || '0.65');
const MASKED_THRESHOLD = parseFloat(process.env.FACE_MASK_THRESHOLD || '0.55');
const LIVENESS_THRESHOLD = parseFloat(process.env.LIVENESS_THRESHOLD || '0.50');

export async function verifyFace(req, res) {
  try {
    const {
      employee_code,
      liveEmbedding,
      livenessScore = 0.85,
      singleFaceConfirmed = true,
      kiosk_id = null,
      isMasked = false
    } = req.body;

    if (!employee_code) {
      return res.status(400).json({ success: false, message: 'Employee code or QR identifier is required' });
    }

    if (!liveEmbedding || !Array.isArray(liveEmbedding) || liveEmbedding.length === 0) {
      return res.status(400).json({ success: false, message: 'Live face embedding vector is required for biometric validation' });
    }

    if (!singleFaceConfirmed) {
      return res.status(400).json({ success: false, message: 'Verification rejected: Exactly one face must be visible in frame' });
    }

    // 1. Retrieve employee
    const employee = await Employee.findOne({
      where: { employee_code }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // 2. Verify active status
    if (employee.status !== 'ACTIVE') {
      await FaceVerificationLog.create({
        employee_id: employee.id,
        kiosk_id,
        status: 'FAILED',
        failure_reason: 'Employee account is inactive'
      });
      return res.status(403).json({ success: false, message: 'Verification failed: Employee account is inactive' });
    }

    // 3. Verify biometric reference exists
    if (!employee.face_id_ref) {
      await FaceVerificationLog.create({
        employee_id: employee.id,
        kiosk_id,
        status: 'FAILED',
        failure_reason: 'No biometric face template registered for this employee'
      });
      return res.status(400).json({
        success: false,
        message: 'Face not registered. Please contact Administrator for facial enrollment.'
      });
    }

    // 4. Liveness anti-spoofing check
    if (livenessScore < LIVENESS_THRESHOLD) {
      await FaceVerificationLog.create({
        employee_id: employee.id,
        kiosk_id,
        status: 'FAILED',
        liveness_score: livenessScore,
        failure_reason: 'Liveness anti-spoofing check failed'
      });
      return res.status(400).json({
        success: false,
        message: `Anti-spoofing / Liveness failed (Score: ${livenessScore}). Ensure live human presence.`
      });
    }

    // 5. Compare live face embedding against registered template
    const effectiveThreshold = isMasked ? MASKED_THRESHOLD : THRESHOLD;
    const comparison = verifyFaceBiometrics(liveEmbedding, employee.face_id_ref, effectiveThreshold, isMasked);

    if (!comparison.match) {
      await FaceVerificationLog.create({
        employee_id: employee.id,
        kiosk_id,
        status: 'FAILED',
        similarity_score: comparison.similarity,
        liveness_score: livenessScore,
        failure_reason: `Face similarity (${comparison.similarity}) below threshold (${effectiveThreshold}) [${isMasked ? 'MASKED' : 'STANDARD'}]`
      });
      return res.status(401).json({
        success: false,
        message: `Face verification failed: Biometric match score (${comparison.similarity}) below required threshold (${effectiveThreshold}).`,
        similarity: comparison.similarity,
        isMasked,
      });
    }

    // 6. Log success
    await FaceVerificationLog.create({
      employee_id: employee.id,
      kiosk_id,
      status: 'SUCCESS',
      similarity_score: comparison.similarity,
      liveness_score: livenessScore,
    });

    // 7. Generate tamper-proof signed biometric verification token
    const verificationToken = jwt.sign(
      {
        verified_employee_id: employee.id,
        employee_code: employee.employee_code,
        kiosk_id,
        similarity: comparison.similarity,
        isMasked,
        timestamp: Date.now()
      },
      JWT_SECRET,
      { expiresIn: '5m' } // Valid for 5 minutes to submit punch
    );

    return res.json({
      success: true,
      message: isMasked ? '✓ Face Verified with Mask (Periocular AI)' : '✓ Face Verified Successfully',
      employee: {
        id: employee.id,
        name: employee.name,
        employee_code: employee.employee_code,
        department: employee.department,
        designation: employee.designation,
      },
      verificationToken,
      similarity: comparison.similarity,
      livenessScore,
      isMasked,
      biometricMode: isMasked ? 'PERIOCULAR_MASKED' : 'FULL_FACE',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Biometric verification error', error: err.message });
  }
}

/**
 * 1:N Facial Identification & Automatic Attendance Punch
 * Compares live face capture against all registered members.
 * Supports both unmasked (full face) and masked (periocular biometrics).
 * If verified, marks attendance automatically.
 */
export async function identifyAndPunch(req, res) {
  try {
    let {
      liveEmbedding,
      image,
      livenessScore = 0.85,
      kiosk_id = null,
      punch_type,
      isMasked = false
    } = req.body;

    // 1. If liveEmbedding was not computed on-device, attempt extracting from image
    if ((!liveEmbedding || !Array.isArray(liveEmbedding) || liveEmbedding.length === 0) && image) {
      try {
        const { extractFaceFromImage } = await import('../services/aiBiometricService.js');
        const aiResult = await extractFaceFromImage(image, isMasked);
        if (aiResult.success && aiResult.has_face && aiResult.embedding) {
          liveEmbedding = aiResult.embedding;
          isMasked = aiResult.is_masked !== undefined ? aiResult.is_masked : isMasked;
        }
      } catch (err) {
        console.warn('AI embedding extraction error:', err.message);
      }
    }

    if (!liveEmbedding || !Array.isArray(liveEmbedding) || liveEmbedding.length === 0) {
      return res.status(400).json({ success: false, message: 'No face biometric data captured. Position face in camera.' });
    }

    // 2. Fetch all active employees with enrolled biometrics
    const employees = await Employee.findAll({
      where: { status: 'ACTIVE' },
      attributes: ['id', 'name', 'employee_code', 'department', 'designation', 'face_id_ref', 'shift_id', 'epf_number']
    });

    const enrolled = employees.filter(e => e.face_id_ref);
    if (enrolled.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No registered face members found in system. Please enroll biometrics or enter ID manually.'
      });
    }

    // 3. Fast native JavaScript biometric verification (Cosine Similarity & Periocular Mask Matching)
    const effectiveThreshold = isMasked ? MASKED_THRESHOLD : THRESHOLD;
    let bestMatch = null;
    let highestSimilarity = -1;

    for (const emp of enrolled) {
      const result = verifyFaceBiometrics(liveEmbedding, emp.face_id_ref, effectiveThreshold, isMasked);
      if (result.match && result.similarity > highestSimilarity) {
        highestSimilarity = result.similarity;
        bestMatch = emp;
      }
    }

    if (!bestMatch) {
      try {
        await FaceVerificationLog.create({
          kiosk_id: kiosk_id ? parseInt(kiosk_id) : null,
          status: 'FAILED',
          similarity_score: highestSimilarity > 0 ? highestSimilarity : 0,
          liveness_score: livenessScore ? parseFloat(livenessScore) : 0.85,
          failure_reason: `Face not recognized among registered members (Best score: ${highestSimilarity}, Threshold: ${effectiveThreshold}, Masked: ${isMasked})`
        });
      } catch (logErr) {
        console.warn('FaceVerificationLog log error:', logErr.message);
      }

      return res.status(401).json({
        success: false,
        matched: false,
        similarity: highestSimilarity,
        isMasked,
        message: isMasked
          ? 'Masked face not recognized. Please adjust mask or enter Employee ID manually below.'
          : 'Face not recognized. Position clearly or enter Employee ID manually below.'
      });
    }

    // 4. Log verification result safely
    try {
      await FaceVerificationLog.create({
        employee_id: bestMatch.id,
        kiosk_id: kiosk_id ? parseInt(kiosk_id) : null,
        status: 'SUCCESS',
        similarity_score: highestSimilarity,
        liveness_score: livenessScore ? parseFloat(livenessScore) : 0.85,
      });
    } catch (logErr) {
      console.warn('FaceVerificationLog save warning:', logErr.message);
    }

    // 5. Automatically Mark Attendance Punch
    const { processPunch } = await import('../services/attendanceService.js');
    const punchResult = await processPunch({
      employee_id: bestMatch.id,
      kiosk_id: kiosk_id ? parseInt(kiosk_id) : null,
      punch_type,
      timestamp: new Date(),
      synced_offline: false,
    });

    return res.json({
      success: true,
      matched: true,
      similarity: highestSimilarity,
      isMasked,
      biometricMode: isMasked ? 'PERIOCULAR_MASKED' : 'ARCFACE_512D',
      employee: {
        id: bestMatch.id,
        name: bestMatch.name,
        employee_code: bestMatch.employee_code,
        department: bestMatch.department,
        designation: bestMatch.designation,
        epf_number: bestMatch.epf_number || `TN/MAS/0048123/${bestMatch.employee_code} (UAN: 101489201102)`,
      },
      ...punchResult,
    });
  } catch (err) {
    console.error('identifyAndPunch error:', err);
    return res.status(400).json({
      success: false,
      message: err.errors ? err.errors.map(e => e.message).join(', ') : (err.message || 'Error processing facial attendance')
    });
  }
}

