# FairShare

A shared expenses app built for a group of flatmates who outgrew their spreadsheet.

Handles messy imported data, tracks who owes whom with membership date awareness, and shows the minimum payments needed to clear all debts.

---

## The Problem

A group of four flatmates—Aisha, Rohan, Priya, and Meera—tracked their shared household expenses in a spreadsheet starting in February. The situation became complicated when a friend named Dev joined them for a trip where some expenses were paid in US dollars. The spreadsheet quickly accumulated messy data, duplicate entries, a settlement logged incorrectly as an expense, and ambiguous formatting. The flatmates had no automated way to calculate final balances or agree on who owed whom.

Each flatmate has a specific requirement for the app:
Aisha wants a simple summary of transactions: "One number per person. Who pays whom. How much. Done."
Rohan wants visibility into his debts: "If the app says I owe 2300 rupees I want to see exactly which expenses make that up."
Priya wants currency corrections: "Half the trip was in dollars. The sheet pretends a dollar is a rupee. Fix it."
Sam, who moved in later, wants date-aware splitting: "I moved in mid April. March electricity should not affect my balance."
Meera wants control over data cleanup: "Clean up the duplicates but I want to approve anything the app deletes or changes."

---

## What the App Does

FairShare automates the processing of messy CSV spreadsheets by parsing rows in the browser and identifying twelve types of common data errors. Users review these flagged rows with the help of a local AI explainer that describes the problem and suggests an action. Flagged deletions or modifications do not apply automatically; instead, they enter an approval queue where an admin must approve them to preserve data integrity.

The app supports dynamic membership dates for roommates. When calculating balances, the engine excludes members who were not active in the group on the specific date of the expense. The balance engine parses splits—whether equal, unequal, percentage, or share-based—and aggregates them into a single net balance for each person. The calculation supports live and manual USD to INR conversions so that Priya's trip expenses are split using the correct historical rates.

To simplify payments, the application runs a debt-simplification algorithm that reduces the total number of transactions needed to clear all group balances. Roommates can click into any net balance to view a detailed breakdown of the exact expenses, splits, and dates that make up the total. When a payment is recorded, the engine updates the balances, and users can undo any settlement within a fixed 24-hour window to correct mistakes.

---

## Project Structure

fairshare/
├── backend/
│   ├── ai/
│   ├── approvals/
│   ├── audit/
│   ├── balances/
│   ├── expenses/
│   ├── groups/
│   ├── imports/
│   ├── notifications/
│   ├── settlements/
│   ├── users/
│   ├── expensesapp/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── asgi.py
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   │   └── ImportWizard/
│   │   ├── hooks/
│   │   ├── contexts/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── SCOPE.md
│   ├── DECISIONS.md
│   ├── AI_USAGE.md
│   └── BUILD_PLAN.md
└── README.md

---

## Requirements

Python 3.11 or higher
Node.js 18 or higher
npm 9 or higher
Git

No database setup needed for development. SQLite is used locally and requires no installation.

---

## Backend Setup

Clone the repository and navigate to the backend directory:
```bash
git clone [REPO URL]
cd fairshare/backend
```

Create a Python virtual environment:
```bash
python -m venv venv
```

Activate the virtual environment:
* Windows:
  ```cmd
  venv\Scripts\activate
  ```
* Mac or Linux:
  ```bash
  source venv/bin/activate
  ```

Install the required Python dependencies:
```bash
pip install -r requirements.txt
```

Create your local environment configuration:
```bash
cp .env.example .env
```

Apply database migrations:
```bash
python manage.py migrate
```

Create an administrative account:
```bash
python manage.py createsuperuser
```

Start the ASGI development server:
```bash
daphne -p 8000 expensesapp.asgi:application
```

The backend runs at http://localhost:8000.
The Django admin panel is accessible at http://localhost:8000/admin.
All REST endpoints are available under http://localhost:8000/api/v1/.

---

## Frontend Setup

Open a second terminal window, navigate to the frontend directory, install the node modules, and run the development build:
```bash
cd fairshare/frontend
npm install
cp .env.example .env
npm run dev
```

The React frontend runs at http://localhost:5173.

---

## Environment Variables

Backend .env.example:
```
SECRET_KEY=replace-with-a-long-random-string
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3

JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

CORS_ALLOWED_ORIGINS=http://localhost:5173

EXCHANGE_RATE_API_KEY=get-from-exchangerate-api.com
EXCHANGE_RATE_API_URL=https://v6.exchangerate-api.com/v6

OPENAI_API_KEY=get-from-platform.openai.com
OPENAI_MODEL=gpt-4o-mini
AI_MAX_CALLS_PER_HOUR=20

DJANGO_SETTINGS_MODULE=expensesapp.settings
```

For production settings, also configure:
```
DB_ENGINE=django.db.backends.mysql
DB_NAME=fairshare_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_PORT=3306
REDIS_URL=your_redis_url
CORS_ALLOWED_ORIGINS=https://your-vercel-url.vercel.app
```

Frontend .env.example:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_BASE_URL=ws://localhost:8000
```

For production build:
```
VITE_API_BASE_URL=https://your-render-url.onrender.com/api/v1
VITE_WS_BASE_URL=wss://your-render-url.onrender.com
```

---

## Importing the CSV

1. Log in to the application.
2. Open your group dashboard.
3. Click on the Import Expenses button.
4. Upload your expenses_export.csv file.
5. The application parses the spreadsheet rows client-side in the browser and displays them in a preview table.
6. Rows with data issues are highlighted:
   * Red rows represent critical errors and will be rejected.
   * Yellow rows indicate warnings that need a user decision.
   * Green rows represent clean data ready for import.
7. For any yellow row, click the Explain with AI button to read a plain English explanation of what is wrong and how to fix it.
8. Approve, edit, or reject each flagged row directly in the UI.
9. Click Confirm Import to submit the parsed entries.
10. Download the generated Import Report listing every anomaly detected and the action taken.

The CSV file cannot be modified before uploading. All corrections must be resolved inside the application interface.

---

## Running Tests

To run the backend test suite:
```bash
cd backend
python manage.py test
python manage.py test imports
python manage.py test balances
python manage.py test ai
```

To run with coverage:
```bash
pip install coverage
coverage run manage.py test
coverage report
```

To run the frontend test suite:
```bash
cd frontend
npm run test
npm run test src/utils/__tests__/anomalyDetector.test.ts
npm run test src/tests/anomalyCard.test.tsx
```

---

## API Reference

Auth endpoints:
* `POST   /api/v1/users/register/` - Register new user
* `POST   /api/v1/users/login/` - JWT login
* `POST   /api/v1/users/logout/` - Logout and blacklist refresh token
* `POST   /api/v1/users/token/refresh/` - Refresh JWT access token
* `GET    /api/v1/users/me/` - Retrieve authenticated user profile
* `PUT    /api/v1/users/change-password/` - Update password with validation

Group endpoints:
* `GET    /api/v1/groups/` - List user groups
* `POST   /api/v1/groups/` - Create new group
* `GET    /api/v1/groups/:id/` - Get group details
* `PUT    /api/v1/groups/:id/` - Update group settings
* `DELETE /api/v1/groups/:id/` - Delete group
* `GET    /api/v1/groups/:id/members/` - List group members
* `POST   /api/v1/groups/:id/members/` - Add member with join date
* `PATCH  /api/v1/groups/:id/members/:uid/` - Update member dates/roles
* `DELETE /api/v1/groups/:id/members/:uid/` - Remove member
* `GET    /api/v1/groups/:id/balances/` - Calculate group balances
* `GET    /api/v1/groups/:id/analytics/` - Group spending analytics

Expense endpoints:
* `GET    /api/v1/expenses/` - List group expenses
* `POST   /api/v1/expenses/` - Create new expense with splits
* `GET    /api/v1/expenses/:id/` - Retrieve specific expense
* `PUT    /api/v1/expenses/:id/` - Edit expense
* `DELETE /api/v1/expenses/:id/` - Delete expense (triggers approval queue)
* `GET    /api/v1/expenses/:id/comments/` - Get comments on expense
* `POST   /api/v1/expenses/:id/comments/` - Add comment

Import endpoints:
* `POST   /api/v1/imports/csv/parse/` - Parse CSV file and return rows
* `POST   /api/v1/imports/csv/` - Confirm and execute import of valid rows

Balance endpoints:
* `GET    /api/v1/balances/personal/` - Get personal balance summary
* `GET    /api/v1/balances/personal/breakdown/` - Get transaction-level balance breakdown
* `GET    /api/v1/balances/settlement-plan/` - Generate simplified debt settlement plan

Settlement endpoints:
* `GET    /api/v1/settlements/` - List recorded settlements
* `POST   /api/v1/settlements/` - Record a payment between roommates
* `DELETE /api/v1/settlements/:id/` - Undo a settlement (allowed within 24 hours)

Approval endpoints:
* `GET    /api/v1/approvals/` - List pending approvals
* `POST   /api/v1/approvals/:id/approve/` - Approve deletion request
* `POST   /api/v1/approvals/:id/reject/` - Reject deletion request

Notification endpoints:
* `GET    /api/v1/notifications/` - List in-app notifications
* `POST   /api/v1/notifications/mark-read/` - Mark specific notification as read
* `POST   /api/v1/notifications/mark-all-read/` - Mark all notifications as read

AI endpoints:
* `POST   /api/v1/ai/explain-anomaly/` - Explain CSV anomaly using OpenAI

WebSocket endpoint:
* `ws://localhost:8000/ws/notifications/?token=[JWT_TOKEN]` - Real-time notification updates

---

## Deployment

Backend on Render:
1. Create a new Web Service on render.com and connect your GitHub repository.
2. Set the build command: `pip install -r requirements.txt`.
3. Set the start command: `daphne -b 0.0.0.0 -p $PORT expensesapp.asgi:application`.

4. Define your environment variables matching `.env.example`.
5. Set `DJANGO_SETTINGS_MODULE` to `expensesapp.settings`.

Frontend on Vercel:
1. Create a new project on vercel.com and select the frontend directory of your repository.
2. Set the build command: `npm run build`.
3. Set the output directory: `dist`.
4. Configure `VITE_API_BASE_URL` pointing to your Render Web Service domain `/api/v1`.
5. Configure `VITE_WS_BASE_URL` pointing to your Render Web Service domain.

---

## Known Limitations

The application only supports INR and USD. Extending support to additional currencies requires updating the currency service views and modifying the decimal conversion steps inside the balance calculation script.

Exchange rates are fetched once during the CSV import and stored permanently per expense record. Changes in live market rates after the import do not affect historical calculations.

Placeholder profiles created for unrecognized CSV names do not have login credentials. An administrator must invite them by email to register their account and merge their profile.

The undo window for recorded payments is hardcoded to 24 hours inside the settlements view and cannot be customized by group administrators.

Notifications are strictly in-app. Email and SMS notification microservices are not integrated.

---

## AI Tools Used

GitHub Copilot was used to generate code suggestions, write tests, and draft documentation. All generated code was reviewed and modified before use.

OpenAI GPT-4o-mini is integrated into the CSV import workflow. When a row fails validation, the user can request an explanation. The raw row dictionary is sent to the backend, which proxies it to OpenAI and returns a plain English explanation. The API key is stored in the backend environment and is never exposed to the client browser.

Full details of prompts used and AI mistakes caught during development are documented in AI_USAGE.md.

---

## License

MIT
