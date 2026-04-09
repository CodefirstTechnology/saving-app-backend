'use strict';

const { safeMigrate } = require('../src/db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      category: { type: Sequelize.STRING(64), allowNull: false },
      title: { type: Sequelize.STRING(255), allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: false },
      payload: { type: Sequelize.JSON, allowNull: true },
      read_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await safeMigrate(() =>
      queryInterface.addIndex('notifications', ['user_id', 'read_at'], { name: 'notifications_user_read' })
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notifications');
  },
};
