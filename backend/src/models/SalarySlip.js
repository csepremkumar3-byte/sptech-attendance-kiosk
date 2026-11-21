import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SalarySlip = sequelize.define('SalarySlip', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  payroll_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  pdf_url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  generated_on: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'salary_slips',
  timestamps: true,
});

export default SalarySlip;
