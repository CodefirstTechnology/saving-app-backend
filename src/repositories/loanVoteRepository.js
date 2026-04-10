import { LoanVote, Member } from '../models/index.js';
import { createWithOptionalSession } from '../utils/mongooseCreate.js';

const loanVoteRepository = {
  async listByLoanId(loanId) {
    const votes = await LoanVote.find({ loan_id: loanId }).sort({ created_at: 1 }).lean({ virtuals: true });
    const voterIds = [...new Set(votes.map((v) => v.voter_member_id).filter(Boolean))];
    if (!voterIds.length) return votes;
    const members = await Member.find({ _id: { $in: voterIds } })
      .select('name_marathi name_english')
      .lean({ virtuals: true });
    const map = new Map(members.map((m) => [m._id, m]));
    for (const v of votes) {
      if (v.voter_member_id) v.voter = map.get(v.voter_member_id) || null;
    }
    return votes;
  },
  async findVote(loanId, voterMemberId) {
    return LoanVote.findOne({ loan_id: loanId, voter_member_id: voterMemberId });
  },
  async create(data, options = {}) {
    return createWithOptionalSession(LoanVote, data, options);
  },
};

export default loanVoteRepository;
