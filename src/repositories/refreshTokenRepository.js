import { Op } from 'sequelize';
import { RefreshToken } from '../models/index.js';

const refreshTokenRepository = {
  async create({ id, user_id, token_hash, device_id, expires_at }) {
    return RefreshToken.create({ id, user_id, token_hash, device_id, expires_at });
  },

  async findValidByHash(token_hash) {
    return RefreshToken.findOne({
      where: {
        token_hash,
        revoked_at: null,
        expires_at: { [Op.gt]: new Date() },
      },
    });
  },

  async revokeByHash(token_hash) {
    const [n] = await RefreshToken.update({ revoked_at: new Date() }, { where: { token_hash, revoked_at: null } });
    return n;
  },

  async revokeAllForUser(user_id) {
    await RefreshToken.update({ revoked_at: new Date() }, { where: { user_id, revoked_at: null } });
  },
};

export default refreshTokenRepository;
