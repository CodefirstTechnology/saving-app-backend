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
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const EMAIL = process.env.DEMO_MEMBER_EMAIL || 'member@bachat.local';
const PASSWORD = process.env.DEMO_MEMBER_PASSWORD || 'Member123!';
const FULL_NAME = process.env.DEMO_MEMBER_FULL_NAME || 'Demo Member';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD === undefined ? '' : process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'bachat_pragati',
  });

  const [groups] = await conn.query('SELECT id FROM `groups` ORDER BY created_at ASC LIMIT 1');
  if (!groups.length) {
    console.error('No groups found. Create a group first (bootstrap or seed).');
    process.exitCode = 1;
    await conn.end();
    return;
  }
  const groupId = groups[0].id;

  const [members] = await conn.query(
    'SELECT id FROM members WHERE group_id = ? ORDER BY created_at ASC LIMIT 1',
    [groupId]
  );
  if (!members.length) {
    console.error('No members in that group. Add members first.');
    process.exitCode = 1;
    await conn.end();
    return;
  }
  const memberId = members[0].id;

  const [byEmail] = await conn.query('SELECT id FROM users WHERE email = ?', [EMAIL.toLowerCase()]);
  if (byEmail.length) {
    console.log(`Already exists: ${EMAIL} (id: ${byEmail[0].id})`);
    await conn.end();
    return;
  }

  const [byMember] = await conn.query('SELECT id, email FROM users WHERE member_id = ?', [memberId]);
  if (byMember.length) {
    console.log(`First member already has login: ${byMember[0].email}`);
    await conn.end();
    return;
  }

  const hash = await bcrypt.hash(PASSWORD, 12);
  const id = randomUUID();
  await conn.query(
    `INSERT INTO users (id, email, password_hash, role, group_id, member_id, full_name, created_at, updated_at)
     VALUES (?, ?, ?, 'user', ?, ?, ?, NOW(), NOW())`,
    [id, EMAIL.toLowerCase(), hash, groupId, memberId, FULL_NAME]
  );

  console.log('Created member (user) account:');
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  User id:  ${id}`);
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
