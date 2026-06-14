# BUILD_PLAN.md

---

## Product Research

Before writing code, I analyzed shared expense managers like Splitwise to understand how to design the balance engines and database relationships. The core problem was modeling dynamic roommate memberships, multi-currency splits, and settlement logs. I simplified the requirements to focus specifically on flatmate utility bills and common household costs.

I evaluated how to process the `expenses_export.csv` file without manual pre-editing. The file contained mixed date formats, guest names not in the system, USD amounts, and duplicate transactions. The application was designed to parse these raw records directly, flag issues, and provide an interface to resolve anomalies prior to DB insertion.

---

## Architecture

### Backend
The backend uses Django 4.2 with Django REST Framework. The logic is divided into modular apps: `users` (custom accounts), `groups` (household settings), `expenses` (shared spending), `imports` (CSV parser), `balances` (split engine), `settlements` (payment tracking), `approvals` (soft delete queue), `audit` (audit logs), `notifications` (alerts), and `ai` (OpenAI proxy).

### Database
The database uses SQLite locally and MySQL in production. The key relationship is managed by the `GroupMember` table, which tracks roommate lease start (`joined_at`) and end (`left_at`) dates. The balance calculations query this table on each expense date to verify splits.

### API Design
The REST API uses token-based stateless authentication (JWT via simplejwt). Access tokens expire in 15 minutes, and refresh tokens last 7 days. Every endpoint returns a standard JSON wrapper:
```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "errors": []
}
```

### Frontend
The frontend is built using React 18 and Vite. It uses React Router v6 for page routing and TailwindCSS for styling. Global authentication is managed via an AuthContext, and Axios interceptors automatically attach the JWT token to headers and handle silent token refreshes.

### Deployment
The apps are deployed separately. The Django ASGI server runs on Render with a Daphne start command, and the React static build is hosted on Vercel. This decoupling isolates the server load and ensures fast static assets delivery.

---

## Build Phases

### Phase 1: Django project setup and custom User model
I initialized the Django project with custom settings configurations and configured the custom User model using UUIDs as primary keys. The hardest part was overriding the default auth configurations early to prevent migration table conflicts. I learned how crucial it is to define a custom User model before running the first database migration.

### Phase 2: JWT authentication endpoints
I integrated the simplejwt package and wrote views for user registration, login, logout, and token refresh. The hardest part was verifying the token blacklist configuration during logout requests. I learned how to set up client cookies securely to store tokens.

### Phase 3: Groups and dynamic membership
I implemented group models and members management, enabling administrators to add roommates with specific lease dates. The hardest part was configuring date validation rules to prevent overlapping membership ranges for the same user. I learned how to query dynamic date ranges using Django's lookup filters.

### Phase 4: Expenses with all four split types
I wrote the Expense models and serializers to handle Equal, Unequal, Percentage, and Share splits. The hardest part was verifying that splits sum exactly to the total amount within a decimal precision of one cent. I learned how to use Python's Decimal library to prevent float arithmetic errors.

### Phase 5: CSV importer with anomaly detection
I built the parser logic using Python's csv module on the backend and PapaParse on the frontend to detect the 12 anomaly types. The hardest part was mapping the user names in the CSV file to database profiles when names had typos or were not in the group. I learned that client-side previews improve usability by letting users see validation issues before submitting.

### Phase 6: Balance engine and debt simplification
I developed the script that sums up splits and settlements to determine net group balances and runs a transaction minimization algorithm. The hardest part was verifying the math assertions when calculating splits with dynamic lease dates. I learned that simplified debt calculations significantly reduce transaction overhead for roommates.

### Phase 7: Settlements with undo
I wrote the payment logging endpoints and configured the settlement undo action. The hardest part was validating that settlements could only be rolled back within the 24-hour limit relative to the transaction timestamp. I learned how to safely recalculate group balances during settlement reversals.

### Phase 8: Approval queue and audit log
I built the queue-based approval endpoints and the audit logs framework. The hardest part was serializing dynamic state modifications inside the JSON fields of the approval queue records. I learned how to log sensitive record state histories before applying deletions.

### Phase 9: Notifications and WebSocket
I set up Django Channels and Daphne to broadcast in-app messages to flatmates when changes occur. The hardest part was validating JWT tokens over the WebSocket connection handshake. I learned that real-time sync makes shared dashboards feel more responsive.

### Phase 10: AI anomaly explainer
I created the backend `ai` app to call OpenAI's API and proxy responses back to the frontend. The hardest part was designing the 12 prompt templates to return plain English text without system jargon. I learned that caching responses on the client side prevents redundant API calls and controls token usage.

### Phase 11: React frontend
I built the React dashboard pages, import forms, and split validation UI. The hardest part was implementing the inline spreadsheet editor inside the preview list. I learned that clear error highlighting makes complex CSV imports easier for non-technical users.

### Phase 12: Deployment
I deployed the backend to Render and the frontend to Vercel, verifying CORS headers and environment variables. The hardest part was configuring Daphne to handle both HTTP and WebSocket protocols under Render's single-port proxy. I learned that separate environment configurations are necessary to manage production databases securely.

---

## Trade-offs

### What was simplified
* Currency support: Only INR and USD are supported. Multi-currency conversions are handled at import time.
* Auth: Authentication is strictly password-based; social login integrations were omitted.
* Notification dispatch: Notifications are strictly in-app; we did not integrate external SMS or email gateways.
* Receipt scans: No OCR receipt processing was implemented; all invoices must be typed or imported via CSV.

### What was hardcoded
* Currency base: The base currency of the balance engine is hardcoded to INR.
* Undo window: The settlement deletion window is locked at 24 hours.
* Rate limits: The AI explainer rate limits are hardcoded to 20 calls per hour.

### What was avoided
* PDF reports: Roommates cannot export balances to PDF; reports are displayed directly in the dashboard list.
* Live conversion on page load: The app does not query currency values on page load to prevent slow rendering times.

### What would improve with more time
* Settlement matching: Auto-detecting matches between settlements and group expenses.
* Dynamic rates: Fetching historical exchange rates matching the exact invoice date from the CSV.
* Email invitations: Automatically emailing invitations to users created as placeholder accounts.
* Advanced charts: Expanding dashboard statistics with Recharts.
