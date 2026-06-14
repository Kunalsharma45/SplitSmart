# SCOPE.md

---

## What This App Does

FairShare is a shared expense manager built for flatmates who need to transition from a manual spreadsheet to a structured, automated system. It parses expense exports, runs validation rules to flag data entry issues, and calculates precise individual balances. By tracking room membership timelines, the application ensures that roommates only pay for expenses incurred during their active lease dates.

The system automates debt settlements by matching payments directly against group balance records and simplifying overall transaction paths. It handles conversions for multi-currency transactions and provides a clear breakdown of each person's outstanding balances. Flagged actions, such as expense deletions, go through a queue-based approval flow to ensure that records are not modified without roommate confirmation.

---

## What Is In Scope

1. Local CSV Parser: parses rows in the browser and highlights entries matching 12 distinct data anomalies.
2. Anomaly Explainer: displays a plain English explanation of warnings and critical errors using an API endpoint.
3. Inline Table Editor: allows users to correct data cells directly in the preview list before import.
4. Custom User Profiles: supports user accounts with UUID fields, custom display names, and placeholder flags.
5. Dynamic Group Memberships: tracks roommate start and end dates to ensure calculations match tenancy periods.
6. Multi-Currency Conversions: records exchange rates at import time and translates USD values to INR.
7. Expense Split Engine: processes equal, unequal, percentage, and share-based splits.
8. Balance Breakdown: lists individual transactions, split shares, and dates that make up a user's balance.
9. Transaction Simplification: runs a network flow algorithm to minimize the number of payment transactions.
10. Settlement Records: records bank transfers or cash handovers with a fixed 24-hour undo window.
11. Approval Queue: requires group administrators to approve or reject deletions of shared expenses.
12. In-App Notifications: updates users via real-time WebSocket connections when splits are updated.

---

## What Is Out of Scope

Other currencies beyond INR and USD
  Not implemented. Only INR and USD are supported. Adding more currencies would complicate the engine without serving the core flatmate requirement.

Mobile app
  Not built. The application is a web-only responsive dashboard optimized for desktop and mobile browsers.

Email and SMS notifications
  Exceeded project constraints. In-app alerts handle all system notifications, keeping infrastructure simple.

OCR for receipt scanning
  Not implemented. Expenses must be entered manually or imported via the CSV upload interface.

Recurring expenses
  Excluded. Shared utilities or rent must be entered as distinct expense records each billing period.

Bank integration
  Not implemented. All settlement payments must be manually recorded inside the application.

Multi-language
  Excluded. The user interface is strictly configured in English.

---

## Database Schema

### User
Extends Django's AbstractUser.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| username | CharField | Unique |
| email | EmailField | Unique |
| display_name | CharField | Shown in UI |
| avatar | ImageField | Optional |
| is_placeholder | BooleanField | True for CSV guest users |
| created_at | DateTimeField | Auto set on create |
| updated_at | DateTimeField | Auto set on update |

### Group
Represents a flatmate group.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | CharField | Group name |
| description | TextField | Optional |
| category | CharField | Type of household/group |
| created_by | ForeignKey | Refers to User |
| created_at | DateTimeField | Auto set on create |
| updated_at | DateTimeField | Auto set on update |

### GroupMember
Links users to groups with tenancy dates.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| group | ForeignKey | Refers to Group |
| user | ForeignKey | Refers to User |
| role | CharField | Admin or Member |
| joined_at | DateField | Lease start date |
| left_at | DateField | Lease end date (nullable) |
| created_at | DateTimeField | Auto set on create |
| updated_at | DateTimeField | Auto set on update |

### Expense
Records shared spending items.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| group | ForeignKey | Refers to Group |
| title | CharField | Expense title |
| description | TextField | Optional |
| amount | DecimalField | Spent value |
| currency | CharField | INR or USD |
| amount_inr | DecimalField | Calculated value in INR |
| exchange_rate | DecimalField | Conversion rate used |
| date | DateField | Invoice date |
| category | CharField | Expense category |
| paid_by | ForeignKey | Refers to User |
| split_type | CharField | Equal, Unequal, etc. |
| is_deleted | BooleanField | Soft delete marker |
| deleted_at | DateTimeField | Nullable |
| deleted_by | ForeignKey | Nullable |
| import_source | CharField | CSV or Manual |
| import_row_number| IntegerField | Nullable |
| created_at | DateTimeField | Auto set on create |
| updated_at | DateTimeField | Auto set on update |

### ExpenseSplit
Defines individual shares of an expense.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| expense | ForeignKey | Refers to Expense |
| user | ForeignKey | Refers to User |
| amount_owed | DecimalField | Share in INR |
| original_amount | DecimalField | Share in original currency |
| percentage | DecimalField | Percentage value (nullable) |
| shares | IntegerField | Share units (nullable) |
| is_settled | BooleanField | True when payment is cleared |

### Settlement
Tracks debt clearance payments.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| group | ForeignKey | Refers to Group |
| payer | ForeignKey | Refers to User (debtor) |
| payee | ForeignKey | Refers to User (creditor) |
| amount | DecimalField | Transferred sum in INR |
| date | DateField | Settlement date |
| is_undone | BooleanField | True if reverted within 24h |
| created_at | DateTimeField | Auto set on create |
| updated_at | DateTimeField | Auto set on update |

### ImportSession
Logs CSV file import events.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| group | ForeignKey | Refers to Group |
| imported_by | ForeignKey | Refers to User |
| status | CharField | Pending or Confirmed |
| total_rows | IntegerField | Row count |
| created_at | DateTimeField | Auto set on create |

### ImportAnomaly
Logs detected data issues during parsing.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session | ForeignKey | Refers to ImportSession |
| row_number | IntegerField | CSV row index |
| anomaly_type | CharField | Type of error/warning |
| raw_data | JSONField | Raw row content |
| status | CharField | Pending, Approved, Rejected |
| resolved_by | ForeignKey | Nullable |
| resolved_at | DateTimeField | Nullable |

### ApprovalQueue
Holds actions requiring admin confirmation.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| group | ForeignKey | Refers to Group |
| requested_by | ForeignKey | Refers to User |
| action_type | CharField | Delete or Modify |
| target_model | CharField | Target table |
| target_id | UUID | Target record UUID |
| details | JSONField | Stored modifications |
| status | CharField | Pending, Approved, Rejected |
| resolved_by | ForeignKey | Nullable |
| resolved_at | DateTimeField | Nullable |

### AuditLog
Logs operational changes.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user | ForeignKey | Refers to User |
| action | CharField | Logged action name |
| timestamp | DateTimeField | Event datetime |
| details | JSONField | Event metadata |

### Notification
Alerts users to activity.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| recipient | ForeignKey | Refers to User |
| title | CharField | Alert title |
| message | TextField | Alert content |
| is_read | BooleanField | Read status marker |
| created_at | DateTimeField | Event datetime |

### Comment
Stores discussion entries under expenses.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| expense | ForeignKey | Refers to Expense |
| user | ForeignKey | Refers to User |
| text | TextField | Comment text |
| created_at | DateTimeField | Event datetime |

---

## CSV Anomaly Log

### Anomaly 1: Duplicate Row

**What it is**
Two identical expenses are listed in the export, representing a single payment logged twice.

**How it was detected**
Compares date, cleaned amount, trimmed description, and payer username. Matches are flagged as duplicates.

**Example**
Row 7: 2024-03-05, 850, Dominos dinner, Aisha
Row 12: 2024-03-05, 850, dominos dinner, Aisha

**Policy**
Highlights both rows. The user is prompted to keep one and reject the duplicate. The rejected row enters the approval queue.

**Why this policy**
Forces manual selection to ensure that separate payments occurring on the same day are not silently deleted.

### Anomaly 2: Negative Amount

**What it is**
The expense amount column is entered as a negative number.

**How it was detected**
Flags rows where the parsed numerical amount is less than zero.

**Example**
Row 19: 2024-03-10, -500, grocery refund, Rohan

**Policy**
Asks the user to clarify if the row is a refund or a typo. Selecting refund adjusts balances as credit; rejecting skips the row.

**Why this policy**
A negative sign can mean a return or a keyboard error. Automated conversion without user verification risks incorrect totals.

### Anomaly 3: Settlement as Expense

**What it is**
A debt repayment between two flatmates is entered as a shared expense.

**How it was detected**
Scans descriptions for keywords like "paid back", "settlement", "transferred", or "refund".

**Example**
Row 23: 2024-03-15, 1200, Rohan paid back Aisha, Rohan

**Policy**
Prompts the user to convert the entry into a direct settlement transaction.

**Why this policy**
Repayments do not belong in group split calculations. Treating them as expenses artificially inflates the group spending history.

### Anomaly 4: Currency Mismatch

**What it is**
An expense is billed in USD but processed as INR without conversion.

**How it was detected**
Flags rows where the currency column is USD, or the description contains currency terms like "USD" or "$".

**Example**
Row 31: 2024-02-20, 100, Hotel booking USD, USD, Priya

**Policy**
Converts the amount to INR using the exchange rate. Users can review the rate before final import.

**Why this policy**
Treating foreign currency as local currency creates incorrect splits.

### Anomaly 5: Member Not in Group

**What it is**
The payer listed in the CSV does not have an account in the group.

**How it was detected**
Matches the paid_by username against registered group members. Unmatched names are flagged.

**Example**
Row 8: 2024-02-10, 3000, Trip hotel, Dev

**Policy**
Creates a placeholder user profile (`is_placeholder = True`) to track the debt until the admin invites them.

**Why this policy**
Allows the import to proceed without dropping rows while tracking the guest's balance.

### Anomaly 6: Date Outside Membership

**What it is**
A user is listed in a split calculation on a date before they joined or after they left.

**How it was detected**
Compares the expense date against the group member's lease dates (`joined_at` and `left_at`).

**Example**
Row 14: 2024-03-05, 3200, March electricity, split with Sam (Sam joined April 10)

**Policy**
Excludes the inactive member and recalculates the split among the active members.

**Why this policy**
Roommates should not be charged for utility expenses incurred when they did not reside in the house.

### Anomaly 7: Missing Required Field

**What it is**
A row lacks mandatory data like date, amount, or payer.

**How it was detected**
Checks for null or empty strings in required fields.

**Example**
Row 3: , 1500, Groceries, (no date or payer)

**Policy**
Flags the row in red and rejects it from the import.

**Why this policy**
Missing core attributes prevent split and balance calculations from executing.

### Anomaly 8: Inconsistent Date Format

**What it is**
Date columns use mixed formatting styles, making values ambiguous.

**How it was detected**
Identifies dates using formats that differ from the file's dominant date style.

**Example**
Row 5: 05/03/2024 (File uses YYYY-MM-DD)

**Policy**
Prompts the user to confirm the intended date before parsing.

**Why this policy**
Ambiguous formats can cause months and days to be swapped, shifting calculations to incorrect billing cycles.

### Anomaly 9: Amount Format Issue

**What it is**
The amount field contains spaces, commas, or currency symbols.

**How it was detected**
Identifies non-numeric characters inside the amount field.

**Example**
Row 17: 1,500
Row 28: ₹850

**Policy**
Auto-cleans the string to a decimal and displays a minor info warning.

**Why this policy**
Formatting marks cause decimal parser failures. Auto-cleaning preserves the import speed.

### Anomaly 10: Split Sum Mismatch

**What it is**
Individual split values do not sum to the total expense amount.

**How it was detected**
Sum of splits is compared to the main amount field.

**Example**
Row 41: Total 1200, splits: Aisha=400, Rohan=400, Priya=300 (Sum 1100)

**Policy**
Flags the row and requires the user to edit the splits before import.

**Why this policy**
Split differences leave parts of the expense unallocated, making the group balance equations balance incorrectly.

### Anomaly 11: Duplicate Settlement

**What it is**
A repayment row in the CSV matches a transaction already registered in the database.

**How it was detected**
Compares payment details against the database settlement history for matching pairs.

**Example**
Row 38: Rohan paid Aisha 1200 on 2024-03-15 (Repayment already in database)

**Policy**
Flags the row and prompts the user to skip it.

**Why this policy**
Re-importing recorded payments double-counts settlements, distorting actual group debts.

### Anomaly 12: Unknown Split Type

**What it is**
The split method column specifies an unsupported method.

**How it was detected**
Checks if the split type is equal, unequal, percentage, or share.

**Example**
Row 29: split_type=HALF

**Policy**
Flags the row. The user must manually assign a supported split type before importing.

**Why this policy**
Unsupported split types cannot be processed by the backend calculation engine.
