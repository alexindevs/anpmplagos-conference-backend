import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(4000),

  DATABASE_URL: Joi.string().required(),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(0),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY_DAYS: Joi.number().default(7),

  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  ADMIN_CODE: Joi.string().required(),

  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  PAYMENT_MODE: Joi.string().valid('paystack', 'manual').default('paystack'),
  PAYSTACK_SECRET_KEY: Joi.string().when('PAYMENT_MODE', {
    is: 'paystack',
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  PAYSTACK_PUBLIC_KEY: Joi.string().allow('').optional(),
  PAYSTACK_BASE_URL: Joi.string().default('https://api.paystack.co'),
  PAYSTACK_CALLBACK_URL: Joi.string().required(),

  FRONTEND_URL: Joi.string().required(),

  SUPPORT_EMAILS: Joi.string().optional().allow(''),
  SUPPORT_EMAIL_FROM: Joi.string().optional().allow(''),
  SUPPORT_SMTP_HOST: Joi.string().optional().allow(''),
  SUPPORT_SMTP_PORT: Joi.string().optional().allow(''),
  SUPPORT_SMTP_USER: Joi.string().optional().allow(''),
  SUPPORT_SMTP_PASS: Joi.string().optional().allow(''),
}).unknown(true);
