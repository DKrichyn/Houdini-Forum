import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,

  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    pass: process.env.DB_PASS || process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES || process.env.JWT_EXPIRES_IN || '7d',
  },

  appUrl: process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3000',

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',

  emailFrom: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@usof.local',

  smtp: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    secure: String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true',
  },
};
