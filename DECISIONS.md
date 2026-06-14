# Decisions

## 1. SQLite for dev, MySQL for production

- Options considered:
  - Use SQLite only for both dev and prod
  - Use SQLite for dev and MySQL for production
- Chosen: SQLite for development, MySQL for production
- Why: SQLite is easy for local onboarding and testing; MySQL is required for production deployment and better simulates production constraints.
- Trade-off: Need separate database settings and migration awareness, but this is acceptable for a production-ready architecture.

## 2. Negative amount policy

- Options considered:
  - Automatically treat negative amounts as refunds
  - Flag every negative amount and ask user for explicit handling
- Chosen: Flag every negative amount row as `NEGATIVE_AMOUNT` and require user decision.
- Why: The spreadsheet may contain data entry errors, and the user explicitly asked not to auto-handle.
- Trade-off: More user interaction during import, but safer and aligned with the no-silent-fixes policy.

## 3. Duplicate detection algorithm

- Options considered:
  - Loose match on date + amount + description
  - Strict match on date + amount + description + paid_by
- Chosen: Strict match with exact cleaned date, exact cleaned amount, trimmed lowercase description, and trimmed lowercase paid_by.
- Why: This reduces false positives while still catching real duplicate rows.
- Trade-off: Some duplicates with slight description/payer variations may not be detected automatically, but this is safer.

## 4. Membership date effects on balance

- Options considered:
  - Active if expense date is strictly between joined_at and left_at
  - Active if inclusive of joined_at and left_at
- Chosen: Inclusive of joined_at and left_at.
- Why: The requirement explicitly states expense.date >= joined_at and <= left_at, with date precision only.
- Trade-off: Easier membership logic and aligns with the product definition.

## 5. Currency conversion approach

- Options considered:
  - Live exchange rate only
  - Manual rate only
  - Live rate with manual fallback
- Chosen: Live USD→INR rate with manual rate fallback when live lookup fails.
- Why: Provides auditability and user control when the API is unavailable.
- Trade-off: Slightly more complexity in the importer, but robust behavior is worth it.

## 6. Soft delete vs hard delete

- Options considered:
  - Hard delete expenses immediately
  - Soft delete expenses and require approval for deletion
- Chosen: Soft delete with approval queue for deletion.
- Why: The app needs auditability, recovery, and review for destructive actions.
- Trade-off: More database state to manage, but this is required for safety and Meera's approval flow.

## 7. Rounding rule and remainder allocation

- Options considered:
  - Remainder to payer
  - Remainder split across members
  - Remainder to highest share member
- Chosen: Remainder always goes to the payer; if payer is not active, it goes to the largest-share member.
- Why: This is deterministic, easy to explain, and aligns with the product requirement.
- Trade-off: One member may bear an extra cent, but that is defined clearly.

## 8. Debt simplification algorithm

- Options considered:
  - Always simplify debts by default
  - Provide a toggle between raw and simplified
- Chosen: Always compute an automatic simplified settlement plan; also show raw balances secondarily.
- Why: Aisha wants one number per person, and Rohan still gets drill-down visibility.
- Trade-off: Added UI complexity to show both views, but it satisfies both needs.

## 9. Settlement undo policy

- Options considered:
  - Make undo window configurable
  - Keep a fixed 24-hour window
- Chosen: Fixed 24-hour undo window.
- Why: The product requirement explicitly fixes 24 hours for now.
- Trade-off: Future flexibility is limited, but current scope stays clean.

## 10. Handling guest/temporary users like Dev

- Options considered:
  - Treat Dev as a normal registered user
  - Represent Dev as a placeholder user
  - Skip unknown names entirely
- Chosen: Create placeholder users with `is_placeholder = true`.
- Why: Balances the need to import messy CSV data while keeping guests visible and trackable.
- Trade-off: Placeholder users require additional UI/state handling, but they preserve data fidelity.

## 11. Balance visibility

- Options considered:
  - Group balances visible only to each member's own view
  - Full group balances visible to all group members
- Chosen: Full group balances visible to all active and past group members.
- Why: The shared household use case needs transparency.
- Trade-off: More data visibility, but this matches the product intent.

## 12. UI balance phrasing

- Options considered:
  - Sentence form: "Rohan owes Aisha ₹1,200"
  - Arrow form: "Rohan → Aisha : ₹1,200"
- Chosen: Human-readable sentence form.
- Why: It's clearer for non-technical users and matches the product wording.
- Trade-off: No meaningful trade-off; plain language is preferable.
