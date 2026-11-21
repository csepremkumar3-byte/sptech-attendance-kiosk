import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SalaryHistory = sequelize.define('SalaryHistory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  revised_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  old_rate: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  new_rate: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  effective_from: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  effective_to: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'salary_histories',
  timestamps: true,
});

export default SalaryHistory;
