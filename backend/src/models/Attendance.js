import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  kiosk_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  shift_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  morning_in_punch: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lunch_out_punch: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lunch_in_punch: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  evening_out_punch: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  hours_worked: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  ot_hours: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  daily_status: {
    type: DataTypes.STRING, // PRESENT, LATE, HALF_DAY, ABSENT, LEAVE, HOLIDAY, WEEKLY_OFF
    allowNull: false,
    defaultValue: 'PRESENT',
  },
  synced_offline: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  offline_txn_id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  is_overridden: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  override_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  overridden_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
}, {
  tableName: 'attendances',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['employee_id', 'date']
    }
  ]
});

export default Attendance;
