'use strict';

const { safeMigrate } = require('../src/db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const qi = queryInterface.sequelize;
    const [idx] = await qi.query(`SHOW INDEX FROM users WHERE Column_name = 'mobile_number' AND Non_unique = 0`);
    const names = [...new Set((idx || []).map((r) => r.Key_name).filter(Boolean))];
    for (const keyName of names) {
      await safeMigrate(() => qi.query(`ALTER TABLE users DROP INDEX \`${keyName}\``));
    }

    await safeMigrate(() =>
      queryInterface.addIndex('users', ['mobile_number', 'group_id'], {
        unique: true,
        name: 'users_mobile_number_group_id_unique',
      })
    );
  },

  async down(queryInterface) {
    await safeMigrate(() => queryInterface.removeIndex('users', 'users_mobile_number_group_id_unique'));
    await safeMigrate(() =>
      queryInterface.addIndex('users', ['mobile_number'], {
        unique: true,
        name: 'mobile_number',
      })
    );
  },
};
