'use strict';

const { safeMigrate } = require('../src/db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      token_hash: { type: Sequelize.STRING(64), allowNull: false },
      device_id: { type: Sequelize.STRING(128), allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await safeMigrate(() =>
      queryInterface.addIndex('refresh_tokens', ['token_hash'], { unique: true, name: 'refresh_tokens_token_hash_unique' })
    );
    await safeMigrate(() =>
      queryInterface.addIndex('refresh_tokens', ['expires_at'], { name: 'refresh_tokens_expires_at_idx' })
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
  },
};
