import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

const RefreshToken = sequelize.define(
  'RefreshToken',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: User, key: 'id' },
    },
    token_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    device_id: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'refresh_tokens',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at',
  }
);

User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default RefreshToken;
