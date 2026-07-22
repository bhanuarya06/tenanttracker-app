# TenantTracker

A full-stack property and tenant management platform built for landlords and property managers. Manage properties, tenants, bills, payments, and maintenance requests — all in one place.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
  - [Running with Docker](#running-with-docker)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Roles & Permissions](#roles--permissions)
- [Deployment](#deployment)
- [Branch Strategy](#branch-strategy)

---

## Features

### For Property Owners / Admins
- **Dashboard** — At-a-glance overview of properties, revenue, occupancy, and pending tasks
- **Property Management** — Add, edit, and delete properties with floor/room configuration and unit tracking
- **Tenant Management** — Full tenant lifecycle: onboarding, lease tracking, expiry alerts, and auto-invite on move-in
- **Security Deposits** — Track deposits, record deductions, and process refunds
- **Billing** — Create one-off or recurring bills, send them to tenants via email, and track payment status
- **Payments** — Record manual payments or accept online payments via Razorpay; full payment history and statistics
- **Maintenance** — Review, assign, and update the status of tenant maintenance requests
- **Analytics** — Revenue trends, occupancy rates, and bill summaries with charts

### For Tenants
- **Tenant Portal** — Dedicated dashboard to view lease details, bills, and payment history
- **Online Payments** — Pay bills directly via Razorpay
- **Maintenance Requests** — Submit and track maintenance requests in real time

### Platform
- **Multi-role Auth** — Owner, Admin, and Tenant roles with scoped access
- **OAuth 2.0** — Sign in with Google or GitHub
- **JWT Authentication** — Access tokens with refresh token rotation
- **Email Notifications** — Bills, password reset, and invite emails via SMTP
- **Rate Limiting** — Protection against brute-force and abuse
- **Recurring Bills** — Automated monthly bill generation via cron jobs

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Redux Toolkit, React Router v6, Tailwind CSS |
| Charts | Recharts |
| Backend | Node.js 20, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JWT (access + refresh tokens), OAuth 2.0 (Google, GitHub) |
| Payments | Razorpay |
| Email | Nodemailer (SMTP) |
| Scheduling | Node Cron |
| File Uploads | Multer |
| Logging | Winston, Morgan |
| Validation | Joi |
| Security | Helmet, CORS, express-rate-limit |
| Containerization | Docker, Docker Compose (local dev only) |
| Cloud | AWS Lambda, API Gateway, CloudFront, S3, SSM Parameter Store, CloudWatch |
| CI/CD | GitHub Actions + AWS SAM |

---

## Architecture

### Production (AWS)

```
                    Route 53 (tenanttracker.online)
                              │
                              ▼
                        CloudFront
                     ┌─────────┴─────────┐
              /api/* │                   │ /*
                     ▼                   ▼
            API Gateway (HTTP API)   S3 (frontend build)
                     │
                     ▼
            Lambda (Express API via
             serverless-http)
                     │
                     ▼
                MongoDB Atlas
```

The frontend is a static build served from S3. All `/api/*` requests are routed by CloudFront to API Gateway, which invokes a single Lambda function running the Express backend. There is no always-on server or container in production — compute is billed per request, which is why the app was migrated off ECS Fargate (see [Deployment](#deployment)).

### Local Development

```
┌─────────────────────────────────────────────────────┐
│                    Nginx (80/443)                    │
│          SSL termination + reverse proxy             │
└────────────────┬─────────────────┬───────────────────┘
                 │                 │
         /api/*  │                 │  /*
         /auth/* │                 │
                 ▼                 ▼
    ┌────────────────┐    ┌────────────────┐
    │  Backend API   │    │  Frontend SPA  │
    │  Express :5001 │    │  React / Vite  │
    └────────┬───────┘    └────────────────┘
             │
             ▼
    ┌────────────────┐
    │    MongoDB     │
    └────────────────┘
```

`docker-compose up` runs this Nginx + Express + MongoDB setup locally. It is not how production is deployed.

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Docker & Docker Compose (optional)
- A Razorpay account (for payment features)
- An SMTP email account (Gmail app password recommended)
- Google / GitHub OAuth app credentials (for social login)

---

### Environment Variables

Create `.env` files by copying the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**`backend/.env`**

```env
NODE_ENV=development
PORT=5001

# Database
MONGODB_URI=mongodb://localhost:27017/tenanttracker

# JWT
JWT_SECRET=your-secret-key-at-least-32-characters
JWT_EXPIRES_IN=15m

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15

# CORS
CORS_ORIGIN=http://localhost:5173

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=TenantTracker <noreply@tenanttracker.com>

# Payments
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# OAuth (Google)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OAuth (GitHub)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

FRONTEND_URL=http://localhost:5173
```

**`frontend/.env`**

```env
VITE_API_BASE_URL=http://localhost:5001
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GITHUB_CLIENT_ID=your_github_client_id
```

---

### Running Locally

**Backend**

```bash
cd backend
npm install
npm run dev        # starts on http://localhost:5001
```

**Frontend**

```bash
cd frontend
npm install
npm run dev        # starts on http://localhost:5173
```

**Seed the database (optional)**

```bash
cd backend
npm run seed
```

---

### Running with Docker

```bash
docker-compose up --build
```

The app will be available at `http://localhost` (Nginx on port 80).

---

## Project Structure

```
tenanttracker-app/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Route handlers (auth, tenants, bills, payments, ...)
│   │   ├── models/          # Mongoose models (User, Tenant, Property, Bill, ...)
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Business logic (email, Razorpay, OAuth, cron, ...)
│   │   ├── middleware/       # Auth, validation, rate limiting, uploads
│   │   ├── scripts/         # Database seed script
│   │   └── server.js        # Entry point
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/           # Route-level page components (18 pages)
│   │   ├── components/      # Shared UI components
│   │   ├── store/           # Redux slices (auth, property, tenant, bill, payment, ui)
│   │   ├── api/             # Axios API clients
│   │   └── main.jsx         # Entry point
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── nginx/                   # Nginx config + SSL
├── ecs/                     # AWS ECS task definition
├── .github/workflows/       # GitHub Actions CI/CD pipeline
└── docker-compose.yml
```

---

## API Reference

All API routes are prefixed with `/api` or `/auth`.

### Authentication `/auth`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login with email and password |
| POST | `/auth/token/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout and revoke refresh token |
| GET | `/auth/profile` | Get authenticated user profile |
| PUT | `/auth/profile` | Update profile |
| PUT | `/auth/change-password` | Change password |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Reset password using token |
| POST | `/auth/oauth/:provider/callback` | OAuth callback (google, github) |

### Properties `/api/properties`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Create a property |
| GET | `/` | List all properties (paginated) |
| GET | `/stats` | Property statistics |
| GET | `/:id` | Get property detail |
| PUT | `/:id` | Update property |
| DELETE | `/:id` | Delete property |
| GET | `/:id/units` | Get available units |

### Tenants `/api/tenants`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Add a tenant |
| GET | `/` | List tenants |
| GET | `/expiring-leases` | Tenants with upcoming lease expiry |
| GET | `/:id` | Get tenant detail |
| PUT | `/:id` | Update tenant |
| DELETE | `/:id` | Remove tenant |
| POST | `/:id/notes` | Add a note to a tenant |
| POST | `/:id/deposit/add` | Record a deposit |
| POST | `/:id/deposit/deductions` | Add a deduction |
| PUT | `/:id/deposit/refund` | Process a refund |
| GET | `/me/dashboard` | Tenant's own dashboard (tenant role) |

### Bills `/api/bills`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Create a bill |
| GET | `/` | List bills (paginated) |
| GET | `/summary` | Bill summary and statistics |
| POST | `/generate` | Trigger recurring bill generation |
| GET | `/:id` | Get bill detail |
| PUT | `/:id` | Update bill |
| DELETE | `/:id` | Delete bill |
| POST | `/:id/send` | Email bill to tenant |

### Payments `/api/payments`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Record a payment |
| GET | `/` | List payments |
| GET | `/stats` | Payment statistics |
| GET | `/:id` | Get payment detail |
| PUT | `/:id` | Update payment |
| POST | `/order` | Create a Razorpay order |
| POST | `/verify` | Verify a Razorpay payment |

### Maintenance `/api/maintenance`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Submit a maintenance request |
| GET | `/` | List maintenance requests |
| GET | `/:id` | Get request detail |
| PUT | `/:id/status` | Update request status |

### Misc

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard` | Owner dashboard summary |
| GET | `/health` | API health check |

---

## Roles & Permissions

| Feature | Owner | Admin | Tenant |
|---|:---:|:---:|:---:|
| Manage properties | ✅ | ✅ | ❌ |
| Manage tenants | ✅ | ✅ | ❌ |
| Create / send bills | ✅ | ✅ | ❌ |
| Record payments | ✅ | ✅ | ❌ |
| View analytics | ✅ | ✅ | ❌ |
| View own bills | ✅ | ✅ | ✅ |
| Pay bills online | ✅ | ✅ | ✅ |
| Submit maintenance request | ❌ | ❌ | ✅ |
| Update maintenance status | ✅ | ✅ | ❌ |
| Tenant portal | ❌ | ❌ | ✅ |

---

## Deployment

Production deployments run on **AWS Lambda + API Gateway** via GitHub Actions and AWS SAM.

### CI/CD Pipeline

The workflow in `.github/workflows/deploy-lambda.yml` triggers on push to `stableVersion` and:

1. Installs backend dependencies
2. Runs `sam build` against `template.yaml`
3. Runs `sam deploy` to update the `tenanttracker-lambda` CloudFormation stack (Lambda function, API Gateway HTTP API)
4. Frontend static assets are built and synced to the S3 bucket served behind CloudFront

### Infrastructure

| Resource | Value |
|---|---|
| Lambda Function | `tenanttracker-api` |
| Memory / Timeout | 512 MB / 60s |
| API | API Gateway HTTP API → CloudFront → `tenanttracker.online` |
| Frontend | S3 bucket, served via CloudFront |
| Secrets | AWS SSM Parameter Store |
| Logs | CloudWatch (Lambda log group) |

> **Note:** This app previously ran on ECS Fargate behind an Application Load Balancer. That stack (cluster, service, ALB, target group) was fully decommissioned — Fargate's fixed hourly costs (ALB + always-on tasks) didn't make sense for this app's actual traffic (a couple of users, a few times a month). `.github/workflows/deploy.yml` (the old ECS pipeline) is kept under `.github/workflows/disabled/` for reference only and does not run.

### Manual Docker Deployment (VPS / EC2)

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Nginx handles SSL termination using Let's Encrypt certificates mounted at `/etc/letsencrypt`.

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `stableVersion` | Active development — all feature branches merge here |
| `prod` | Production — only receives merges from `stableVersion` via PR |

**Workflow:**
1. Develop and commit on `stableVersion`
2. Open a PR from `stableVersion` → `prod` when ready to release
3. After merging, sync `stableVersion` back with `prod`:

```bash
git fetch origin
git merge origin/prod
git push origin stableVersion
```

---

## Scripts

**Backend**

```bash
npm run dev           # Start with nodemon (auto-reload)
npm start             # Start production server
npm test              # Run Jest tests
npm run test:coverage # Run tests with coverage report
npm run lint          # Lint source files
npm run seed          # Seed the database with sample data
```

**Frontend**

```bash
npm run dev           # Start Vite dev server
npm run build         # Production build
npm run preview       # Preview production build locally
npm test              # Run Vitest in watch mode
npm run lint          # Lint source files
```

---

## License

This project is private and not licensed for public use or distribution.
