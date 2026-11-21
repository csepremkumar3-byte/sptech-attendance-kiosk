import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  module: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  record_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  old_value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  new_value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});

export default AuditLog;
