'use strict';

const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const groupId = randomUUID();
    await queryInterface.sequelize.query(
      `INSERT INTO groups (id, name_marathi, name_english, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      { replacements: [groupId, 'बचत गट', 'Demo SHG Group'] }
    );

    const adminHash = await bcrypt.hash('Admin123!', 12);
    const adminId = randomUUID();
    await queryInterface.sequelize.query(
      `INSERT INTO users (id, email, mobile_number, password_hash, role, group_id, full_name, created_at, updated_at)
       VALUES (?, NULL, ?, ?, 'admin', ?, 'Group Admin', NOW(), NOW())`,
      { replacements: [adminId, '9876543210', adminHash, groupId] }
    );

    try {
      await queryInterface.sequelize.query(
        `UPDATE groups SET creator_user_id = ? WHERE id = ?`,
        { replacements: [adminId, groupId] }
      );
    } catch {
      /* column missing before migration — ignore */
    }

    const members = [
      ['सुनंदा पाटील', 'Sunanda Patil', '+9198XXXX001', 8450],
      ['मिनाक्षी पाटील', 'Minakshi Patil', '+9198XXXX002', 12000],
      ['अनिता शिंदे', 'Anita Shinde', '+9198XXXX003', 3100],
      ['राजेश कुलकर्णी', 'Rajesh Kulkarni', '+9198XXXX004', 5600],
    ];

    const memberIds = [];
    for (const [mr, en, phone, bal] of members) {
      const mid = randomUUID();
      await queryInterface.sequelize.query(
        `INSERT INTO members (id, group_id, name_marathi, name_english, phone, savings_balance, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
        { replacements: [mid, groupId, mr, en, phone, bal] }
      );
      memberIds.push(mid);
    }

    const memberUserHash = await bcrypt.hash('Member123!', 12);
    const memberUserId = randomUUID();
    await queryInterface.sequelize.query(
      `INSERT INTO users (id, email, mobile_number, password_hash, role, group_id, member_id, full_name, created_at, updated_at)
       VALUES (?, NULL, ?, ?, 'user', ?, ?, 'Demo Member', NOW(), NOW())`,
      { replacements: [memberUserId, '9876543211', memberUserHash, groupId, memberIds[0]] }
    );

    const loanId = randomUUID();
    await queryInterface.sequelize.query(
      `INSERT INTO loans (id, group_id, member_id, reference_code, principal, interest_rate_percent, term_months, outstanding_balance, status, issued_at, due_at, created_at, updated_at)
       VALUES (?, ?, ?, 'LOAN-DEMO1', 32500, 2, 12, 32500, 'active', '2024-01-15', '2025-01-15', NOW(), NOW())`,
      { replacements: [loanId, groupId, memberIds[1]] }
    );

    await queryInterface.sequelize.query(
      `INSERT INTO loans (id, group_id, member_id, reference_code, principal, interest_rate_percent, term_months, outstanding_balance, status, issued_at, due_at, created_at, updated_at)
       VALUES (?, ?, ?, 'LOAN-DEMO2', 20000, 2, 12, 15450, 'overdue', '2023-06-01', '2024-06-01', NOW(), NOW())`,
      { replacements: [randomUUID(), groupId, memberIds[2]] }
    );

    await queryInterface.sequelize.query(
      `INSERT INTO transactions (id, group_id, member_id, loan_id, entry_type, category, amount, description_marathi, description_english, payment_mode, occurred_at, created_by_user_id, created_at, updated_at)
       VALUES
       (?, ?, ?, NULL, 'credit', 'savings', 500, 'मासिक बचत', 'Monthly savings', 'cash', '2024-05-10', ?, NOW(), NOW()),
       (?, ?, ?, NULL, 'credit', 'savings', 500, 'मासिक बचत', 'Monthly savings', 'cash', '2024-06-10', ?, NOW(), NOW()),
       (?, ?, ?, ?, 'debit', 'loan_issue', 32500, 'कर्ज', 'Loan issued', NULL, '2024-01-15', ?, NOW(), NOW())`,
      {
        replacements: [
          randomUUID(),
          groupId,
          memberIds[0],
          adminId,
          randomUUID(),
          groupId,
          memberIds[0],
          adminId,
          randomUUID(),
          groupId,
          memberIds[1],
          loanId,
          adminId,
        ],
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('transactions', null, {});
    await queryInterface.bulkDelete('loans', null, {});
    await queryInterface.bulkDelete('members', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('groups', null, {});
  },
};
