import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';

const mysqlDefaults = {
  dialect: 'mysql',
  define: {
    underscored: true,
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  dialectOptions: {
    charset: 'utf8mb4',
  },
};

function createSequelize() {
  const logging = nodeEnv === 'development' ? console.log : false;

  if (nodeEnv === 'production' && process.env.DATABASE_URL) {
    return new Sequelize(process.env.DATABASE_URL, {
      ...mysqlDefaults,
      logging,
      dialectOptions: {
        ...mysqlDefaults.dialectOptions,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      },
    });
  }

  const password = process.env.DB_PASSWORD === undefined ? '' : process.env.DB_PASSWORD;

  return new Sequelize(
    process.env.DB_NAME || 'bachat_pragati',
    process.env.DB_USER || 'root',
    password,
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      ...mysqlDefaults,
      logging,
    }
  );
}

const sequelize = createSequelize();
export default sequelize;
