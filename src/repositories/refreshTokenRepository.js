import { RefreshToken } from '../models/index.js';

const refreshTokenRepository = {
  async create({ id, user_id, token_hash, device_id, expires_at }, options = {}) {
    const doc = { user_id, token_hash, device_id, expires_at };
    if (id) doc._id = id;
    const opts = options.session ? { session: options.session } : {};
    return RefreshToken.create(doc, opts);
  },

  async findValidByHash(token_hash) {
    return RefreshToken.findOne({
      token_hash,
      revoked_at: null,
      expires_at: { $gt: new Date() },
    });
  },

  async revokeByHash(token_hash, options = {}) {
    const opts = options.session ? { session: options.session } : {};
    const r = await RefreshToken.updateMany(
      { token_hash, revoked_at: null },
      { $set: { revoked_at: new Date() } },
      opts
    );
    return r.modifiedCount;
  },

  async revokeAllForUser(user_id, options = {}) {
    const opts = options.session ? { session: options.session } : {};
    await RefreshToken.updateMany({ user_id, revoked_at: null }, { $set: { revoked_at: new Date() } }, opts);
  },
};

export default refreshTokenRepository;
