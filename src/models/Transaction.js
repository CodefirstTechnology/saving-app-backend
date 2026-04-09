import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ENTRY_TYPES = ['credit', 'debit'];
const CATEGORIES = ['savings', 'loan_issue', 'loan_repay', 'interest', 'fine', 'other'];

const Transaction = sequelize.define(
  'Transaction',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    group_id: { type: DataTypes.UUID, allowNull: false },
    member_id: { type: DataTypes.UUID, allowNull: true },
    loan_id: { type: DataTypes.UUID, allowNull: true },
    entry_type: {
      type: DataTypes.ENUM(...ENTRY_TYPES),
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM(...CATEGORIES),
      allowNull: false,
    },
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    description_marathi: { type: DataTypes.STRING(500), allowNull: true },
    description_english: { type: DataTypes.STRING(500), allowNull: true },
    payment_mode: { type: DataTypes.ENUM('cash', 'bank'), allowNull: true },
    occurred_at: { type: DataTypes.DATEONLY, allowNull: false },
    created_by_user_id: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: 'transactions',
    indexes: [
      { fields: ['group_id'] },
      { fields: ['member_id'] },
      { fields: ['occurred_at'] },
      { fields: ['category'] },
      { name: 'tx_group_date', fields: ['group_id', 'occurred_at'] },
    ],
  }
);

export default Transaction;
export { ENTRY_TYPES, CATEGORIES };
