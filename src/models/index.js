import sequelize from '../config/database.js';
import User from './User.js';
import Group from './Group.js';
import Member from './Member.js';
import Transaction from './Transaction.js';
import Loan from './Loan.js';
import LoanVote from './LoanVote.js';
import Notification from './Notification.js';
import RefreshToken from './RefreshToken.js';
import CollectionPayment from './CollectionPayment.js';
import BankDeposit from './BankDeposit.js';

Group.hasMany(User, { foreignKey: 'group_id', as: 'users' });
User.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
User.hasMany(Group, { foreignKey: 'creator_user_id', as: 'createdGroups' });
Group.belongsTo(User, { foreignKey: 'creator_user_id', as: 'creator' });

Group.hasMany(Member, { foreignKey: 'group_id', as: 'members' });
Member.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
Member.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Group.hasMany(Transaction, { foreignKey: 'group_id', as: 'transactions' });
Transaction.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
Transaction.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });
Transaction.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'creator' });
Transaction.hasMany(CollectionPayment, { foreignKey: 'linked_transaction_id', as: 'collectionPayments' });

Group.hasMany(Loan, { foreignKey: 'group_id', as: 'loans' });
Loan.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
Loan.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });

Loan.hasMany(Transaction, { foreignKey: 'loan_id', as: 'transactions' });
Transaction.belongsTo(Loan, { foreignKey: 'loan_id', as: 'loan' });

Loan.hasMany(LoanVote, { foreignKey: 'loan_id', as: 'votes' });
LoanVote.belongsTo(Loan, { foreignKey: 'loan_id', as: 'loan' });
LoanVote.belongsTo(Member, { foreignKey: 'voter_member_id', as: 'voter' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Group.hasMany(CollectionPayment, { foreignKey: 'group_id', as: 'collectionPayments' });
CollectionPayment.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
CollectionPayment.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });
CollectionPayment.belongsTo(Transaction, { foreignKey: 'linked_transaction_id', as: 'linkedTransaction' });

Group.hasMany(BankDeposit, { foreignKey: 'group_id', as: 'bankDeposits' });
BankDeposit.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });

export {
  sequelize,
  User,
  Group,
  Member,
  Transaction,
  Loan,
  LoanVote,
  Notification,
  RefreshToken,
  CollectionPayment,
  BankDeposit,
};
