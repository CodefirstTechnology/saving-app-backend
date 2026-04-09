'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const qi = queryInterface.sequelize;
    await qi.query(`
      ALTER TABLE users MODIFY COLUMN role VARCHAR(24) NOT NULL DEFAULT 'user'
    `);
    await qi.query(`UPDATE users SET role = 'admin' WHERE role = 'staff'`);
    await qi.query(`UPDATE users SET role = 'user' WHERE role = 'member'`);

    await qi.query(`
      ALTER TABLE loans MODIFY COLUMN status ENUM('pending','active','paid','overdue','rejected')
      NOT NULL DEFAULT 'pending'
    `);
  },

  async down() {
    // Reverting role/loan enum changes risks data loss; restore from backup if needed.
  },
};
