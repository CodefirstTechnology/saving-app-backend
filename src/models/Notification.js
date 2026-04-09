import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Notification = sequelize.define(
  'Notification',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    category: { type: DataTypes.STRING(64), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    payload: { type: DataTypes.JSON, allowNull: true },
    read_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'notifications',
    indexes: [
      { fields: ['user_id'] },
      { name: 'notifications_user_read', fields: ['user_id', 'read_at'] },
    ],
  }
);

export default Notification;
