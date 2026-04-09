'use strict';

const { safeMigrate } = require('../src/db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await safeMigrate(() =>
      queryInterface.addColumn('loans', 'reason', {
        type: Sequelize.TEXT,
        allowNull: true,
      })
    );
    await safeMigrate(() =>
      queryInterface.addColumn('loans', 'emi_amount', {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
      })
    );
    await safeMigrate(() =>
      queryInterface.addColumn('loans', 'suggested_tier', {
        type: Sequelize.STRING(16),
        allowNull: true,
      })
    );
    await safeMigrate(() =>
      queryInterface.addColumn('loans', 'installments_paid', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      })
    );
    await safeMigrate(() =>
      queryInterface.addColumn('loans', 'next_due_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      })
    );
    await safeMigrate(() =>
      queryInterface.addColumn('loans', 'reject_reason', {
        type: Sequelize.TEXT,
        allowNull: true,
      })
    );
    await safeMigrate(() =>
      queryInterface.addColumn('members', 'missed_payments_count', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      })
    );
    await safeMigrate(() =>
      queryInterface.addColumn('members', 'fines_total', {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      })
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('loans', 'reason');
    await queryInterface.removeColumn('loans', 'emi_amount');
    await queryInterface.removeColumn('loans', 'suggested_tier');
    await queryInterface.removeColumn('loans', 'installments_paid');
    await queryInterface.removeColumn('loans', 'next_due_date');
    await queryInterface.removeColumn('loans', 'reject_reason');
    await queryInterface.removeColumn('members', 'missed_payments_count');
    await queryInterface.removeColumn('members', 'fines_total');
  },
};
