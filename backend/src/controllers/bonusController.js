import { calculateRangeBonus } from '../services/bonusService.js';
import { logAudit } from '../services/auditService.js';

export async function calculateBonus(req, res) {
  try {
    let {
      startMonth = '2025-11',
      endMonth = '2026-10',
      percentage = 8.33,
      incentive = 0,
      employeeId,
    } = req.query;

    if (!startMonth) startMonth = '2025-11';
    if (!endMonth) endMonth = '2026-10';

    if (!/^\d{4}-\d{2}$/.test(startMonth) || !/^\d{4}-\d{2}$/.test(endMonth)) {
      startMonth = '2025-11';
      endMonth = '2026-10';
    }

    const report = await calculateRangeBonus({
      startMonth,
      endMonth,
      bonusPercentage: parseFloat(percentage) || 8.33,
      bonusIncentive: parseFloat(incentive) || 0,
      employeeId: employeeId ? parseInt(employeeId) : null,
    });

    if (req.user) {
      await logAudit({
        admin_id: req.user.id,
        action: 'CALCULATE_BONUS',
        module: 'PAYROLL',
        new_value: {
          startMonth,
          endMonth,
          percentage: report.config.bonusPercentage,
          incentive: report.config.bonusIncentive,
          totalBonusPayable: report.companyTotals.totalBonusPayable,
        },
        req,
      });
    }

    return res.json({
      success: true,
      data: report,
      ...report,
    });
  } catch (err) {
    console.error('Bonus calculation error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function exportBonusCsv(req, res) {
  try {
    let {
      startMonth = '2025-11',
      endMonth = '2026-10',
      percentage = 8.33,
      incentive = 0,
    } = req.query;

    if (!startMonth) startMonth = '2025-11';
    if (!endMonth) endMonth = '2026-10';

    const report = await calculateRangeBonus({
      startMonth,
      endMonth,
      bonusPercentage: parseFloat(percentage) || 8.33,
      bonusIncentive: parseFloat(incentive) || 0,
    });

    // Generate clean CSV
    const rows = [];
    rows.push(['SPTech Enterprises Pvt Ltd - Bonus Statement']);
    rows.push([`Period: ${report.period.startLabel} to ${report.period.endLabel} (${report.period.totalMonths} Months)`]);
    rows.push([`Bonus Rate: ${report.config.bonusPercentage}% | Additional Incentive: ₹${report.config.bonusIncentive} | Rule: OT Excluded`]);
    rows.push([]);

    // Headers
    rows.push([
      'Employee Code',
      'Employee Name',
      'Department',
      'Days Worked',
      'Total Base Salary (₹) [Eligible]',
      'OT Salary (₹) [Excluded]',
      'Gross Total (₹)',
      'Bonus %',
      'Calculated Bonus (₹)',
      'Bonus Incentive (₹)',
      'Net Bonus Payable (₹)'
    ]);

    for (const r of report.employees) {
      rows.push([
        r.employee.employee_code,
        `"${r.employee.name}"`,
        r.employee.department,
        r.summary.totalDaysWorked,
        r.summary.totalEligibleSalary.toFixed(2),
        r.summary.totalOtSalary.toFixed(2),
        r.summary.totalGrossEarnings.toFixed(2),
        `${r.summary.bonusPercentage}%`,
        r.summary.bonusFromBase.toFixed(2),
        r.summary.bonusIncentive.toFixed(2),
        r.summary.netBonusPayable.toFixed(2),
      ]);
    }

    rows.push([]);
    rows.push([
      'TOTAL',
      '',
      '',
      '',
      report.companyTotals.totalEligibleSalary.toFixed(2),
      report.companyTotals.totalOtExcluded.toFixed(2),
      '',
      '',
      '',
      '',
      report.companyTotals.totalBonusPayable.toFixed(2)
    ]);

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const fileName = `SPTech_Bonus_${startMonth}_to_${endMonth}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('Export bonus error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
