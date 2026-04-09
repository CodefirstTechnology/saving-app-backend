'use strict';

const { safeMigrate } = require('../src/db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await safeMigrate(() =>
      queryInterface.addColumn('users', 'mobile_number', {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true,
      })
    );

    await safeMigrate(() =>
      queryInterface.sequelize.query(`
      ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL
    `)
    );

    const [rows] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE mobile_number IS NULL ORDER BY created_at`
    );
    let n = 9876543210;
    for (const row of rows) {
      await queryInterface.sequelize.query(`UPDATE users SET mobile_number = ? WHERE id = ?`, {
        replacements: [String(n), row.id],
      });
      n += 1;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'mobile_number');
    await queryInterface.changeColumn('users', 'email', {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
    });
  },
};
