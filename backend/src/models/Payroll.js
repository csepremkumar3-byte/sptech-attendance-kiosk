import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Payroll = sequelize.define('Payroll', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  finalized_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  month: {
    type: DataTypes.STRING, // Format: YYYY-MM
    allowNull: false,
  },
  base_pay: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  ot_pay: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  incentive: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  benefits: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  deductions: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  epf_deduction: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  advance_settled: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  total_salary: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  is_locked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  }
}, {
  tableName: 'payrolls',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['employee_id', 'month']
    }
  ]
});

export default Payroll;
