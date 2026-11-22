import mongoose from 'mongoose';
import { config } from './environment.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

const STATES = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

export const getDatabaseState = () => STATES[mongoose.connection.readyState] ?? 'unknown';

export const isDatabaseConnected = () => mongoose.connection.readyState === 1;

let listenersAttached = false;

const attachListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', (err) => logger.error({ err: err.message }, 'MongoDB connection error'));
};

/**
 * Connects to MongoDB. Mongoose/the driver reconnect automatically after the
 * first successful connection; this function only handles the initial connect.
 */
export const connectDatabase = async () => {
  attachListeners();
  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 20,
  });
  logger.info({ db: mongoose.connection.name, host: mongoose.connection.host }, 'MongoDB connected');
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
  }
};
