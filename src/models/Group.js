import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Group = sequelize.define(
  'Group',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name_marathi: { type: DataTypes.STRING(255), allowNull: false },
    name_english: { type: DataTypes.STRING(255), allowNull: false },
    /** Monthly loan interest % (flat on principal in current EMI model). */
    loan_interest_rate_monthly_percent: {
      type: DataTypes.DECIMAL(6, 3),
      allowNull: false,
      defaultValue: 1.5,
    },
    max_members: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50 },
    contribution_cycle_type: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'monthly',
    },
    /** When contribution_cycle_type is `custom`, interval in days. */
    contribution_cycle_days: { type: DataTypes.INTEGER, allowNull: true },
    creator_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
  },
  { tableName: 'groups' }
);

export default Group;
