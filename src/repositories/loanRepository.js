import { Loan, Member, LoanVote } from '../models/index.js';

async function hydrateLoanDoc(loan) {
  if (!loan) return null;
  const plain = loan.toObject ? loan.toObject({ virtuals: true }) : { ...loan };
  if (plain.member_id) {
    plain.member = await Member.findById(plain.member_id)
      .select('name_marathi name_english phone')
      .lean({ virtuals: true });
  }
  const votes = await LoanVote.find({ loan_id: plain._id }).sort({ created_at: 1 }).lean({ virtuals: true });
  const voterIds = [...new Set(votes.map((v) => v.voter_member_id).filter(Boolean))];
  const voters = voterIds.length
    ? await Member.find({ _id: { $in: voterIds } }).select('name_marathi name_english').lean({ virtuals: true })
    : [];
  const vmap = new Map(voters.map((m) => [m._id, m]));
  for (const v of votes) {
    if (v.voter_member_id) v.voter = vmap.get(v.voter_member_id) || null;
  }
  plain.votes = votes;
  return plain;
}

async function hydrateLoanList(loans) {
  if (!loans.length) return [];
  const memberIds = [...new Set(loans.map((l) => l.member_id).filter(Boolean))];
  const loanIds = loans.map((l) => l._id);
  const members = memberIds.length
    ? await Member.find({ _id: { $in: memberIds } }).select('name_marathi name_english phone').lean({ virtuals: true })
    : [];
  const mmap = new Map(members.map((m) => [m._id, m]));
  const allVotes = await LoanVote.find({ loan_id: { $in: loanIds } }).sort({ created_at: 1 }).lean({ virtuals: true });
  const voterIds = [...new Set(allVotes.map((v) => v.voter_member_id).filter(Boolean))];
  const voters = voterIds.length
    ? await Member.find({ _id: { $in: voterIds } }).select('name_marathi name_english').lean({ virtuals: true })
    : [];
  const vmap = new Map(voters.map((m) => [m._id, m]));
  const votesByLoan = new Map();
  for (const v of allVotes) {
    if (!votesByLoan.has(v.loan_id)) votesByLoan.set(v.loan_id, []);
    votesByLoan.get(v.loan_id).push(v);
  }
  for (const v of allVotes) {
    if (v.voter_member_id) v.voter = vmap.get(v.voter_member_id) || null;
  }
  return loans.map((l) => {
    const plain = { ...l };
    if (plain.member_id) plain.member = mmap.get(plain.member_id) || null;
    plain.votes = votesByLoan.get(plain._id) || [];
    return plain;
  });
}

const loanRepository = {
  async findById(id, groupId) {
    const loan = await Loan.findOne({ _id: id, group_id: groupId });
    if (!loan) return null;
    return hydrateLoanDoc(loan);
  },
  async create(data, options = {}) {
    const opts = options.session ? { session: options.session } : {};
    const created = await Loan.create(data, opts);
    return hydrateLoanDoc(created);
  },
  async update(loan, data, options = {}) {
    const id = loan._id || loan.id;
    let q = Loan.findById(id);
    if (options.session) q = q.session(options.session);
    const doc = await q;
    if (!doc) return null;
    Object.assign(doc, data);
    const saveOpts = options.session ? { session: options.session } : {};
    await doc.save(saveOpts);
    return hydrateLoanDoc(doc);
  },
  async listByGroup(groupId, { offset, limit, status, memberId }) {
    const where = { group_id: groupId };
    if (status) {
      if (Array.isArray(status)) where.status = { $in: status };
      else where.status = status;
    }
    if (memberId) where.member_id = memberId;
    const [rows, count] = await Promise.all([
      Loan.find(where).sort({ created_at: -1 }).skip(offset).limit(limit).lean({ virtuals: true }),
      Loan.countDocuments(where),
    ]);
    const hydrated = await hydrateLoanList(rows);
    return { rows: hydrated, count };
  },
  async sumOutstanding(groupId, statuses = ['active', 'overdue', 'pending']) {
    const r = await Loan.aggregate([
      { $match: { group_id: groupId, status: { $in: statuses } } },
      { $group: { _id: null, total: { $sum: '$outstanding_balance' } } },
    ]);
    return r[0]?.total ?? 0;
  },
  async sumPrincipalIssued(groupId) {
    const r = await Loan.aggregate([
      { $match: { group_id: groupId, status: { $in: ['active', 'paid', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$principal' } } },
    ]);
    return r[0]?.total ?? 0;
  },
  async findBlockingLoanForMember(groupId, memberId) {
    return Loan.findOne({
      group_id: groupId,
      member_id: memberId,
      status: { $in: ['pending', 'active', 'overdue'] },
    });
  },
};

export default loanRepository;
