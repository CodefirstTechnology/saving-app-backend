'use strict';

const { safeMigrate } = require('../src/db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await safeMigrate(() =>
      queryInterface.addColumn('users', 'city', {
        type: Sequelize.STRING(128),
        allowNull: true,
      })
    );
    await safeMigrate(() =>
      queryInterface.addColumn('users', 'state', {
        type: Sequelize.STRING(128),
        allowNull: true,
      })
    );
    await safeMigrate(() =>
      queryInterface.addColumn('users', 'town', {
        type: Sequelize.STRING(255),
        allowNull: true,
      })
    );
    await safeMigrate(() =>
      queryInterface.addColumn('users', 'pincode', {
        type: Sequelize.STRING(16),
        allowNull: true,
      })
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'city');
    await queryInterface.removeColumn('users', 'state');
    await queryInterface.removeColumn('users', 'town');
    await queryInterface.removeColumn('users', 'pincode');
  },
};
