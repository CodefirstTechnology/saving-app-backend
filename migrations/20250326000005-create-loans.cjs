'use strict';

const { safeMigrate } = require('../src/db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('loans', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      group_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'groups', key: 'id' }, onDelete: 'CASCADE' },
      member_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'members', key: 'id' }, onDelete: 'CASCADE' },
      reference_code: { type: Sequelize.STRING(32), allowNull: true },
      principal: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      interest_rate_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      term_months: { type: Sequelize.INTEGER, allowNull: false },
      outstanding_balance: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'active', 'paid', 'overdue'),
        allowNull: false,
        defaultValue: 'pending',
      },
      issued_at: { type: Sequelize.DATEONLY, allowNull: true },
      due_at: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    // FK columns `group_id` / `member_id` already indexed by InnoDB for foreign keys.
    await safeMigrate(() => queryInterface.addIndex('loans', ['status']));
    await safeMigrate(() =>
      queryInterface.addIndex('loans', ['group_id', 'reference_code'], {
        unique: true,
        name: 'loans_group_ref_unique',
      })
    );
  },
  async down(queryInterface) {
    await queryInterface.dropTable('loans');
  },
};
