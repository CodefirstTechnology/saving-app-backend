import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Member = sequelize.define(
  'Member',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    group_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: true },
    name_marathi: { type: DataTypes.STRING(255), allowNull: false },
    name_english: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(32), allowNull: true },
    savings_balance: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    missed_payments_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    fines_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'members',
    indexes: [
      { fields: ['group_id'] },
      { fields: ['phone'] },
      { name: 'members_group_phone', fields: ['group_id', 'phone'] },
    ],
  }
);

export default Member;
