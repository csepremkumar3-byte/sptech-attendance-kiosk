import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FaceVerificationLog = sequelize.define('FaceVerificationLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  kiosk_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING, // 'SUCCESS', 'FAILED'
    allowNull: false,
  },
  similarity_score: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  liveness_score: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  failure_reason: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'face_verification_logs',
  timestamps: true,
});

export default FaceVerificationLog;
