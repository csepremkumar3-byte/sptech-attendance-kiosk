import bcrypt from 'bcryptjs';
import { Employee, Shift, SalaryHistory } from '../models/index.js';
import { logAudit } from '../services/auditService.js';

export async function getAllEmployees(req, res) {
  try {
    const employees = await Employee.findAll({
      include: [{ model: Shift, as: 'shift' }],
      attributes: { exclude: ['password_hash', 'face_id_ref'] },
      order: [['id', 'DESC']]
    });

    // Append biometric status flag
    const results = await Promise.all(employees.map(async (emp) => {
      const full = await Employee.findByPk(emp.id, { attributes: ['face_id_ref'] });
      return {
        ...emp.toJSON(),
        has_face_enrolled: Boolean(full?.face_id_ref)
      };
    }));

    return res.json({ success: true, employees: results });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getEmployeeById(req, res) {
  try {
    const emp = await Employee.findByPk(req.params.id, {
      include: [{ model: Shift, as: 'shift' }],
      attributes: { exclude: ['password_hash', 'face_id_ref'] }
    });
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    const full = await Employee.findByPk(emp.id, { attributes: ['face_id_ref'] });
    return res.json({
      success: true,
      employee: {
        ...emp.toJSON(),
        has_face_enrolled: Boolean(full?.face_id_ref)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getEmployeeByCode(req, res) {
  try {
    const { code } = req.params;
    const emp = await Employee.findOne({
      where: { employee_code: code },
      include: [{ model: Shift, as: 'shift' }],
      attributes: { exclude: ['password_hash', 'face_id_ref'] }
    });

    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee code not found' });
    }

    const full = await Employee.findByPk(emp.id, { attributes: ['face_id_ref'] });

    return res.json({
      success: true,
      employee: {
        ...emp.toJSON(),
        has_face_enrolled: Boolean(full?.face_id_ref)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createEmployee(req, res) {
  try {
    const {
      name,
      employee_code,
      password,
      shift_id,
      salary_per_hour,
      date_of_joining,
      status = 'ACTIVE',
      department = 'Operations',
      designation = 'Staff',
      email,
      phone,
      epf_number,
      surname,
      dob,
      address,
      govt_id_no,
      bank_name,
      bank_acc_no,
      bank_acc_holder,
      bank_ifsc,
      blood_group,
      emergency_name,
      emergency_phone,
      emergency_address,
      emergency_relationship,
      education_details,
      previous_experience,
    } = req.body;

    if (!name || !employee_code) {
      return res.status(400).json({ success: false, message: 'Name and Employee Code are required' });
    }

    const existing = await Employee.findOne({ where: { employee_code } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Employee Code is already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password || 'password123', salt);

    let face_id_ref = req.body.face_id_ref || null;
    if (req.body.embedding && (Array.isArray(req.body.embedding) ? req.body.embedding.length > 0 : Boolean(req.body.embedding))) {
      face_id_ref = typeof req.body.embedding === 'string' ? req.body.embedding : JSON.stringify(req.body.embedding);
    } else if (req.body.image) {
      try {
        const { extractFaceFromImage } = await import('../services/aiBiometricService.js');
        const aiResult = await extractFaceFromImage(req.body.image);
        if (aiResult.success && aiResult.has_face && aiResult.embedding) {
          face_id_ref = JSON.stringify(aiResult.embedding);
        }
      } catch (e) {
        console.warn('AI embedding extraction error during create:', e);
      }
    }

    const employee = await Employee.create({
      name,
      employee_code,
      password_hash,
      face_id_ref,
      shift_id: shift_id ? parseInt(shift_id) : null,
      salary_per_hour: salary_per_hour ? parseFloat(salary_per_hour) : 150.0,
      date_of_joining: date_of_joining || new Date().toISOString().split('T')[0],
      status,
      department,
      designation,
      email,
      phone,
      epf_number: epf_number || `TN/MAS/0048123/${employee_code}`,
      surname,
      dob,
      address,
      govt_id_no,
      bank_name,
      bank_acc_no,
      bank_acc_holder,
      bank_ifsc,
      blood_group,
      emergency_name,
      emergency_phone,
      emergency_address,
      emergency_relationship,
      education_details,
      previous_experience,
    });

    // Record initial salary history entry (1-year standard period)
    const joinDate = employee.date_of_joining || new Date().toISOString().split('T')[0];
    const initialToDate = new Date(joinDate);
    initialToDate.setFullYear(initialToDate.getFullYear() + 1);

    await SalaryHistory.create({
      employee_id: employee.id,
      revised_by: req.user?.id || 1,
      old_rate: 0,
      new_rate: employee.salary_per_hour,
      effective_from: joinDate,
      effective_to: initialToDate.toISOString().split('T')[0],
      reason: 'Initial onboarding salary configuration'
    });

    await logAudit({
      admin_id: req.user?.id,
      action: 'CREATE_EMPLOYEE',
      module: 'EMPLOYEE',
      record_id: employee.id,
      new_value: { name, employee_code, department, designation, salary_per_hour },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: {
        id: employee.id,
        name: employee.name,
        employee_code: employee.employee_code,
        status: employee.status,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateEmployee(req, res) {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const oldData = employee.toJSON();
    const {
      name,
      shift_id,
      salary_per_hour,
      status,
      department,
      designation,
      email,
      phone,
      password,
      salary_revision_reason,
    } = req.body;

    // Check if salary changed
    if (salary_per_hour !== undefined && parseFloat(salary_per_hour) !== employee.salary_per_hour) {
      const oldRate = employee.salary_per_hour;
      const newRate = parseFloat(salary_per_hour);
      const fromDate = new Date().toISOString().split('T')[0];
      const toDateObj = new Date(fromDate);
      toDateObj.setFullYear(toDateObj.getFullYear() + 1);

      await SalaryHistory.create({
        employee_id: employee.id,
        revised_by: req.user?.id || 1,
        old_rate: oldRate,
        new_rate: newRate,
        effective_from: fromDate,
        effective_to: toDateObj.toISOString().split('T')[0],
        reason: salary_revision_reason || 'Administrative salary rate revision',
      });

      employee.salary_per_hour = newRate;
    }

    if (name) employee.name = name;
    if (shift_id !== undefined) employee.shift_id = shift_id ? parseInt(shift_id) : null;
    if (status) employee.status = status;
    if (department) employee.department = department;
    if (designation) employee.designation = designation;
    if (email !== undefined) employee.email = email;
    if (phone !== undefined) employee.phone = phone;
    if (req.body.epf_number !== undefined) employee.epf_number = req.body.epf_number;
    if (req.body.surname !== undefined) employee.surname = req.body.surname;
    if (req.body.dob !== undefined) employee.dob = req.body.dob;
    if (req.body.address !== undefined) employee.address = req.body.address;
    if (req.body.govt_id_no !== undefined) employee.govt_id_no = req.body.govt_id_no;
    if (req.body.bank_name !== undefined) employee.bank_name = req.body.bank_name;
    if (req.body.bank_acc_no !== undefined) employee.bank_acc_no = req.body.bank_acc_no;
    if (req.body.bank_acc_holder !== undefined) employee.bank_acc_holder = req.body.bank_acc_holder;
    if (req.body.bank_ifsc !== undefined) employee.bank_ifsc = req.body.bank_ifsc;
    if (req.body.blood_group !== undefined) employee.blood_group = req.body.blood_group;
    if (req.body.emergency_name !== undefined) employee.emergency_name = req.body.emergency_name;
    if (req.body.emergency_phone !== undefined) employee.emergency_phone = req.body.emergency_phone;
    if (req.body.emergency_address !== undefined) employee.emergency_address = req.body.emergency_address;
    if (req.body.emergency_relationship !== undefined) employee.emergency_relationship = req.body.emergency_relationship;
    if (req.body.education_details !== undefined) employee.education_details = req.body.education_details;
    if (req.body.previous_experience !== undefined) employee.previous_experience = req.body.previous_experience;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      employee.password_hash = await bcrypt.hash(password, salt);
    }

    await employee.save();

    await logAudit({
      admin_id: req.user?.id,
      action: 'UPDATE_EMPLOYEE',
      module: 'EMPLOYEE',
      record_id: employee.id,
      old_value: oldData,
      new_value: employee.toJSON(),
      req,
    });

    return res.json({
      success: true,
      message: 'Employee updated successfully',
      employee: {
        id: employee.id,
        name: employee.name,
        employee_code: employee.employee_code,
        status: employee.status,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Register/Enroll Face Biometric Template
 * Section 4 & 6: Camera-based enrollment, multiple frames, stores biometric template into face_id_ref
 */
export async function enrollFace(req, res) {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const { embedding, image, qualityScore = 0.95 } = req.body;
    let targetEmbedding = embedding;

    // 1. Save Profile Photo to persistent storage (S3 or local uploads)
    if (image) {
      try {
        const { saveProfilePhoto } = await import('../services/photoStorageService.js');
        const photoUrl = await saveProfilePhoto(employee.id, image);
        if (photoUrl) {
          employee.profile_photo = photoUrl;
        }
      } catch (photoErr) {
        console.warn('Profile photo storage warning:', photoErr.message);
      }

      // 2. Index face in AWS Rekognition Collection if AWS is configured
      try {
        const { isRekognitionConfigured, indexEmployeeFace } = await import('../services/awsRekognitionService.js');
        if (isRekognitionConfigured()) {
          const rekResult = await indexEmployeeFace(employee.id, image, employee.rekognition_face_id);
          if (rekResult && rekResult.faceId) {
            employee.rekognition_face_id = rekResult.faceId;
            console.log(`✓ Indexed face in AWS Rekognition for ${employee.name}: ${rekResult.faceId}`);
          }
        }
      } catch (rekErr) {
        console.warn('AWS Rekognition indexing fallback:', rekErr.message);
      }
    }

    // 3. Fallback on-device embedding if provided
    if (targetEmbedding && Array.isArray(targetEmbedding) && targetEmbedding.length >= 10) {
      employee.face_id_ref = JSON.stringify(targetEmbedding);
    } else if (image && !employee.rekognition_face_id && !employee.face_id_ref) {
      // Store dummy reference marker if only photo is enrolled
      employee.face_id_ref = JSON.stringify({ enrolledViaPhoto: true, timestamp: Date.now() });
    }

    await employee.save();

    await logAudit({
      admin_id: req.user?.id,
      action: 'FACE_ENROLLMENT',
      module: 'BIOMETRIC',
      record_id: employee.id,
      new_value: {
        enrolled: true,
        hasAwsRekognition: Boolean(employee.rekognition_face_id),
        hasProfilePhoto: Boolean(employee.profile_photo),
      },
      req,
    });

    return res.json({
      success: true,
      message: `Face biometrics registered successfully for ${employee.name}${employee.rekognition_face_id ? ' (AWS Rekognition Active)' : ''}`,
      profile_photo: employee.profile_photo,
      rekognition_face_id: employee.rekognition_face_id,
      dimensions: targetEmbedding ? targetEmbedding.length : 512,
      model: employee.rekognition_face_id ? 'AWS Rekognition Collection' : 'On-Device Dynamic Biometrics',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
