import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LeaveType = sequelize.define('LeaveType', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  annual_limit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 12,
  },
  is_paid: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  status: {
    type: DataTypes.STRING, // 'ACTIVE', 'INACTIVE'
    allowNull: false,
    defaultValue: 'ACTIVE',
  }
}, {
  tableName: 'leave_types',
  timestamps: true,
});

export default LeaveType;
