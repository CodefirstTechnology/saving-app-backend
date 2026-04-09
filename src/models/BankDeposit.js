import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DEPOSIT_METHODS = ['cash', 'upi', 'bank_transfer'];

const BankDeposit = sequelize.define(
  'BankDeposit',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    group_id: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    deposit_date: { type: DataTypes.DATEONLY, allowNull: false },
    bank_name: { type: DataTypes.STRING(255), allowNull: false },
    deposit_method: {
      type: DataTypes.ENUM(...DEPOSIT_METHODS),
      allowNull: false,
    },
    proof_relative_path: { type: DataTypes.STRING(512), allowNull: false },
    submitted_by_user_id: { type: DataTypes.UUID, allowNull: true },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'deposit_submitted',
    },
  },
  {
    tableName: 'bank_deposits',
    indexes: [{ name: 'bank_deposits_group', fields: ['group_id'] }],
  }
);

export default BankDeposit;
export { DEPOSIT_METHODS };
