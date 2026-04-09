'use strict';

const { safeMigrate } = require('../src/db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transactions', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      group_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'groups', key: 'id' }, onDelete: 'CASCADE' },
      member_id: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'members', key: 'id' }, onDelete: 'SET NULL' },
      loan_id: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'loans', key: 'id' }, onDelete: 'SET NULL' },
      entry_type: { type: Sequelize.ENUM('credit', 'debit'), allowNull: false },
      category: {
        type: Sequelize.ENUM('savings', 'loan_issue', 'loan_repay', 'interest', 'fine', 'other'),
        allowNull: false,
      },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      description_marathi: { type: Sequelize.STRING(500), allowNull: true },
      description_english: { type: Sequelize.STRING(500), allowNull: true },
      payment_mode: { type: Sequelize.ENUM('cash', 'bank'), allowNull: true },
      occurred_at: { type: Sequelize.DATEONLY, allowNull: false },
      created_by_user_id: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    // FK columns `group_id`, `member_id`, `loan_id`, `created_by_user_id` already indexed by InnoDB.
    await safeMigrate(() => queryInterface.addIndex('transactions', ['occurred_at']));
    await safeMigrate(() => queryInterface.addIndex('transactions', ['category']));
    await safeMigrate(() =>
      queryInterface.addIndex('transactions', ['group_id', 'occurred_at'], { name: 'tx_group_date' })
    );
  },
  async down(queryInterface) {
    await queryInterface.dropTable('transactions');
  },
};
