import { CollectionPayment, Member } from '../models/index.js';
import { createWithOptionalSession } from '../utils/mongooseCreate.js';
import { normalizeEntityId, sameId } from '../utils/idCompare.js';
import { AppError } from '../middlewares/errorHandler.js';

async function attachMember(doc) {
  if (!doc) return null;
  const plain = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
  if (plain.member_id) {
    plain.member = await Member.findById(plain.member_id)
      .select('name_marathi name_english phone')
      .lean({ virtuals: true });
  }
  return plain;
}

function sessionOpts(options) {
  return options.session ? { session: options.session } : {};
}

/**
 * Load payment by `_id` (raw or normalized UUID), then verify it belongs to `groupId`
 * using `sameId` so DB string vs query param casing/format differences still match.
 */
async function resolvePaymentDocForScope(id, groupId, options = {}) {
  const rawGid = groupId != null ? String(groupId).trim() : '';
  const rawId = id != null ? String(id).trim() : '';
  if (!rawId || !rawGid) return null;
  let doc = await CollectionPayment.findOne({ _id: rawId }, null, sessionOpts(options));
  if (!doc) {
    const nid = normalizeEntityId(rawId);
    if (nid && nid !== rawId) {
      doc = await CollectionPayment.findOne({ _id: nid }, null, sessionOpts(options));
    }
  }
  if (!doc) return null;
  if (!sameId(doc.group_id, rawGid)) return null;
  return doc;
}

const collectionPaymentRepository = {
  async findById(id, groupId, options = {}) {
    const doc = await resolvePaymentDocForScope(id, groupId, options);
    return attachMember(doc);
  },

  async create(data, options = {}) {
    const row = await createWithOptionalSession(CollectionPayment, data, options);
    return attachMember(row);
  },

  async patch(id, groupId, data, options = {}) {
    const doc = await resolvePaymentDocForScope(id, groupId, options);
    if (!doc) {
      throw new AppError(404, 'Payment record not found');
    }
    const plain = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
    const r = await CollectionPayment.updateOne(
      { _id: plain._id, group_id: plain.group_id },
      { $set: data },
      sessionOpts(options)
    );
    if (r.matchedCount === 0) {
      throw new AppError(500, 'Payment update failed');
    }
  },

  async listByGroup(groupId, { status, memberId, limit = 100, offset = 0 } = {}, options = {}) {
    const where = { group_id: groupId };
    if (status) where.status = status;
    if (memberId) where.member_id = memberId;
    let q = CollectionPayment.find(where)
      .sort({ created_at: -1 })
      .limit(limit)
      .skip(offset)
      .lean({ virtuals: true });
    if (options.session) q = q.session(options.session);
    const rows = await q;
    const memberIds = [...new Set(rows.map((r) => r.member_id).filter(Boolean))];
    if (!memberIds.length) return rows;
    let mq = Member.find({ _id: { $in: memberIds } }).select('name_marathi name_english phone').lean({ virtuals: true });
    if (options.session) mq = mq.session(options.session);
    const members = await mq;
    const map = new Map(members.map((m) => [m._id, m]));
    for (const r of rows) {
      if (r.member_id) r.member = map.get(r.member_id) || null;
    }
    return rows;
  },

  async sumCollected(groupId, options = {}) {
    const pipeline = [
      { $match: { group_id: groupId, status: 'collected' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ];
    let agg = CollectionPayment.aggregate(pipeline);
    if (options.session) agg = agg.session(options.session);
    const r = await agg;
    return r[0]?.total != null ? Number(r[0].total) : 0;
  },

  async sumCollectedBetween(groupId, startInclusive, endInclusive, options = {}) {
    const match = {
      group_id: groupId,
      status: 'collected',
    };
    if (startInclusive || endInclusive) {
      match.collected_at = {};
      if (startInclusive) match.collected_at.$gte = startInclusive;
      if (endInclusive) match.collected_at.$lte = endInclusive;
    }
    const pipeline = [{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' } } }];
    let agg = CollectionPayment.aggregate(pipeline);
    if (options.session) agg = agg.session(options.session);
    const r = await agg;
    return r[0]?.total != null ? Number(r[0].total) : 0;
  },
};

export default collectionPaymentRepository;
