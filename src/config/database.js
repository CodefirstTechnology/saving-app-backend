import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required (e.g. MongoDB Atlas connection string)');
  }
  mongoose.set('strictQuery', true);
  /** Atlas + Vercel/serverless: allow 0.0.0.0/0 in Atlas → Network Access (Vercel has no fixed egress IP). */
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15_000,
    socketTimeoutMS: 45_000,
  });
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

/** Run a callback inside a MongoDB transaction (replaces Sequelize transactions). */
export async function withMongoTransaction(fn) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

export default mongoose;
