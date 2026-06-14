# DECISIONS.md

This file documents the significant decisions made while building FairShare, why each decision was made, and what trade-offs were accepted.

---

### Decision 1: SQLite for development, MySQL for production

**The situation**
I needed a database that was easy to set up locally but production-ready when deployed.

**Options I considered**

Option A: PostgreSQL for both environments
  This would mean identical environments in development and production. The downside is PostgreSQL needs to be installed and configured locally, which adds setup friction for anyone cloning the repo.

Option B: SQLite for development, MySQL for production
  SQLite requires zero installation. Django handles it out of the box. MySQL in production is widely supported on free hosting platforms.

Option C: SQLite for both environments
  Simple but not appropriate for production. SQLite does not handle concurrent writes well and is not suitable for a deployed app with multiple users.

**What I chose**
Option B. The Django ORM abstracts the database layer so switching between SQLite and MySQL requires only a settings change. The trade-off is that there can be minor behaviour differences between SQLite and MySQL, particularly around date handling and case sensitivity. I tested the queries, especially the balance engine and membership date checks, against both databases.

**Code affected**
* config/settings/development.py
* config/settings/production.py

---

### Decision 2: JWT over session authentication

**The situation**
I needed an authentication method suitable for a decoupled single page application in React.

**Options I considered**

Option A: Session-based cookie authentication
  Django's built-in session system. Requires configuring CSRF tokens and setting up domain/cookie controls, which gets complicated when frontend and backend are hosted on separate domains.

Option B: Token-based stateless authentication (JWT)
  Stores authentication credentials on the client side. The backend does not need to store session states, making it highly portable.

**What I chose**
Option B. JWT tokens are standard for decoupled web applications. I configured simplejwt with access tokens that expire in 15 minutes and refresh tokens that last 7 days. On logout, the refresh token is blacklisted.

**Code affected**
* backend/expensesapp/settings.py
* backend/users/views.py
* frontend/src/lib/api.ts

---

### Decision 3: Soft delete for expenses

**The situation**
Deleting an expense affects the balance equations of multiple roommates, so transactions should not disappear without tracking.

**Options I considered**

Option A: Hard delete
  Delete rows directly. Simple to implement but makes audit logging and approval logic impossible.

Option B: Soft delete with approval queue
  Mark expenses as `is_deleted` and store the action in an approval queue. Roommate deletions require admin approval to execute.

**What I chose**
Option B. It guarantees accountability. If Meera wants to dispute a deletion, she can review it in the queue. Deletions do not affect balances until approved.

**Code affected**
* backend/expenses/models.py
* backend/expenses/views.py
* backend/approvals/models.py

---

### Decision 4: Membership dates are inclusive on both ends

**The situation**
I had to determine whether roommates should share expenses on the exact days they move in or out.

**Options I considered**

Option A: Inclusive boundaries
  Users are active on the join date and leave date.

Option B: Exclusive boundaries
  Activity starts the day after joining and ends the day before leaving.

**What I chose**
Option A. If a roommate is present on the day of an expense, they are responsible for that day's share. This aligns with tenancy agreements.

**Code affected**
* backend/groups/models.py
* backend/expenses/serializers.py

---

### Decision 5: Rounding remainder goes to payer

**The situation**
Splitting a bill three ways can create fractions of a paisa that do not sum to the total.

**Options I considered**

Option A: Allocate to the first member in alphabetical order
  Simplistic but arbitrary.

Option B: Allocate the remainder to the payer
  The payer is the person fronting the funds, so resolving the rounding remainder to them makes them whole.

**What I chose**
Option B. If the payer is not active in that specific split, the remainder is allocated to the active member with the largest share.

**Code affected**
* backend/expenses/serializers.py

---

### Decision 6: Debt simplification is always on

**The situation**
Flatmates want to clear balances with as few transactions as possible.

**Options I considered**

Option A: Manual settlement selection
  Flatmates resolve individual debts manually, creating many small transactions.

Option B: Automated debt simplification
  Run a minimization algorithm (similar to Splitwise) to simplify debts to the minimum transactions.

**What I chose**
Option B. Aisha wanted a single payment path. Simplification provides this directly. Rohan's drill-down view is available if users want to see the underlying transactions that build the simplified debt.

**Code affected**
* backend/balances/views.py
* frontend/src/pages/BalancePage.tsx

---

### Decision 7: Settlement undo window is 24 hours fixed

**The situation**
Flatmates need a way to correct misreported payments, but history should eventually lock to prevent tampering.

**Options I considered**

Option A: No undo option
  Requires manual counter-repayment entries to correct errors.

Option B: Fixed 24-hour undo window
  Allows roommates to delete settlement records within 24 hours of creation, after which the transaction is locked.

**What I chose**
Option B. It balances mistake correction with data finality. 24 hours provides enough time to notice a wrong digit without keeping balances in limbo.

**Code affected**
* backend/settlements/views.py

---

### Decision 8: Duplicate row definition

**The situation**
I needed an algorithm to detect duplicates in imports without catching separate transactions that look similar.

**Options I considered**

Option A: Match on description and amount only
  Causes false positives (e.g. flagging two different grocery bills of the same amount in a single week).

Option B: Match on date, cleaned amount, trimmed description, and payer
  Requiring all four matches ensures high precision.

**What I chose**
Option B. This reduces false flags and identifies entries that are truly identical.

**Code affected**
* frontend/src/utils/anomalyDetector.ts
* backend/imports/views.py

---

### Decision 9: Negative amounts require user decision

**The situation**
Spreadsheets can contain negative amounts representing returns or entry typos.

**Options I considered**

Option A: Auto-treat as refund credit
  Speeds up imports but risks credit errors if the minus sign was a typo.

Option B: Flag and require manual selection
  Prompts the user to specify if the row is a refund or should be skipped.

**What I chose**
Option B. Balances must be correct, so manual validation is preferred over automated guesses.

**Code affected**
* frontend/src/utils/anomalyDetector.ts
* backend/imports/views.py

---

### Decision 10: Unknown members become placeholder users

**The situation**
The CSV spreadsheet has names like Dev who is not registered in the group.

**Options I considered**

Option A: Reject the import rows
  Prevents missing user issues but loses real expense data.

Option B: Auto-create guest placeholder profiles
  Registers a placeholder account (`is_placeholder = True`) to track balances.

**What I chose**
Option B. Keeps the data intact. Placeholders can be invited to create real profiles and merge histories later.

**Code affected**
* backend/imports/views.py
* backend/users/models.py

---

### Decision 11: Exchange rate fetched once at import time

**The situation**
USD transactions need conversion, but live exchange rates fluctuate daily.

**Options I considered**

Option A: Convert dynamically on every page load
  Means historical group balances would shift daily as rates move.

Option B: Query and store the rate once at import
  Freezes the conversion value using the rate valid on the invoice date.

**What I chose**
Option B. It ensures historical balances are final and predictable. If the exchange rate API is down, the user can input the conversion rate manually.

**Code affected**
* backend/imports/views.py
* backend/expenses/serializers.py

---

### Decision 12: AI explanation calls go through backend

**The situation**
OpenAI API keys must be kept secure.

**Options I considered**

Option A: Request directly from the React frontend
  Exposes the API key in headers to any user inspecting browser network requests.

Option B: Proxy requests through the Django backend
  The key stays in the server environment variables.

**What I chose**
Option B. It keeps keys secure. We also implemented rate-limiting (20 calls per hour) on the backend endpoint to prevent key abuse.

**Code affected**
* backend/ai/views.py
* frontend/src/services/aiService.ts
