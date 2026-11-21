import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Kiosk = sequelize.define('Kiosk', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  device_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  last_synced_at: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  tableName: 'kiosks',
  timestamps: true,
});

export default Kiosk;
