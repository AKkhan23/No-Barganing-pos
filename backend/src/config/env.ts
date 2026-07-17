import dotenv from 'dotenv';
dotenv.config();

export const env = {
  MONGO_URL: process.env.MONGO_URL || 'mongodb://localhost:27017',
  DB_NAME: process.env.DB_NAME || 'no_bargaining_pos',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@nobargaining.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  CORS_ORIGINS: process.env.CORS_ORIGINS || '*',
  PORT: parseInt(process.env.PORT || '8001', 10),
};
