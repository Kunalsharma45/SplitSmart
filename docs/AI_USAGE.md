# AI_USAGE.md

---

## Tools Used

**GitHub Copilot**
Used throughout the project as a code suggestion tool inside the IDE. Copilot was given specific functional prompts before writing each module. All suggestions were reviewed line-by-line and refactored manually before inclusion.

**OpenAI GPT-4o-mini**
Used as a live feature inside the application on the CSV import screen. When a parsed spreadsheet row has warnings or errors, the frontend sends the row data to the backend. The backend queries OpenAI using the template prompts to explain the issue in plain English to the flatmates.

---

## How Copilot Was Used

The development approach was to write core function signatures and supply Copilot with context rules. For the balance engine, I defined how membership dates affect splits and that Sam should be excluded from pre-April expenses. Copilot was then prompted to write the aggregation loops.

For the CSV anomaly detector, I supplied the list of 12 anomalies and their triggers. Copilot wrote the template checks. I reviewed each logic check to make sure they fit with the models on disk.

---

## Key Prompts Used

**Prompt 1: Balance engine setup**
```
Write a Django function called calculate_group_balances that takes a group id.
For each expense in the group, get all members who were active on the expense date using the GroupMember model's joined_at and left_at fields.
Joined_at and left_at are both inclusive.
Calculate each active member's share based on the split_type field of the expense. Aggregate all shares across all expenses to produce a net balance per member. Return a dictionary mapping user id to net balance in INR.
Positive means the user is owed money.
Negative means the user owes money.
```

**Prompt 2: Anomaly detector for duplicate rows**
```
Write a Python function called detect_duplicates that takes a list of parsed CSV rows. Each row is a dictionary with keys: date, amount, description, paid_by. After cleaning amounts by removing commas and currency symbols and converting to Decimal, and after lowercasing and stripping description and paid_by, find all pairs of rows where all four fields match.
Return a list of anomaly objects where each object contains both row numbers, the anomaly type DUPLICATE_ROW, and the raw data for both.
```

**Prompt 3: JWT WebSocket authentication**
```
Write a Django Channels middleware class that reads a JWT access token from the WebSocket URL query parameters under the key token.
Validate the token using djangorestframework-simplejwt. If valid, attach the user object to the scope under scope['user']. If invalid or missing, close the WebSocket connection with code 4001 before the consumer is called.
```

---

## Cases Where AI Was Wrong

**Case 1: Balance engine double-counted settled expenses**
* **What Copilot generated**: The initial balance calculation script summed all `ExpenseSplit` objects directly without checking if they had already been paid off. It also failed to include the records in the `Settlement` table.
* **How I caught it**: I wrote a test case where Rohan paid Aisha 1200 rupees and recorded a settlement. The balance engine still reported that Rohan owed Aisha 1200 rupees.
* **What I changed**: I updated the balance engine logic to treat settlements as payment offsets. Settlements decrease the debt of the payer and decrease the credit of the payee. I also added checks to filter out settlements marked `is_undone = True`.

**Case 2: Duplicate detector flagged unrelated expenses**
* **What Copilot generated**: The duplicate row detector initially matched rows based on description and amount columns.
* **How I caught it**: When running the script on the spreadsheet, it flagged multiple weekly grocery shopping entries from Aisha as duplicates because they shared descriptions and amounts.
* **What I changed**: I corrected the code to enforce matching across all four columns: date, cleaned amount, trimmed description, and payer username.

**Case 3: WebSocket did not close on token expiry**
* **What Copilot generated**: The token authentication middleware validated the JWT token at connection handshake time but did not track token lifecycle.
* **How I caught it**: In testing, if a client remained connected to a WebSocket for over 20 minutes, their HTTP endpoints correctly returned `401 Unauthorized` due to token expiry, but their WebSocket connection remained active.
* **What I changed**: I updated the consumer loop to validate the token from scope on each inbound message. If the token is expired, it closes the connection with code `4001`, prompting the React hook to refresh the token and re-establish the connection.

---

## What I Learned About Using AI Effectively

AI tools are useful for creating schema boilerplate, serializer lists, and test files. When writing core logic, AI-generated code must be validated with tests.

Providing explicit context constraints (such as variable types, boundary inclusions, and database relationship structures) before asking for code produces better suggestions. Vague prompts output code that is technically sound but logically incorrect for our requirements.
