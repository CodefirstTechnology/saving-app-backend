import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Loan, Member, LoanVote } from '../models/index.js';

const loanRepository = {
  async findById(id, groupId) {
    return Loan.findOne({
      where: { id, group_id: groupId },
      include: [
        { model: Member, as: 'member' },
        {
          model: LoanVote,
          as: 'votes',
          include: [{ model: Member, as: 'voter', attributes: ['id', 'name_marathi', 'name_english'] }],
        },
      ],
    });
  },
  async create(data, options = {}) {
    return Loan.create(data, options);
  },
  async update(loan, data, options = {}) {
    await loan.update(data, options);
    return loan;
  },
  async listByGroup(groupId, { offset, limit, status, memberId }) {
    const where = { group_id: groupId };
    if (status) {
      if (Array.isArray(status)) where.status = { [Op.in]: status };
      else where.status = status;
    }
    if (memberId) where.member_id = memberId;
    const { rows, count } = await Loan.findAndCountAll({
      where,
      include: [
        { model: Member, as: 'member', attributes: ['id', 'name_marathi', 'name_english', 'phone'] },
        {
          model: LoanVote,
          as: 'votes',
          required: false,
          include: [{ model: Member, as: 'voter', attributes: ['id', 'name_marathi', 'name_english'] }],
        },
      ],
      offset,
      limit,
      order: [['created_at', 'DESC']],
    });
    return { rows, count };
  },
  async sumOutstanding(groupId, statuses = ['active', 'overdue', 'pending']) {
    const r = await Loan.findOne({
      attributes: [[sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('outstanding_balance')), 0), 'total']],
      where: { group_id: groupId, status: { [Op.in]: statuses } },
      raw: true,
    });
    return r?.total ?? 0;
  },
  async sumPrincipalIssued(groupId) {
    const r = await Loan.findOne({
      attributes: [[sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('principal')), 0), 'total']],
      where: {
        group_id: groupId,
        status: { [Op.in]: ['active', 'paid', 'overdue'] },
      },
      raw: true,
    });
    return r?.total ?? 0;
  },
  async findBlockingLoanForMember(groupId, memberId) {
    return Loan.findOne({
      where: {
        group_id: groupId,
        member_id: memberId,
        status: { [Op.in]: ['pending', 'active', 'overdue'] },
      },
    });
  },
};

export default loanRepository;
