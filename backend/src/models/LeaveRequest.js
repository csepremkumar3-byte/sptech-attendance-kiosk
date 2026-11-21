import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LeaveRequest = sequelize.define('LeaveRequest', {
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
  from_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  to_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  number_of_days: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING, // 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
    allowNull: false,
    defaultValue: 'PENDING',
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  tableName: 'leave_requests',
  timestamps: true,
});

export default LeaveRequest;
