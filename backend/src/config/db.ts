import mongoose from 'mongoose';
import dns from 'dns';
import chalk from 'chalk';
import { env } from './env';
import logger from '../utils/logger';
import { mongoSuccess, mongoError, mongoDisconnected, mongoReconnect } from '../utils/banner';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

mongoose.connection.on('error', (err) => {
  mongoError(err.message);
  logger.error('MongoDB connection error:', err.message);
});
mongoose.connection.on('disconnected', () => {
  mongoDisconnected();
  logger.warn('MongoDB disconnected');
});
mongoose.connection.on('reconnected', () => {
  mongoSuccess();
  logger.info('MongoDB reconnected');
});

export async function connectDB(): Promise<void> {
  const uri = `${env.MONGO_URL}/${env.DB_NAME}`;
  try {
    mongoose.set('bufferCommands', false);
    console.log(chalk.cyan('\n ──► Connecting to MongoDB...'));
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      w: 'majority',
    });
    mongoSuccess();
    logger.info(`MongoDB connected`);
  } catch (err: any) {
    mongoError(err?.message || String(err));
    logger.error('MongoDB connection error:', err);
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  mongoDisconnected();
  logger.info('MongoDB disconnected');
}
