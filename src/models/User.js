import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { ROLE_VALUES } from '../constants/roles.js';

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    mobile_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'user',
      validate: {
        isIn: [ROLE_VALUES], // Sequelize expects [allowedValues]
      },
    },
    group_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    member_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    town: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    pincode: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
  },
  {
    tableName: 'users',
    indexes: [
      { fields: ['email'] },
      {
        unique: true,
        fields: ['mobile_number', 'group_id'],
        name: 'users_mobile_number_group_id_unique',
      },
      { fields: ['group_id'] },
      { fields: ['role'] },
    ],
  }
);

export default User;
export { ROLE_VALUES as USER_ROLE_VALUES };
