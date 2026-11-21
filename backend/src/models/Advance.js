import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Advance = sequelize.define('Advance', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  recorded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  date_given: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING, // 'PENDING', 'SETTLED'
    allowNull: false,
    defaultValue: 'PENDING',
  },
  settled_in_payroll_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
}, {
  tableName: 'advances',
  timestamps: true,
});

export default Advance;
