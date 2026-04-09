'use strict';

const { safeMigrate } = require('../src/db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await safeMigrate(() =>
      queryInterface.addConstraint('users', {
        fields: ['member_id'],
        type: 'foreign key',
        name: 'users_member_id_fkey',
        references: { table: 'members', field: 'id' },
        onDelete: 'SET NULL',
      })
    );
  },
  async down(queryInterface) {
    await safeMigrate(() => queryInterface.removeConstraint('users', 'users_member_id_fkey'));
  },
};
