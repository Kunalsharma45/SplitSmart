# Build Plan

## Overview

This plan follows the required implementation phases in strict order and breaks each phase into concrete tasks.

## Phase 1 — Django Project Setup

1. Initialize Git repository in `e:\Expensesapp`.
2. Create Django project (e.g. `expensesapp`) and Django apps:
   - `users`
   - `groups`
   - `expenses`
   - `imports`
   - `balances`
   - `settlements`
   - `approvals`
   - `audit`
   - `notifications`
3. Configure `settings.py` for:
   - Custom user model
   - SQLite dev and MySQL prod via `.env`
   - Django REST Framework
   - JWT auth with Simple JWT, token rotation, blacklist, refresh
   - CORS headers
   - ASGI + Daphne
   - Base response wrapper middleware/renderer
4. Create initial models for custom `User`, `Group`, `GroupMember`, `Expense`, `ExpenseSplit`, `Settlement`, `ImportSession`, `ImportAnomaly`, `ApprovalQueue`, `AuditLog`, `Notification`, `Comment`.
5. Make initial migrations.
6. Commit: `feat: initialize Django project and apps`

## Phase 2 — Auth APIs + Tests

1. Implement auth endpoints:
   - `/api/v1/auth/register/`
   - `/api/v1/auth/login/`
   - `/api/v1/auth/logout/`
   - `/api/v1/auth/token/refresh/`
   - `/api/v1/auth/me/`
   - `/api/v1/auth/change-password/`
2. Configure JWT settings:
   - access token 15m
   - refresh token 7d
   - token rotation enabled
   - blacklist refresh tokens on logout
   - custom payload includes user_id, username, email
3. Write auth tests covering register, login, logout, refresh, /me, change password.
4. Commit: `feat: auth module with JWT`

## Phase 3 — Groups + Dynamic Membership

1. Implement group CRUD and member endpoints.
2. Model `GroupMember` with joined_at, left_at, inclusive active membership logic.
3. Helper function: `get_active_members_on_date(group, date)`.
4. Implement permissions for admin vs member.
5. Write tests for membership date logic and endpoints.
6. Commit: `feat: groups with time-aware membership`

## Phase 4 — Expenses + All Split Types

1. Implement `Expense` and `ExpenseSplit` models.
2. Add split type support: EQUAL, UNEQUAL, PERCENTAGE, SHARE.
3. Implement validation ensuring splits sum to total ±₹1 remainder.
4. Implement remainder allocation to payer or largest-share member if payer inactive.
5. Implement USD→INR conversion and store exchange rate.
6. Ensure splits only include active members on expense date.
7. Soft delete logic and approval queue entry for deletion.
8. Write tests for split logic and edge cases.
9. Commit: `feat: expenses with all split types and multi-currency`

## Phase 5 — CSV Importer

1. Implement `ImportSession` and `ImportAnomaly` models.
2. Build parser for CSV columns and known date/amount formats.
3. Detect all anomaly types and produce full import report.
4. Implement 2-step import flow:
   - upload + report generation
   - confirm/cancel import
5. Support live USD→INR lookup with manual fallback.
6. Create approval queue items for row deletions/modifications and duplicate decisions.
7. Write tests for CSV anomaly detection and import flow.
8. Commit: `feat: CSV importer with anomaly detection`

## Phase 6 — Balance Engine

1. Implement balance engine using active membership and expense splits.
2. Aggregate group and personal balances in INR.
3. Add drill-down support for expense contribution details.
4. Build debt simplification algorithm with deterministic ordering.
5. Write tests for real scenarios including Sam/Meera and USD expenses.
6. Commit: `feat: balance engine with debt simplification`

## Phase 7 — Settlements + Approval Queue

1. Implement settlements with optional group link, undo within 24h.
2. Recalculate balances after settlements and undo.
3. Implement approval queue endpoints and admin review.
4. Add audit log entries for settlement and approval actions.
5. Write tests for settlement undo, approval queue behavior.
6. Commit: `feat: settlements and approval queue`

## Phase 8 — Notifications (WebSocket)

1. Implement Django Channels consumer for notifications.
2. Add JWT auth to WS handshake.
3. Trigger notifications for group invitations, new expenses, settlements, approvals.
4. Add endpoints to list notifications and mark read.
5. Commit: `feat: real-time notifications via WebSocket`

## Phase 9 — Analytics + Comments

1. Add analytics endpoints for group and personal data.
2. Implement comment thread model and expense comment endpoints.
3. Commit: `feat: analytics and expense comments`

## Phase 10 — React Frontend

1. Create Vite + React app with TailwindCSS.
2. Implement Axios JWT interceptor and global auth context.
3. Build screens and components as defined.
4. Commit screen/component groups separately.

## Phase 11 — Testing

1. Django unit tests for balance engine, importer, membership logic, settlement undo.
2. React smoke tests for key screens.
3. Commit: `test: add backend and frontend tests`

## Phase 12 — Deployment

1. Configure Render deployment for backend and Vercel for frontend.
2. Configure MySQL prod database env and CORS settings.
3. Commit: `chore: production deployment config`

## Phase 13 — Final Documentation

1. Finalize `SCOPE.md`, `DECISIONS.md`, `AI_USAGE.md`, `README.md`.
2. Commit: `docs: complete documentation`
