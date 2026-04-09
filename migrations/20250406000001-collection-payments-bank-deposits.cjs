'use strict';

const { safeMigrate } = require('../src/db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('collection_payments', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      group_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'groups', key: 'id' },
        onDelete: 'CASCADE',
      },
      member_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'members', key: 'id' },
        onDelete: 'CASCADE',
      },
      submitted_by_user_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      payment_method: {
        type: Sequelize.ENUM('cash', 'upi', 'bank_transfer'),
        allowNull: false,
      },
      transaction_reference: { type: Sequelize.STRING(255), allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: false },
      status: {
        type: Sequelize.ENUM('initiated', 'collected', 'rejected'),
        allowNull: false,
        defaultValue: 'initiated',
      },
      digitally_traceable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      requires_admin_confirm: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      collected_at: { type: Sequelize.DATE, allowNull: true },
      confirmed_by_user_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      rejected_at: { type: Sequelize.DATE, allowNull: true },
      rejected_by_user_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      linked_transaction_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'transactions', key: 'id' },
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('bank_deposits', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      group_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'groups', key: 'id' },
        onDelete: 'CASCADE',
      },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      deposit_date: { type: Sequelize.DATEONLY, allowNull: false },
      bank_name: { type: Sequelize.STRING(255), allowNull: false },
      deposit_method: {
        type: Sequelize.ENUM('cash', 'upi', 'bank_transfer'),
        allowNull: false,
      },
      proof_relative_path: { type: Sequelize.STRING(512), allowNull: false },
      submitted_by_user_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'deposit_submitted',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await safeMigrate(() =>
      queryInterface.addIndex('collection_payments', ['group_id', 'status'], { name: 'collection_payments_group_status' })
    );
    await safeMigrate(() =>
      queryInterface.addIndex('collection_payments', ['group_id', 'member_id'], { name: 'collection_payments_group_member' })
    );
    await safeMigrate(() => queryInterface.addIndex('bank_deposits', ['group_id'], { name: 'bank_deposits_group' }));
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bank_deposits');
    await queryInterface.dropTable('collection_payments');
  },
};
