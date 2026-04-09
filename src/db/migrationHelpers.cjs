'use strict';

/**
 * Sequelize migrations use CREATE TABLE IF NOT EXISTS but still re-run addIndex/addConstraint/addColumn.
 * MySQL then throws duplicate errors. Collect messages/codes we treat as "already applied".
 *
 * Lives under src/db (not migrations/) so sequelize-cli does not treat this file as a migration.
 */
function migrationErrorText(e) {
  return String(
    e?.message || e?.parent?.sqlMessage || e?.original?.sqlMessage || e?.sqlMessage || e?.original?.message || ''
  );
}

function migrationErrno(e) {
  let cur = e;
  for (let i = 0; i < 6 && cur; i++) {
    if (cur.errno != null) return Number(cur.errno);
    cur = cur.parent || cur.original;
  }
  return null;
}

function isBenignDuplicateError(e) {
  const msg = migrationErrorText(e).toLowerCase();
  const code = migrationErrno(e);
  // 1060 duplicate column, 1061 duplicate key name, 121 InnoDB duplicate FK / constraint conflict
  if ([1060, 1061, 121].includes(code)) return true;
  if (code === 1826) return true; // ER_FK_DUP_NAME (MySQL 8+)
  if (
    msg.includes('duplicate key name') ||
    msg.includes('duplicate key on write') ||
    msg.includes('duplicate column name') ||
    msg.includes('duplicate foreign key') ||
    msg.includes('er_dup_keyname') ||
    msg.includes('er_dup_fieldname')
  ) {
    return true;
  }
  // InnoDB errno 121 when adding a duplicate FK / constraint (often reported as "Can't create table ... users")
  if (msg.includes("can't create table") && (msg.includes('errno: 121') || msg.includes('(errno: 121'))) return true;
  return false;
}

/** Run async fn; ignore only known duplicate / already-applied errors. */
async function safeMigrate(fn) {
  try {
    await fn();
  } catch (e) {
    if (isBenignDuplicateError(e)) return;
    throw e;
  }
}

module.exports = { safeMigrate, isBenignDuplicateError, migrationErrorText };
