import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  employee_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  face_id_ref: {
    type: DataTypes.TEXT, // Stored biometric reference / embedding JSON string
    allowNull: true,
  },
  profile_photo: {
    type: DataTypes.TEXT, // URL or path to stored profile picture
    allowNull: true,
  },
  rekognition_face_id: {
    type: DataTypes.STRING, // AWS Rekognition FaceId in the collection
    allowNull: true,
  },
  shift_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  salary_per_hour: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 150.0,
  },
  date_of_joining: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING, // 'ACTIVE', 'INACTIVE'
    allowNull: false,
    defaultValue: 'ACTIVE',
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Operations',
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Associate',
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  epf_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Fields from Image 3 template
  surname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  govt_id_no: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bank_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bank_acc_no: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bank_acc_holder: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bank_ifsc: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  blood_group: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emergency_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emergency_phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emergency_address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  emergency_relationship: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  education_details: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  previous_experience: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'employees',
  timestamps: true,
});

export default Employee;
