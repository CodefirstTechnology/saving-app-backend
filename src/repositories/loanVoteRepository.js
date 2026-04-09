import { LoanVote, Member } from '../models/index.js';

const loanVoteRepository = {
  async listByLoanId(loanId) {
    return LoanVote.findAll({
      where: { loan_id: loanId },
      include: [{ model: Member, as: 'voter', attributes: ['id', 'name_marathi', 'name_english'] }],
      order: [['created_at', 'ASC']],
    });
  },
  async findVote(loanId, voterMemberId) {
    return LoanVote.findOne({ where: { loan_id: loanId, voter_member_id: voterMemberId } });
  },
  async create(data, options = {}) {
    return LoanVote.create(data, options);
  },
};

export default loanVoteRepository;
