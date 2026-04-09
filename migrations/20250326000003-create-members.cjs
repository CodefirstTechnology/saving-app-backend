'use strict';

const { safeMigrate } = require('../src/db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('members', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      group_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'groups', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      name_marathi: { type: Sequelize.STRING(255), allowNull: false },
      name_english: { type: Sequelize.STRING(255), allowNull: false },
      phone: { type: Sequelize.STRING(32), allowNull: true },
      savings_balance: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await safeMigrate(() =>
      queryInterface.addIndex('members', ['group_id', 'phone'], { name: 'members_group_phone' })
    );
  },
  async down(queryInterface) {
    await queryInterface.dropTable('members');
  },
};
