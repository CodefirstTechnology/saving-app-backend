'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('groups', 'loan_interest_rate_monthly_percent', {
      type: Sequelize.DECIMAL(6, 3),
      allowNull: false,
      defaultValue: 1.5,
    });
    await queryInterface.addColumn('groups', 'max_members', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 50,
    });
    await queryInterface.addColumn('groups', 'contribution_cycle_type', {
      type: Sequelize.STRING(16),
      allowNull: false,
      defaultValue: 'monthly',
    });
    await queryInterface.addColumn('groups', 'contribution_cycle_days', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('groups', 'contribution_cycle_days');
    await queryInterface.removeColumn('groups', 'contribution_cycle_type');
    await queryInterface.removeColumn('groups', 'max_members');
    await queryInterface.removeColumn('groups', 'loan_interest_rate_monthly_percent');
  },
};
