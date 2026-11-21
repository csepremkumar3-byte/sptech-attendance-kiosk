# SPTech AI Attendance Kiosk & Payroll PWA

A full-stack, enterprise-grade **AI-Based Employee Attendance Kiosk and Payroll Progressive Web Application (PWA)** built strictly adhering to the SPTech Database Schema and Business Specifications.

---

## 🚀 Key Features

### 1. AI Face Recognition & Kiosk Attendance (`/kiosk`)
- **Web Camera & Anti-Spoofing:** Live video capture with positioning reticle, laser scanner animation, and physiological micro-motion liveness verification.
- **Biometric Matching:** Computes 128-dimensional biometric embedding vectors and validates them securely via Euclidean distance and Cosine similarity.
- **Sequential 4-Punch Workflow:**
  1. *Morning In*
  2. *Lunch Out*
  3. *Lunch In*
  4. *Evening Out*
- **Offline Attendance (IndexedDB):** If connectivity drops, attendance events are queued locally with unique idempotence IDs and automatically synchronized to the MySQL/SQLite database upon restoration.
- **Mobile Responsive & Installable PWA:** Operates seamlessly on mobile phones, tablets, or desktop kiosk terminals.

### 2. Admin Management Portal (`/admin`)
- **Executive Dashboard:** Live KPI cards for Total Employees, Present Today, Absent Today, Late Today, On Leave, Overtime Today, Active Kiosks, and Current Month Payroll Total, plus 7-day attendance trend charts.
- **Employee Directory:** Manage staff, assign shifts, configure hourly rates, and initiate camera-based face enrollment.
- **4-Punch Attendance Log & Overrides:** Real-time visibility into daily punches, hours worked, OT hours, and manual HR overrides requiring mandatory justification and audit logging.
- **Kiosk Terminals:** Register kiosk devices, set locations (e.g. Main Reception, Production Block B), and toggle active/inactive states.
- **Shift & Overtime Configuration:** Morning in, lunch out/in, evening out, and overtime rate multipliers (e.g. 1.5x).
- **Leave Management:** Leave types, employee balances, and administrative approval/rejection workflows that automatically update attendance records.
- **Employee Advances:** Track cash advances and automatically deduct/settle them against monthly payroll.
- **Monthly Payroll Processing (`YYYY-MM`):** Automatic calculation of base pay from hours worked, overtime pay, advance deductions, and locked finalization.
- **Official PDF Salary Slips:** Instant generation of professional PDF salary slips via PDFKit with company branding, working hours, and Net Salary converted to words.
- **Immutable Security & Audit Trail:** Automatic audit records for employee changes, face enrollments, attendance overrides, salary revisions, and payroll locks.

### 3. Employee Self-Service (`/employee`)
- Today's punch status and timestamp receipt.
- Historical attendance records and hours worked.
- Leave application, balance tracking, and approval status.
- Monthly salary breakdowns and one-click PDF salary slip downloads.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, PWA Service Worker, IndexedDB (`idb`), Canvas Confetti, Lucide Icons |
| **Backend** | Node.js, Express.js (ESM), Sequelize ORM, JWT, Bcrypt.js, Helmet, CORS, PDFKit, Rate Limiting |
| **Database** | MySQL (with SQLite default out-of-the-box support for zero setup friction) |
| **AI / Biometrics** | Modular facial feature extraction, 128-dimensional embedding generation, anti-spoofing liveness scoring, and server verification tokens |

---

## ⚙️ Quick Start

### 1. Backend Server
```bash
cd backend
npm install
npm start
```
*Backend runs on `http://localhost:5000` with automated table synchronization and initial seeding.*

### 2. Frontend Development Server
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000` (and is network accessible for mobile/tablet kiosks).*

---

## 🔑 Pre-Configured Demo Credentials

| Role | Identifier / Username | Password |
|---|---|---|
| **Administrator** | `admin` | `admin123` |
| **Employee 1** | `EMP001` (John Doe) | `emp123` |
| **Employee 2** | `EMP002` (Jane Smith) | `emp123` |

---

## 🗄️ Database Schema & Entities

- **`admins`**: `id`, `username`, `password_hash`, `name`
- **`shifts`**: `id`, `shift_name`, `morning_in`, `lunch_out`, `lunch_in`, `evening_out`, `ot_rate_multiplier`
- **`kiosks`**: `id`, `device_name`, `location`, `is_active`, `last_synced_at`
- **`employees`**: `id`, `name`, `employee_code`, `password_hash`, `face_id_ref`, `shift_id`, `salary_per_hour`, `date_of_joining`, `status`, `department`, `designation`
- **`attendances`**: `id`, `employee_id`, `kiosk_id`, `shift_id`, `date`, `morning_in_punch`, `lunch_out_punch`, `lunch_in_punch`, `evening_out_punch`, `hours_worked`, `ot_hours`, `daily_status`, `synced_offline`, `offline_txn_id`, `is_overridden`, `override_reason`, `overridden_by`
- **`advances`**: `id`, `employee_id`, `recorded_by`, `amount`, `date_given`, `note`, `status`, `settled_in_payroll_id`
- **`salary_histories`**: `id`, `employee_id`, `revised_by`, `old_rate`, `new_rate`, `effective_from`, `reason`
- **`payrolls`**: `id`, `employee_id`, `finalized_by`, `month`, `base_pay`, `ot_pay`, `incentive`, `benefits`, `deductions`, `advance_settled`, `total_salary`, `is_locked`
- **`salary_slips`**: `id`, `payroll_id`, `pdf_url`, `generated_on`
- **`leave_types`**: `id`, `name`, `description`, `annual_limit`, `is_paid`, `status`
- **`leave_balances`**: `id`, `employee_id`, `leave_type_id`, `year`, `allocated`, `used`, `remaining`
- **`leave_requests`**: `id`, `employee_id`, `leave_type_id`, `from_date`, `to_date`, `number_of_days`, `reason`, `status`, `approved_by`, `approved_at`
- **`audit_logs`**: `id`, `admin_id`, `action`, `module`, `record_id`, `old_value`, `new_value`, `created_at`, `ip_address`
- **`face_verification_logs`**: `id`, `employee_id`, `kiosk_id`, `status`, `similarity_score`, `liveness_score`, `failure_reason`
