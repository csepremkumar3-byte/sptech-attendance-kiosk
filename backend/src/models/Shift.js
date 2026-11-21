import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Shift = sequelize.define('Shift', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  shift_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  morning_in: {
    type: DataTypes.STRING, // e.g. "09:00:00"
    allowNull: false,
  },
  lunch_out: {
    type: DataTypes.STRING, // e.g. "13:00:00"
    allowNull: false,
  },
  lunch_in: {
    type: DataTypes.STRING, // e.g. "14:00:00"
    allowNull: false,
  },
  evening_out: {
    type: DataTypes.STRING, // e.g. "18:00:00"
    allowNull: false,
  },
  ot_rate_multiplier: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.5,
  },
}, {
  tableName: 'shifts',
  timestamps: true,
});

export default Shift;
