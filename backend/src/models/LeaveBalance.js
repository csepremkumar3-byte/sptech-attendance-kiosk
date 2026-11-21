import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LeaveBalance = sequelize.define('LeaveBalance', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  leave_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  allocated: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 12.0,
  },
  used: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  remaining: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 12.0,
  }
}, {
  tableName: 'leave_balances',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['employee_id', 'leave_type_id', 'year']
    }
  ]
});

export default LeaveBalance;
