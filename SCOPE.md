# Scope

## Purpose

This document records the exact scope for the shared expenses app based on the product manager's requirements and the internship assignment constraints.

## In Scope

### Core Features

- Django backend with JWT auth, Django REST Framework, Django Channels, and SQLite/MySQL configuration.
- React frontend using Vite, React 18, React Router v6, TailwindCSS, Axios, Recharts, React Hot Toast, and WebSocket notifications.
- User registration, login, logout, profile, and password change.
- Groups with dynamic membership and inclusive join/leave date logic.
- Expense creation, update, soft delete, multi-currency support, split calculation, and split validation.
- CSV import with anomaly detection and two-step confirm flow.
- Balance engine with date-aware membership, INR-only aggregation, and debt simplification.
- Settlements with undo within 24 hours.
- Approval queue for destructive or imported-row changes.
- Audit logging for key actions.
- Notifications via WebSocket.
- Expense comments.
- Analytics endpoints for group and personal spending.

### CSV Import Anomalies

The importer must detect and surface all anomalies explicitly.

1. `DUPLICATE_ROW`
   - Same date, same amount, same description, same paid_by.
   - Flag both rows; show both; auto-suggest keeping the first row; user chooses keep/merge.
   - Never auto-delete without explicit approval.

2. `NEGATIVE_AMOUNT`
   - Negative expense amount.
   - Flag row and ask user if it is a refund or reject row.
   - User decision required before import.

3. `SETTLEMENT_AS_EXPENSE`
   - Description contains settlement keywords such as "paid back", "settlement", "transfer".
   - Flag row and suggest converting to a Settlement record rather than import as an expense.

4. `CURRENCY_MISMATCH`
   - Currency is USD or description mentions USD/dollars.
   - Flag row, convert to INR using live rate or manual rate fallback, store original and INR values.

5. `UNKNOWN_MEMBER`
   - Row mentions a person not already in the group.
   - Flag row, create a placeholder user, and surface the creation to the user.

6. `DATE_OUTSIDE_MEMBERSHIP`
   - Expense date is outside a member's membership window.
   - Flag it and exclude that member from the split.

7. `MISSING_REQUIRED_FIELDS`
   - Missing date, amount, or paid_by.
   - Reject row and log reason.

8. `INCONSISTENT_DATE_FORMAT`
   - Mixed or ambiguous date formats.
   - Attempt to parse known formats; flag ambiguous values and ask user.

9. `AMOUNT_FORMAT_ISSUE`
   - Commas, currency symbols, or malformed number formatting.
   - Clean and parse the value; log that cleaning was performed.

10. `SPLIT_TYPE_INCONSISTENCY`

- Split detail totals do not match the expense total.
- Flag and ask user to resolve the discrepancy before import.

11. `DUPLICATE_SETTLEMENT`

- Settlement row appears to match an already-recorded settlement.
- Flag as possible duplicate; require confirmation before import.

12. `UNKNOWN_SPLIT_TYPE`

- Split type missing or not in {EQUAL, UNEQUAL, PERCENTAGE, SHARE}.
- Flag row and require manual mapping before import.

13. `UNKNOWN_MEMBER_PLACEHOLDER`

- Placeholder user created from CSV unknown name.
- Flag and document as placeholder user creation.

## Handling Policy for Each Anomaly

- `DUPLICATE_ROW`
  - Detect by exact match on cleaned date, amount, trimmed lowercase description, and trimmed lowercase paid_by.
  - Present both rows, recommend first occurrence, require manual keep/merge/skip.
  - Create approval queue item for Meera/admin review.

- `NEGATIVE_AMOUNT`
  - Flag and require user decision: refund or reject.
  - If refund chosen, import as a negative expense and create a negative split only for payer.
  - If rejected, skip row and include in rejected count.

- `SETTLEMENT_AS_EXPENSE`
  - Flag based on keywords in description.
  - Do not import as expense unless user confirms a different action.

- `CURRENCY_MISMATCH`
  - Use live USD→INR exchange rate from exchangerate-api.com.
  - If live lookup fails, require manual rate entry before confirming import.
  - Store both original USD amount and INR equivalent with rate.

- `UNKNOWN_MEMBER`
  - Create placeholder user with `is_placeholder = true`.
  - Flag in report and allow later invitation if email is provided.

- `DATE_OUTSIDE_MEMBERSHIP`
  - Exclude the out-of-window member from the expense split.
  - Flag the anomaly and document the exclusion.

- `MISSING_REQUIRED_FIELDS`
  - Reject row and do not import.

- `INCONSISTENT_DATE_FORMAT`
  - Attempt parse of known patterns.
  - If ambiguous, flag and require user correction.

- `AMOUNT_FORMAT_ISSUE`
  - Clean formatting like commas and currency symbols.
  - Import after cleanup, but log the cleaning action.

- `SPLIT_TYPE_INCONSISTENCY`
  - Validate split totals against expense total.
  - Flag rows that do not balance; require user resolution before import.

- `DUPLICATE_SETTLEMENT`
  - Flag possible duplicate settlements; skip unless user confirms.

- `UNKNOWN_SPLIT_TYPE`
  - Reject or require mapping to supported split type.

- `UNKNOWN_MEMBER_PLACEHOLDER`
  - Flag placeholder creation and show in report.

## Database Schema

### User

- `id`: UUID primary key
- `username`, `email`, `password` (via Django AbstractUser)
- `display_name`: optional text
- `avatar`: optional image
- `is_placeholder`: boolean, default False
- `created_at`, `updated_at`

### Group

- `id`: UUID primary key
- `name`, `description`, `category`
- `created_by`: FK to User
- `created_at`, `updated_at`

### GroupMember

- `id`: UUID primary key
- `group`: FK to Group
- `user`: FK to User
- `role`: ADMIN or MEMBER
- `joined_at`: DateField, not null
- `left_at`: DateField, nullable
- unique together: (`group`, `user`, `joined_at`)
- `created_at`, `updated_at`

### Expense

- `id`: UUID primary key
- `group`: FK to Group
- `title`, `description`
- `amount`: Decimal(12,2)
- `currency`: CharField(INR/USD)
- `amount_inr`: Decimal(12,2)
- `exchange_rate`: Decimal(10,6)
- `date`: DateField
- `category`: choice
- `paid_by`: FK to User
- `split_type`: EQUAL/UNEQUAL/PERCENTAGE/SHARE
- `is_deleted`: BooleanField default False
- `deleted_at`: DateTimeField nullable
- `deleted_by`: FK to User nullable
- `import_source`: MANUAL/CSV
- `import_row_number`: IntegerField nullable
- `created_at`, `updated_at`

### ExpenseSplit

- `id`: UUID primary key
- `expense`: FK to Expense
- `user`: FK to User
- `amount_owed`: Decimal(12,2) in INR
- `original_amount`: Decimal(12,2) in original currency
- `percentage`: Decimal(5,2) nullable
- `shares`: IntegerField nullable
- `is_settled`: BooleanField default False
- `created_at`, `updated_at`

### Settlement

- `id`: UUID primary key
- `paid_by`: FK to User
- `paid_to`: FK to User
- `group`: FK to Group nullable
- `amount`: Decimal(12,2)
- `currency`: CharField(INR/USD)
- `amount_inr`: Decimal(12,2)
- `date`: DateField
- `note`: TextField nullable
- `is_undone`: BooleanField default False
- `undone_at`: DateTimeField nullable
- `undone_reason`: TextField nullable
- `created_at`, `updated_at`

### ImportSession

- `id`: UUID primary key
- `imported_by`: FK to User
- `filename`: CharField
- `started_at`, `completed_at`
- `status`: PENDING/PROCESSING/AWAITING_APPROVAL/COMPLETED/FAILED
- `total_rows`, `imported_count`, `flagged_count`, `rejected_count`
- `report`: JSONField
- `created_at`, `updated_at`

### ImportAnomaly

- `id`: UUID primary key
- `session`: FK to ImportSession
- `row_number`: IntegerField
- `anomaly_type`: choice
- `raw_data`: JSONField
- `description`: TextField
- `action_taken`: TextField
- `requires_approval`: BooleanField
- `approved_by`: FK to User nullable
- `approved_at`: DateTimeField nullable
- `created_at`, `updated_at`

### ApprovalQueue

- `id`: UUID primary key
- `action_type`: choice
- `target_model`: TextField
- `target_id`: UUIDField
- `requested_by`: FK to User
- `payload`: JSONField
- `status`: PENDING/APPROVED/REJECTED
- `reviewed_by`: FK to User nullable
- `reviewed_at`: DateTimeField nullable
- `review_note`: TextField nullable
- `created_at`, `updated_at`

### AuditLog

- `id`: UUID primary key
- `user`: FK to User
- `action`: TextField
- `target_model`: TextField
- `target_id`: UUIDField nullable
- `before_state`: JSONField nullable
- `after_state`: JSONField nullable
- `ip_address`: TextField nullable
- `timestamp`: DateTimeField auto_now_add

### Notification

- `id`: UUID primary key
- `user`: FK to User
- `message`: TextField
- `is_read`: BooleanField default False
- `action_link`: TextField nullable
- `created_at`, `updated_at`

### Comment

- `id`: UUID primary key
- `expense`: FK to Expense
- `user`: FK to User
- `content`: TextField
- `created_at`, `updated_at`

## What Is Explicitly Out of Scope

- No support for currencies beyond INR and USD.
- No production-level email delivery or invite flow beyond placeholder creation metadata.
- No hard deletes for expenses or approval history.
- No configurable settlement undo window; it remains fixed at 24 hours.
- No automatic debt simplification toggle; simplified plan is always shown by default.
- No third-party payment gateway integration.
- No advanced machine learning or auto-categorization of expenses.
- No mobile-only UI; React web only.
- No full chat system; only expense comments.
