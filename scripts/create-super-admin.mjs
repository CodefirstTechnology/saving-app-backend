/**
 * Creates exactly one super_admin when none exists (DB already seeded / bootstrap closed).
 *
 * Usage (from backend/):
 *   npx dotenv -e .env -- node scripts/create-super-admin.mjs
 * Or set env:
 *   SUPER_ADMIN_MOBILE=9990000001 SUPER_ADMIN_PASSWORD='YourPass1!' SUPER_ADMIN_NAME='Owner' node scripts/create-super-admin.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { connectDb, disconnectDb } = await import('../src/config/database.js');
const { User } = await import('../src/models/index.js');
const { hashPassword } = await import('../src/utils/password.js');
const { ROLES } = await import('../src/constants/roles.js');
const { normalizeMobile, isValidMobileDigits } = await import('../src/utils/mobile.js');

const mobile = normalizeMobile(process.env.SUPER_ADMIN_MOBILE || '9990000001');
const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';
const name = process.env.SUPER_ADMIN_NAME || 'System Super Admin';

async function main() {
  await connectDb();
  try {
    const existing = await User.countDocuments({ role: ROLES.SUPER_ADMIN });
    if (existing > 0) {
      console.log(`Super admin already exists (${existing} account(s)). No changes.`);
      return;
    }

    if (!isValidMobileDigits(mobile)) {
      console.error('Invalid SUPER_ADMIN_MOBILE (use 10 digits, e.g. 9990000001).');
      process.exitCode = 1;
      return;
    }
    if (password.length < 8) {
      console.error('SUPER_ADMIN_PASSWORD must be at least 8 characters.');
      process.exitCode = 1;
      return;
    }

    const taken = await User.findOne({ mobile_number: mobile });
    if (taken) {
      console.error(`Mobile ${mobile} is already used. Set SUPER_ADMIN_MOBILE to a free number.`);
      process.exitCode = 1;
      return;
    }

    await User.create({
      email: null,
      mobile_number: mobile,
      password_hash: await hashPassword(password),
      full_name: name,
      role: ROLES.SUPER_ADMIN,
      group_id: null,
      member_id: null,
    });

    console.log('Created super_admin.');
    console.log(`  Mobile: ${mobile}`);
    console.log(`  Name:   ${name}`);
    console.log('  Password: (value of SUPER_ADMIN_PASSWORD, or default SuperAdmin123! if unset)');
  } finally {
    await disconnectDb();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
