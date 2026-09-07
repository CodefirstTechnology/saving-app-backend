import { User } from '../models/index.js';
import userRepository from '../repositories/userRepository.js';
import { hashPassword } from '../utils/password.js';
import { ROLES } from '../constants/roles.js';
import logger from '../utils/logger.js';

export async function seedSuperAdmin() {
  try {
    // 1. Idempotency Check: search if ANY super_admin account already exists
    const existingSuperAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
    if (existingSuperAdmin) {
      logger.info(`[Seed] Single SuperAdmin account exists (User ID: ${existingSuperAdmin.user_id || existingSuperAdmin.id}). Skipping seed.`);
      return;
    }

    const superAdminMobile = process.env.SUPERADMIN_MOBILE || '9999999999';
    const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@savingapp.com';
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'Superadmin@123';

    await userRepository.create({
      user_id: 'BG-000001',
      email: superAdminEmail,
      mobile_number: superAdminMobile,
      password_hash: await hashPassword(superAdminPassword),
      full_name: 'System SuperAdmin',
      role: ROLES.SUPER_ADMIN,
      account_status: 'ACTIVE',
      group_id: null,
      member_id: null,
    });

    logger.info(`[Seed] Single SuperAdmin created (User ID: BG-000001 / Mobile: ${superAdminMobile})`);
  } catch (err) {
    if (err?.code === 11000 || err?.codeName === 'DuplicateKey') {
      logger.info('[Seed] SuperAdmin constraint verified: a SuperAdmin account already exists.');
    } else {
      logger.warn('[Seed] SuperAdmin seed check info:', err.message);
    }
  }
}
