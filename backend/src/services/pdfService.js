import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Payroll, Employee, Shift, Attendance, SalarySlip } from '../models/index.js';
import { Op } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to convert numbers to words (Indian / International financial format)
function numberToWords(num) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(num);
  if (n === 0) return 'Zero Rupees Only';

  function convertGroup(n) {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str.trim();
  }

  let words = '';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  if (crore > 0) words += convertGroup(crore) + ' Crore ';
  if (lakh > 0) words += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) words += convertGroup(thousand) + ' Thousand ';
  if (remainder > 0) words += convertGroup(remainder);

  return (words.trim() + ' Rupees Only').replace(/\s+/g, ' ');
}

export async function generateSalarySlipPdf(payrollId) {
  const payroll = await Payroll.findByPk(payrollId, {
    include: [
      {
        model: Employee,
        as: 'employee',
        include: [{ model: Shift, as: 'shift' }]
      }
    ]
  });

  if (!payroll) {
    throw new Error('Payroll record not found');
  }

  const employee = payroll.employee;
  const monthStr = payroll.month;

  // Month date range
  const [year, month] = monthStr.split('-').map(Number);
  const startDate = `${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const attendances = await Attendance.findAll({
    where: {
      employee_id: employee.id,
      date: { [Op.between]: [startDate, endDate] }
    }
  });

  let workingDays = 0;
  let hoursWorked = 0;
  let otHours = 0;
  for (const a of attendances) {
    if (a.daily_status === 'PRESENT' || a.daily_status === 'LATE') workingDays++;
    else if (a.daily_status === 'HALF_DAY') workingDays += 0.5;
    hoursWorked += (a.hours_worked || 0);
    otHours += (a.ot_hours || 0);
  }

  const uploadDir = path.resolve(__dirname, '../../../uploads/salary-slips');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileName = `salary_slip_${employee.employee_code}_${monthStr}.pdf`;
  const filePath = path.join(uploadDir, fileName);
  const relativeUrl = `/uploads/salary-slips/${fileName}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // Company Header & Clean Corporate Branding
    doc.fillColor('#0f4c81').font('Helvetica-Bold').fontSize(20).text('SPTech Enterprises Pvt Ltd', { align: 'center' });
    doc.fillColor('#475569').font('Helvetica').fontSize(9.5).text('Industrial AI Attendance & Smart Operations Systems', { align: 'center' });
    doc.text('Tech Park Avenue, Guindy, Chennai - 600032, Tamil Nadu, India | CIN: U72900TN2024PTC158920', { align: 'center' });
    doc.moveDown(0.8);

    // Document Title Banner (Centered perfectly)
    const titleBoxY = doc.y;
    doc.rect(40, titleBoxY, 515, 26).fill('#1a73c7');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12).text(
      `CONFIDENTIAL SALARY SLIP FOR THE MONTH OF ${monthStr}`,
      40,
      titleBoxY + 7,
      { width: 515, align: 'center' }
    );

    // Employee & Attendance Info Grid (Clean two-column table)
    const startY = titleBoxY + 38;
    const gridHeight = 114;

    // Background container for Info Grid
    doc.rect(40, startY - 4, 515, gridHeight).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#0f172a').fontSize(9);

    // Left Column: Employee details
    const col1X = 50;
    const col1ValX = 145;
    const col1Width = 140;

    doc.font('Helvetica-Bold').text('Employee Name:', col1X, startY);
    doc.font('Helvetica').text(employee.name + (employee.surname ? ` ${employee.surname}` : ''), col1ValX, startY, { width: col1Width });

    doc.font('Helvetica-Bold').text('Employee ID:', col1X, startY + 18);
    doc.font('Helvetica').text(employee.employee_code, col1ValX, startY + 18, { width: col1Width });

    doc.font('Helvetica-Bold').text('Department:', col1X, startY + 36);
    doc.font('Helvetica').text(employee.department || 'Operations', col1ValX, startY + 36, { width: col1Width });

    doc.font('Helvetica-Bold').text('Designation:', col1X, startY + 54);
    doc.font('Helvetica').text(employee.designation || 'Staff', col1ValX, startY + 54, { width: col1Width });

    doc.font('Helvetica-Bold').text('Joining Date:', col1X, startY + 72);
    doc.font('Helvetica').text(employee.date_of_joining || '01-01-2024', col1ValX, startY + 72, { width: col1Width });

    doc.font('Helvetica-Bold').text('EPF / UAN No:', col1X, startY + 90);
    doc.font('Helvetica-Bold').fillColor('#0f4c81').text(
      employee.epf_number || `TN/MAS/0048123/${employee.employee_code}`,
      col1ValX,
      startY + 90,
      { width: col1Width + 10 }
    );
    doc.fillColor('#0f172a');

    // Right Column: Attendance & Shift Info
    const col2X = 310;
    const col2ValX = 425;
    const col2Width = 120;

    doc.font('Helvetica-Bold').text('Working Days:', col2X, startY);
    doc.font('Helvetica').text(`${workingDays} Days`, col2ValX, startY, { width: col2Width, align: 'right' });

    doc.font('Helvetica-Bold').text('Hours Worked:', col2X, startY + 18);
    doc.font('Helvetica').text(`${hoursWorked.toFixed(2)} Hrs`, col2ValX, startY + 18, { width: col2Width, align: 'right' });

    doc.font('Helvetica-Bold').text('Overtime Hours:', col2X, startY + 36);
    doc.font('Helvetica').text(`${otHours.toFixed(2)} Hrs`, col2ValX, startY + 36, { width: col2Width, align: 'right' });

    doc.font('Helvetica-Bold').text('Assigned Shift:', col2X, startY + 54);
    doc.font('Helvetica').text(employee.shift ? employee.shift.shift_name : 'General Shift', col2ValX, startY + 54, { width: col2Width, align: 'right' });

    doc.font('Helvetica-Bold').text('Hourly Base Rate:', col2X, startY + 72);
    doc.font('Helvetica').text(`₹${(employee.salary_per_hour || 150).toFixed(2)} / hr`, col2ValX, startY + 72, { width: col2Width, align: 'right' });

    doc.font('Helvetica-Bold').text('EPF Scheme:', col2X, startY + 90);
    doc.font('Helvetica-Bold').fillColor('#16a34a').text('Statutory Active (12%)', col2ValX, startY + 90, { width: col2Width, align: 'right' });
    doc.fillColor('#0f172a');

    // Earnings and Deductions Table
    const tableTop = startY + gridHeight + 14;

    // Header Blocks
    doc.rect(40, tableTop, 255, 22).fillAndStroke('#e2e8f0', '#cbd5e1');
    doc.rect(295, tableTop, 260, 22).fillAndStroke('#e2e8f0', '#cbd5e1');

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5);
    doc.text('EARNINGS', 48, tableTop + 6, { width: 140 });
    doc.text('AMOUNT (₹)', 195, tableTop + 6, { width: 90, align: 'right' });
    doc.text('STATUTORY DEDUCTIONS', 305, tableTop + 6, { width: 150 });
    doc.text('AMOUNT (₹)', 455, tableTop + 6, { width: 90, align: 'right' });

    let rowY = tableTop + 28;
    doc.font('Helvetica').fontSize(9).fillColor('#334155');

    const epfAmt = (payroll.epf_deduction || Math.round(payroll.base_pay * 0.12 * 100) / 100);
    const grossEarnings = (payroll.base_pay || 0) + (payroll.ot_pay || 0) + (payroll.incentive || 0) + (payroll.benefits || 0);
    const totalDeductions = epfAmt + (payroll.advance_settled || 0) + (payroll.deductions || 0);

    // Row 1: Base Pay & Employee EPF (12%)
    doc.text('Base Pay (Working Hours)', 48, rowY, { width: 140 });
    doc.text(`₹${payroll.base_pay.toFixed(2)}`, 195, rowY, { width: 90, align: 'right' });
    doc.font('Helvetica-Bold').text('EPF (Employee 12% Deduction)', 305, rowY, { width: 150 });
    doc.font('Helvetica-Bold').text(`₹${epfAmt.toFixed(2)}`, 455, rowY, { width: 90, align: 'right' });
    doc.font('Helvetica');

    // Row 2: OT Pay & Advance Settlement
    rowY += 19;
    doc.text('Overtime (OT) Pay', 48, rowY, { width: 140 });
    doc.text(`₹${payroll.ot_pay.toFixed(2)}`, 195, rowY, { width: 90, align: 'right' });
    doc.text('Advance Settled', 305, rowY, { width: 150 });
    doc.text(`₹${(payroll.advance_settled || 0).toFixed(2)}`, 455, rowY, { width: 90, align: 'right' });

    // Row 3: Incentive & Other Deductions
    rowY += 19;
    doc.text('Performance Incentive', 48, rowY, { width: 140 });
    doc.text(`₹${(payroll.incentive || 0).toFixed(2)}`, 195, rowY, { width: 90, align: 'right' });
    doc.text('Other Deductions / LOP', 305, rowY, { width: 150 });
    doc.text(`₹${(payroll.deductions || 0).toFixed(2)}`, 455, rowY, { width: 90, align: 'right' });

    // Row 4: Allowances & Employer EPF Info
    rowY += 19;
    doc.text('Special Allowances', 48, rowY, { width: 140 });
    doc.text(`₹${(payroll.benefits || 0).toFixed(2)}`, 195, rowY, { width: 90, align: 'right' });
    doc.font('Helvetica-Oblique').text('Employer EPF Match (12% Statutory)', 305, rowY, { width: 150 });
    doc.font('Helvetica-Oblique').text(`₹${epfAmt.toFixed(2)}`, 455, rowY, { width: 90, align: 'right' });
    doc.font('Helvetica');

    // Row 5: Column Subtotals
    rowY += 21;
    doc.rect(40, rowY, 255, 20).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.rect(295, rowY, 260, 20).fillAndStroke('#f1f5f9', '#cbd5e1');

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');
    doc.text('Total Gross Earnings:', 48, rowY + 5, { width: 140 });
    doc.text(`₹${grossEarnings.toFixed(2)}`, 195, rowY + 5, { width: 90, align: 'right' });
    doc.text('Total Deductions (incl. EPF):', 305, rowY + 5, { width: 150 });
    doc.text(`₹${totalDeductions.toFixed(2)}`, 455, rowY + 5, { width: 90, align: 'right' });

    // Summary Box: Net Salary Payable (Crisp rounded box)
    rowY += 28;
    doc.rect(40, rowY, 515, 30).fillAndStroke('#0f4c81', '#0f4c81');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11);
    doc.text('NET SALARY PAYABLE:', 50, rowY + 9);
    doc.fontSize(13).text(`₹${payroll.total_salary.toFixed(2)}`, 350, rowY + 8, { width: 195, align: 'right' });

    // Amount in Words
    rowY += 38;
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#334155');
    doc.text('Amount in words: ', 45, rowY, { continued: true });
    doc.font('Helvetica').text(numberToWords(payroll.total_salary));

    rowY += 16;
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#64748b');
    doc.text('* Statutory Note: EPF (Employees\' Provident Fund) contributions are deducted under Section 6 of EPF & MP Act 1952 and remitted directly to EPFO India.', 45, rowY, { width: 510 });

    // Signatures footer (Fixed at bottom)
    const signY = 720;
    doc.moveTo(60, signY).lineTo(200, signY).strokeColor('#94a3b8').stroke();
    doc.moveTo(355, signY).lineTo(495, signY).strokeColor('#94a3b8').stroke();

    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text('Employee Signature', 60, signY + 6, { width: 140, align: 'center' });
    doc.text('Authorized Signatory', 355, signY + 6, { width: 140, align: 'center' });

    doc.fontSize(7.5).fillColor('#94a3b8').text(
      'This is a system-generated electronic payslip verified by SPTech Biometric & Attendance Engine.',
      40,
      765,
      { width: 515, align: 'center' }
    );

    doc.end();

    writeStream.on('finish', async () => {
      // Upsert SalarySlip record
      let slip = await SalarySlip.findOne({ where: { payroll_id: payroll.id } });
      if (!slip) {
        slip = await SalarySlip.create({
          payroll_id: payroll.id,
          pdf_url: relativeUrl,
          generated_on: new Date(),
        });
      } else {
        slip.pdf_url = relativeUrl;
        slip.generated_on = new Date();
        await slip.save();
      }
      resolve(slip);
    });

    writeStream.on('error', (err) => {
      reject(err);
    });
  });
}
