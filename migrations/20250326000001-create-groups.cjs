'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('groups', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      name_marathi: { type: Sequelize.STRING(255), allowNull: false },
      name_english: { type: Sequelize.STRING(255), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('groups');
  },
};
