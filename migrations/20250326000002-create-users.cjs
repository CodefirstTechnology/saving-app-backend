'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.ENUM('admin', 'staff', 'member'), allowNull: false, defaultValue: 'staff' },
      group_id: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'groups', key: 'id' }, onDelete: 'SET NULL' },
      member_id: { type: Sequelize.CHAR(36), allowNull: true },
      full_name: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    // Do not call addIndex here for columns already covered by Sequelize/MySQL:
    // - `email` + unique → unique index (e.g. users_email)
    // - `group_id` + REFERENCES → InnoDB index for the foreign key (e.g. users_group_id)
    // - `role` → a second addIndex('role') re-running this migration after a partial run causes
    //   "Duplicate key name 'users_role'". Role filtering is rare; skip a dedicated index.
  },
  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
