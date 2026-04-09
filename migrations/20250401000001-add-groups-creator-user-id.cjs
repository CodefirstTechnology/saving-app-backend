'use strict';

const { safeMigrate } = require('../src/db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await safeMigrate(() =>
      queryInterface.addColumn('groups', 'creator_user_id', {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })
    );
    // REFERENCES on `creator_user_id` → InnoDB already adds an index for the FK.

    await queryInterface.sequelize.query(`
      UPDATE groups g
      INNER JOIN users u ON u.group_id = g.id AND u.role = 'admin'
      SET g.creator_user_id = u.id
      WHERE g.creator_user_id IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('groups', 'creator_user_id');
  },
};
