'use strict';

const { safeMigrate } = require('../src/db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('loan_votes', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      loan_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'loans', key: 'id' },
        onDelete: 'CASCADE',
      },
      voter_member_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'members', key: 'id' },
        onDelete: 'CASCADE',
      },
      decision: {
        type: Sequelize.ENUM('approve', 'reject'),
        allowNull: false,
      },
      comment: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await safeMigrate(() =>
      queryInterface.addIndex('loan_votes', ['loan_id', 'voter_member_id'], {
        unique: true,
        name: 'loan_votes_loan_voter_unique',
      })
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('loan_votes');
  },
};
