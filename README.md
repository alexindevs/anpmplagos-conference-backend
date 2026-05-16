# ANPMP Conference Backend

Backend API for the Association of Nigerian Private Medical Practitioners (ANPMP) Lagos State Branch conference management platform.

## Tech Stack

- **NestJS** — Backend framework
- **Prisma** — ORM with PostgreSQL
- **Redis** — Caching and session token tracking (via `cache-manager-ioredis-yet`)
- **JWT + Passport** — Authentication
- **Paystack** — Payment processing
- **Cloudinary / Backblaze B2** — File storage (configurable)
- **class-validator / class-transformer** — DTO validation
- **bcrypt** — Password hashing
- **Winston + Loki** — Structured logging

## Documentation

- **Interactive API** — With the app running in a non-production environment, open **`/api/docs`** for Swagger UI (routes, request bodies, auth). Swagger is disabled in `NODE_ENV=production`.
- **Written guides** — Topic guides (exhibitor portal, payments, migrations, admin flows, etc.) live in the **`docs/`** directory.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in all required values:

```bash
cp .env.example .env
```

### Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

## Running the App

```bash
# Development
npm run start

# Watch mode
npm run start:dev

# Production
npm run start:prod
```

## Environment Variables

### Core

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `PORT` | No | `4000` | HTTP listen port |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Min 32 characters (256-bit) |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token lifetime (e.g. `15m`, `1h`) |
| `JWT_REFRESH_EXPIRY_DAYS` | No | `7` | Refresh token lifetime in days |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated list of allowed origins |
| `FRONTEND_URL` | Yes | — | Used in payment redirect URLs |
| `ADMIN_CODE` | Yes | — | Secret code for admin account creation |

### Redis

Redis is required for caching and admin claim token single-use enforcement.

Supply either a URL or individual connection fields:

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `REDIS_URL` | No | — | Full Redis URL (e.g. `redis://:password@host:6379/0`). Takes priority over individual fields if set. |
| `REDIS_HOST` | No | `localhost` | Used if `REDIS_URL` is not set |
| `REDIS_PORT` | No | `6379` | Used if `REDIS_URL` is not set |
| `REDIS_PASSWORD` | No | `""` | Used if `REDIS_URL` is not set |
| `REDIS_DB` | No | `0` | Database index; used if `REDIS_URL` is not set |

### Storage

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `STORAGE_PROVIDER` | No | `cloudinary` | `cloudinary` or `backblaze` |
| `CLOUDINARY_CLOUD_NAME` | Yes | — | Required regardless of storage provider |
| `CLOUDINARY_API_KEY` | Yes | — | Required regardless of storage provider |
| `CLOUDINARY_API_SECRET` | Yes | — | Required regardless of storage provider |
| `BACKBLAZE_ENDPOINT` | If `backblaze` | — | S3-compatible endpoint URL |
| `BACKBLAZE_BUCKET_NAME` | If `backblaze` | — | |
| `BACKBLAZE_KEY_ID` | If `backblaze` | — | Application Key ID |
| `BACKBLAZE_APP_KEY` | If `backblaze` | — | Application Key |
| `BACKBLAZE_REGION` | No | — | Optional; some endpoints infer it |

### Payments

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `PAYMENT_MODE` | No | `paystack` | `paystack` or `manual` |
| `PAYSTACK_SECRET_KEY` | If `paystack` | — | Server-side secret key |
| `PAYSTACK_PUBLIC_KEY` | No | — | Optional; for client reference |
| `PAYSTACK_BASE_URL` | No | `https://api.paystack.co` | |
| `PAYSTACK_CALLBACK_URL` | Yes | — | Redirect URL after payment |

### Support / Email

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `SUPPORT_EMAILS` | No | — | Comma-separated recipient addresses |
| `SUPPORT_EMAIL_FROM` | No | — | Sender address |
| `SUPPORT_SMTP_HOST` | No | — | SMTP server hostname |
| `SUPPORT_SMTP_PORT` | No | — | SMTP port (as string, e.g. `587`) |
| `SUPPORT_SMTP_USER` | No | — | SMTP username |
| `SUPPORT_SMTP_PASS` | No | — | SMTP password |

## Storage Migration

To migrate existing files from Cloudinary to Backblaze B2:

```bash
npx ts-node scripts/migrate-to-backblaze.ts
```

Requires both Cloudinary and Backblaze credentials in `.env`. The script downloads each file from Cloudinary and re-uploads it to the configured Backblaze bucket.
