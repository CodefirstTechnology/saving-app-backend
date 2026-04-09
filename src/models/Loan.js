import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LOAN_STATUSES = ['pending', 'active', 'paid', 'overdue', 'rejected'];

const Loan = sequelize.define(
  'Loan',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    group_id: { type: DataTypes.UUID, allowNull: false },
    member_id: { type: DataTypes.UUID, allowNull: false },
    reference_code: { type: DataTypes.STRING(32), allowNull: true },
    principal: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    interest_rate_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    term_months: { type: DataTypes.INTEGER, allowNull: false },
    outstanding_balance: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    status: {
      type: DataTypes.ENUM(...LOAN_STATUSES),
      allowNull: false,
      defaultValue: 'pending',
    },
    issued_at: { type: DataTypes.DATEONLY, allowNull: true },
    due_at: { type: DataTypes.DATEONLY, allowNull: true },
    reason: { type: DataTypes.TEXT, allowNull: true },
    emi_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    suggested_tier: { type: DataTypes.STRING(16), allowNull: true },
    installments_paid: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    next_due_date: { type: DataTypes.DATEONLY, allowNull: true },
    reject_reason: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'loans',
    indexes: [
      { fields: ['group_id'] },
      { fields: ['member_id'] },
      { fields: ['status'] },
      { unique: true, fields: ['group_id', 'reference_code'], name: 'loans_group_ref_unique' },
    ],
  }
);

export default Loan;
export { LOAN_STATUSES };
