import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer'];
const COLLECTION_STATUSES = ['initiated', 'collected', 'rejected'];

const CollectionPayment = sequelize.define(
  'CollectionPayment',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    group_id: { type: DataTypes.UUID, allowNull: false },
    member_id: { type: DataTypes.UUID, allowNull: false },
    submitted_by_user_id: { type: DataTypes.UUID, allowNull: true },
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    payment_method: {
      type: DataTypes.ENUM(...PAYMENT_METHODS),
      allowNull: false,
    },
    transaction_reference: { type: DataTypes.STRING(255), allowNull: true },
    paid_at: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.ENUM(...COLLECTION_STATUSES),
      allowNull: false,
      defaultValue: 'initiated',
    },
    digitally_traceable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    requires_admin_confirm: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    collected_at: { type: DataTypes.DATE, allowNull: true },
    confirmed_by_user_id: { type: DataTypes.UUID, allowNull: true },
    rejected_at: { type: DataTypes.DATE, allowNull: true },
    rejected_by_user_id: { type: DataTypes.UUID, allowNull: true },
    linked_transaction_id: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: 'collection_payments',
    indexes: [
      { name: 'collection_payments_group_status', fields: ['group_id', 'status'] },
      { name: 'collection_payments_group_member', fields: ['group_id', 'member_id'] },
    ],
  }
);

export default CollectionPayment;
export { PAYMENT_METHODS, COLLECTION_STATUSES };
