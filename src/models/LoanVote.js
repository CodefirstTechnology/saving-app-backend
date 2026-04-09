import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LoanVote = sequelize.define(
  'LoanVote',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    loan_id: { type: DataTypes.UUID, allowNull: false },
    voter_member_id: { type: DataTypes.UUID, allowNull: false },
    decision: {
      type: DataTypes.ENUM('approve', 'reject'),
      allowNull: false,
    },
    comment: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'loan_votes',
    indexes: [
      { fields: ['loan_id'] },
      { fields: ['voter_member_id'] },
      { unique: true, fields: ['loan_id', 'voter_member_id'], name: 'loan_votes_loan_voter_unique' },
    ],
  }
);

export default LoanVote;
