require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mysqlCommon = {
  dialect: 'mysql',
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  dialectOptions: {
    charset: 'utf8mb4',
  },
  logging: false,
};

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD === undefined ? '' : process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'bachat_pragati',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    ...mysqlCommon,
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD === undefined ? '' : process.env.DB_PASSWORD,
    database: process.env.DB_NAME_TEST || 'bachat_pragati_test',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    ...mysqlCommon,
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'mysql',
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    dialectOptions: {
      charset: 'utf8mb4',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    },
    logging: false,
  },
};
