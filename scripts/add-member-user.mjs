/**
 * Creates one `user` (member) login linked to the first member of the first group.
 * Safe to run multiple times — skips if email or member is already linked.
 *
 * Usage (from backend/):
 *   node scripts/add-member-user.mjs
 *
 * Optional env (in .env):
 *   DEMO_MEMBER_EMAIL=someone@example.com
 *   DEMO_MEMBER_PASSWORD=YourPass123
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const EMAIL = process.env.DEMO_MEMBER_EMAIL || 'member@bachat.local';
const PASSWORD = process.env.DEMO_MEMBER_PASSWORD || 'Member123!';
const FULL_NAME = process.env.DEMO_MEMBER_FULL_NAME || 'Demo Member';

async function main() {
  const { connectDb, disconnectDb } = await import('../src/config/database.js');
  const { Group, Member, User } = await import('../src/models/index.js');

  await connectDb();
  try {
    const group = await Group.findOne().sort({ created_at: 1 });
    if (!group) {
      console.error('No groups found. Create a group first (bootstrap or seed).');
      process.exitCode = 1;
      return;
    }
    const groupId = group._id;

    const memberRow = await Member.findOne({ group_id: groupId }).sort({ created_at: 1 });
    if (!memberRow) {
      console.error('No members in that group. Add members first.');
      process.exitCode = 1;
      return;
    }
    const memberId = memberRow._id;

    const byEmail = await User.findOne({ email: EMAIL.toLowerCase() });
    if (byEmail) {
      console.log(`Already exists: ${EMAIL} (id: ${byEmail.id})`);
      return;
    }

    const byMember = await User.findOne({ member_id: memberId });
    if (byMember) {
      console.log(`First member already has login: ${byMember.email}`);
      return;
    }

    const hash = await bcrypt.hash(PASSWORD, 12);
    const id = randomUUID();
    await User.create({
      _id: id,
      email: EMAIL.toLowerCase(),
      password_hash: hash,
      role: 'user',
      group_id: groupId,
      member_id: memberId,
      full_name: FULL_NAME,
    });

    console.log('Created member (user) account:');
    console.log(`  Email:    ${EMAIL}`);
    console.log(`  Password: ${PASSWORD}`);
    console.log(`  User id:  ${id}`);
  } finally {
    await disconnectDb();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
