# SplitSmart — Shared Expenses Manager

> Simple, reliable shared-expenses for flatmates — clean balances, membership-aware calculations, and robust CSV import with anomaly detection.

[![Python](https://img.shields.io/badge/python-3.11%2B-blue)](https://www.python.org/)
[![Django](https://img.shields.io/badge/django-4.2-green)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/react-18-blue)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Deployed](https://img.shields.io/badge/deployed-live-brightgreen)](https://splitsmart.vercel.app)

Live demo: https://splitsmart.vercel.app

GitHub repo: https://github.com/yourusername/splitsmart

---

## Table of Contents

- [Project Banner](#splitsmart--shared-expenses-manager)
- [Problem Statement](#problem-statement)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [CSV Import Guide](#csv-import-guide)
- [Running Tests](#running-tests)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Key Decisions](#key-decisions)
- [AI Tools Used](#ai-tools-used)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)
- [License](#license)

---

## Problem Statement

Flatmate finances get messy fast. `SplitSmart` was built as an internship assignment to solve a realistic shared-expense spreadsheet problem faced by six flatmates (Aisha, Rohan, Priya, Meera, Sam, Dev). Requirements included:

- Aisha: "One number per person" — concise per-person balance views.
- Rohan: Drill-down capability to inspect exactly which expenses created any balance.
- Priya: Multi-currency support (USD + INR) and consistent conversion.
- Sam: Membership-date-aware balances (Sam joined/left mid-period).
- Meera: No destructive action without approval — an approval queue for deletions/edits.

The app solves messy CSV exports, multi-currency, dynamic membership windows, unclear balances, and provides an auditable import workflow.

---

## Features

### Authentication

- ✅ JWT login / register / logout (backend: `djangorestframework-simplejwt`) 🔐
- ✅ Auto token refresh
- ✅ Protected routes (frontend)

### Groups

- ✅ Create and manage groups 👥
- ✅ Dynamic membership (`joined_at` / `left_at`) with inclusive date handling
- ✅ Role-based access (Admin / Member)
- ✅ Past members visible with dates

### Expenses

- ✅ Four split types: `Equal`, `Unequal`, `Percentage`, `Share` 💸
- ✅ Multi-currency: USD and INR (live exchange rate at import)
- ✅ Live exchange rate via an external API
- ✅ Soft delete with approval queue (Meera's requirement) 🟡
- ✅ Expense comments thread

### CSV Importer

- ✅ Client-side preview with `PapaParse` and inline edits 🟢
- ✅ 12+ anomaly types detected (listed below)
- ✅ Two-step import: preview → confirm
- ✅ Full import report generated (JSON)
- ✅ Approval queue for destructive changes

### Balance Engine

- ✅ Membership-date-aware calculations
- ✅ Debt simplification algorithm
- ✅ Group balance + personal summary
- ✅ Drill-down: which expenses make up a balance 🔎

### Settlements

- ✅ Record payments
- ✅ Undo within 24 hours
- ✅ Settlement history

### Advanced

- ✅ Approval queue
- ✅ Full audit log
- ✅ Real-time notifications (WebSocket) ⚡
- ✅ Analytics dashboard (`Recharts`) 📊
- ✅ AI Smart Split Suggester (OpenAI, configurable) 🤖
- ✅ Placeholder users (e.g., Dev as guest)

---

## Project Structure

```
splitsmart/
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── users/
│   │   ├── groups/
│   │   ├── expenses/
│   │   ├── imports/
│   │   ├── balances/
│   │   ├── settlements/
│   │   ├── approvals/
│   │   ├── audit/
│   │   └── notifications/
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── manage.py
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── services/
│   │   ├── utils/
│   │   └── tests/
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── SCOPE.md
│   ├── DECISIONS.md
│   ├── AI_USAGE.md
│   └── BUILD_PLAN.md
└── README.md
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm 9+
- Git
- MySQL (production)
- Redis (production)

---

## Local Development Setup

Follow these exact steps to run the app locally.

### Backend setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/splitsmart.git
cd splitsmart

# 2. Create and activate virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate

# 3. Install dependencies
cd backend
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 4. Copy environment file
cp .env.example .env
# Edit .env with your values (see Environment Variables section)

# 5. Run database migrations
python manage.py migrate

# 6. Create superuser (admin account)
python manage.py createsuperuser

# 7. Load sample data (optional)
python manage.py loaddata fixtures/sample_data.json

# 8. Start backend server
python manage.py runserver
# OR with Daphne (supports WebSocket):
daphne -p 8000 config.asgi:application

# Backend runs at: http://localhost:8000
# Admin panel:      http://localhost:8000/admin/
# API base URL:     http://localhost:8000/api/v1/
```

### Frontend setup

```bash
# 1. Open new terminal, go to frontend folder
cd frontend

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env
# Edit .env with your values

# 4. Start development server
npm run dev

# Frontend runs at: http://localhost:5173
```

---

## Environment Variables

Two example `.env` files are provided below. Copy the appropriate file and fill values.

### Backend `.env.example`

```env
# Django
SECRET_KEY=your-secret-key-here-generate-with-django
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (SQLite for dev — no config needed)
# For production MySQL:
DB_ENGINE=django.db.backends.mysql
DB_NAME=splitsmart_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=3306

# JWT Settings
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://splitsmart.vercel.app

# Redis (only needed in production for WebSocket)
REDIS_URL=redis://localhost:6379

# Currency Exchange Rate API
EXCHANGE_RATE_API_KEY=your-exchangerate-api-key
EXCHANGE_RATE_API_URL=https://v6.exchangerate-api.com/v6

# OpenAI (for Smart Split Suggester)
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini

# Email (for placeholder user invites)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True

# Environment
DJANGO_SETTINGS_MODULE=config.settings.development
```

### Frontend `.env.example`

```env
# API
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_BASE_URL=ws://localhost:8000

# For production:
# VITE_API_BASE_URL=https://splitsmart-api.onrender.com/api/v1
# VITE_WS_BASE_URL=wss://splitsmart-api.onrender.com
```

---

## CSV Import Guide

CSV import is a two-step preview/confirm flow. The client parses CSV using `PapaParse` and runs local anomaly detection. Clean rows are importable; flagged rows require review.

Steps:

1. Log in to the app
2. Open your group → click **Import Expenses**
3. Upload `expenses_export.csv`
4. App parses CSV client-side instantly — shows preview table
5. Review anomaly report:
   - 🔴 Red rows = errors (missing fields, unreadable)
   - 🟡 Yellow rows = warnings (duplicates, negative amounts, USD)
   - 🟢 Green rows = clean, ready to import
6. Fix or approve flagged rows (inline edit)
7. Click **Confirm Import**
8. Download Import Report (JSON)

Anomaly types detected (12):

1. DUPLICATE_ROW
2. NEGATIVE_AMOUNT
3. SETTLEMENT_AS_EXPENSE
4. CURRENCY_MISMATCH
5. MEMBER_NOT_IN_GROUP
6. DATE_OUTSIDE_MEMBERSHIP
7. MISSING_REQUIRED_FIELD
8. INCONSISTENT_DATE_FORMAT
9. AMOUNT_FORMAT_ISSUE
10. SPLIT_SUM_MISMATCH
11. DUPLICATE_SETTLEMENT
12. UNKNOWN_SPLIT_TYPE

---

## Running Tests

### Backend tests

```bash
cd backend
python manage.py test

# Run specific app tests
python manage.py test apps.imports
python manage.py test apps.balances

# Coverage
pip install coverage
coverage run manage.py test
coverage report
coverage html
```

### Frontend tests

```bash
cd frontend
npm test

# Run anomaly detector tests specifically (Vitest)
npm test -- --testPathPattern="anomalyDetector.test"

# Watch mode
npm test -- --watch
```

Key scenarios covered by tests (examples): membership-window logic, multi-currency conversion, duplicate detection, negative-amount handling, split validation, settlement undo rules.

---

## API Documentation (selected endpoints)

AUTH

```
POST   /api/v1/auth/register/
POST   /api/v1/auth/login/
POST   /api/v1/auth/logout/
POST   /api/v1/auth/token/refresh/
GET    /api/v1/auth/me/
PUT    /api/v1/auth/change-password/
```

GROUPS

```
GET    /api/v1/groups/
POST   /api/v1/groups/
GET    /api/v1/groups/:id/
PUT    /api/v1/groups/:id/
DELETE /api/v1/groups/:id/
GET    /api/v1/groups/:id/members/
POST   /api/v1/groups/:id/members/
PATCH  /api/v1/groups/:id/members/:uid/
DELETE /api/v1/groups/:id/members/:uid/
GET    /api/v1/groups/:id/balances/
GET    /api/v1/groups/:id/analytics/
```

EXPENSES

```
GET    /api/v1/expenses/
POST   /api/v1/expenses/
GET    /api/v1/expenses/:id/
PUT    /api/v1/expenses/:id/
DELETE /api/v1/expenses/:id/
GET    /api/v1/expenses/:id/comments/
POST   /api/v1/expenses/:id/comments/
```

IMPORT

```
POST   /api/v1/import/upload/
GET    /api/v1/import/:session_id/report/
POST   /api/v1/import/:session_id/confirm/
POST   /api/v1/import/:session_id/cancel/
```

BALANCES

```
GET    /api/v1/balances/personal/
GET    /api/v1/balances/personal/breakdown/
GET    /api/v1/balances/settlement-plan/
```

SETTLEMENTS

```
GET    /api/v1/settlements/
POST   /api/v1/settlements/
DELETE /api/v1/settlements/:id/
```

APPROVALS

```
GET    /api/v1/approvals/
POST   /api/v1/approvals/:id/approve/
POST   /api/v1/approvals/:id/reject/
```

WEBSOCKET

```
ws://<host>/ws/notifications/?token=<jwt_access_token>
```

---

## Deployment

### Backend (Render)

```bash
# 1. Push code to GitHub
# 2. On render.com create a new Web Service linking the repository
# 3. Build command:
pip install -r requirements.txt
# 4. Start command:
daphne -p $PORT config.asgi:application
# 5. Set environment variables from .env.example in Render dashboard
# 6. Add managed MySQL (PlanetScale) or connect external
# 7. Deploy
```

### Frontend (Vercel)

```bash
# 1. Go to vercel.com and import the GitHub project
# 2. Select the `frontend` folder
# 3. Framework: Vite
# 4. Build command: npm run build
# 5. Output directory: dist
# 6. Set env vars (VITE_API_BASE_URL, VITE_WS_BASE_URL)
# 7. Deploy
```

### Database (PlanetScale)

```bash
# 1. Create a database on PlanetScale
# 2. Add connection string to Render environment variables
# 3. Run migrations on deployed instance (via a one-off or CI runner):
python manage.py migrate
```

---

## Key Decisions

- SQLite for dev (zero setup) and MySQL for production (compatibility with PlanetScale).
- Soft delete with an approval queue instead of hard delete — preserves auditability and lets Meera approve destructive actions.
- Membership dates are inclusive; this simplifies the user's expectation for monthly cutoffs.
- Any rounding remainder goes to payer to keep integer-safe accounting.
- Debt simplification is always enabled to minimize inter-person transactions.
- Settlement undo window: 24 hours (balance safety vs UX).

See `docs/DECISIONS.md` for the full rationale.

---

## AI Tools Used

- GitHub Copilot — primary development collaborator
- OpenAI GPT-4o-mini — used for the Smart Split Suggester feature (configurable via `OPENAI_API_KEY`)

See `docs/AI_USAGE.md` for prompts, guardrails, and mistakes caught during development.

---

## Known Limitations

- Only INR and USD supported out of the box.
- Web only (responsive), no native mobile app.
- Exchange rate fetched at import time (not live per expense).
- Placeholder users (guests) cannot log in.
- Settlement undo window fixed at 24 hours (not configurable yet).
- No recurring expense support.
- Email notifications configurable but not enabled by default.

---

## Future Improvements

- Mobile app (React Native)
- Expand supported currencies
- Recurring expenses
- Email / SMS notifications
- OCR receipt scanning
- Bank integrations for auto-settlement
- Multi-language support

---

## Contributing

1. Fork the repo
2. Create a feature branch `feature/your-feature-name`
3. Open a PR against `main`

Guidelines:

- Branch naming: `feature/*`, `fix/*`, `docs/*`
- Commit messages: `feat:`, `fix:`, `docs:`, `test:`, `chore:`
- Run tests and linters before opening PR

---

## License

This project is licensed under the MIT License — see the `LICENSE` file.

---

If you need I can also generate a `CONTRIBUTING.md`, CI configuration for running backend/frontend tests on each PR, and a `docs/SCOPE.md` that lists the 12 anomaly definitions in detail.
