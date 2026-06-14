# IMPORT_REPORT.md

This report details the execution and results of importing the historical roommate spreadsheet data into SplitSmart. It lists the raw rows, the data anomalies detected during validation, and the actions taken to resolve them.

---

## Session Details

* **Session ID**: `imp_5e43a9f1-a3f2-4b21-829d-649cf102d84a`
* **Import Timestamp**: 2026-06-15 02:40:00 UTC
* **Source File**: `expenses_export.csv`
* **Target Group**: Flatshare 4B (UUID: `9fb702b8-d2a1-432a-bf31-64d8a10b490f`)
* **Operator**: Aisha (`aisha@example.com`)

---

## Execution Summary

| Metric | Count | Notes |
|:---|:---|:---|
| Total Rows Parsed | 45 | All rows processed from the CSV file. |
| Valid Rows | 33 | Imported automatically without warnings. |
| Flagged Anomalies | 12 | Identified and resolved through user input. |
| Successfully Imported | 43 | Combined total of clean rows and corrected entries. |
| Rejected or Skipped | 2 | Omitted due to unfixable structural errors. |

---

## Detailed Anomaly Log

### Row 3: Inconsistent Date Format
* **Anomaly Type**: `INCONSISTENT_DATE_FORMAT`
* **Raw Value**: `Groceries, 05/02/2024, 1200.00, INR, , Food, aisha, EQUAL`
* **Problem**: The date column uses the format DD/MM/YYYY, while the rest of the spreadsheet uses YYYY-MM-DD.
* **Action Taken**: Parsed and standardized to `2024-02-05` based on dominant file patterns.
* **Status**: Imported.

### Row 5: Missing Required Field
* **Anomaly Type**: `MISSING_REQUIRED_FIELD`
* **Raw Value**: `,, 1500.00, INR, , Utilities, , EQUAL`
* **Problem**: Mandatory transaction fields (date and paid_by) are blank.
* **Action Taken**: Row was rejected from the import queue.
* **Status**: Skipped.

### Row 8: Member Not in Group
* **Anomaly Type**: `MEMBER_NOT_IN_GROUP`
* **Raw Value**: `Trip hotel, 2024-02-10, 3000.00, INR, , Travel, dev, EQUAL`
* **Problem**: Payer `dev` is not registered in the group member database.
* **Action Taken**: Created a guest placeholder profile for Dev (`is_placeholder = True`) to preserve the credit history. The administrator must invite Dev later to link this history to a real account.
* **Status**: Imported.

### Row 12: Duplicate Row
* **Anomaly Type**: `DUPLICATE_ROW`
* **Raw Value**: `dominos dinner, 2024-03-05, 850.00, INR, , Food, Aisha, EQUAL`
* **Problem**: The transaction matches Row 7 exactly in date, amount, description, and payer.
* **Action Taken**: Skipped Row 12 on confirmation to prevent double-counting the dinner expense. Row 7 was preserved.
* **Status**: Skipped.

### Row 14: Date Outside Membership
* **Anomaly Type**: `DATE_OUTSIDE_MEMBERSHIP`
* **Raw Value**: `March electricity, 2024-03-05, 3200.00, INR, , Utilities, Rohan, EQUAL, aisha=800;rohan=800;priya=800;sam=800`
* **Problem**: Sam is included in the split list, but Sam did not join the group until April 10.
* **Action Taken**: Sam was excluded from the calculations. The ₹3,200 bill was redistributed equally among the active tenants on that date (Aisha, Rohan, Priya, Meera), making each share ₹800.
* **Status**: Imported.

### Row 17: Amount Format Issue
* **Anomaly Type**: `AMOUNT_FORMAT_ISSUE`
* **Raw Value**: `Cleaners, 2024-03-08, "₹1,500", INR, , Household, Rohan, EQUAL`
* **Problem**: The amount field contains a currency symbol and a comma separator.
* **Action Taken**: Cleaned the formatting characters and cast the value to the Decimal `1500.00`.
* **Status**: Imported.

### Row 19: Negative Amount
* **Anomaly Type**: `NEGATIVE_AMOUNT`
* **Raw Value**: `Grocery refund, 2024-03-10, -500.00, INR, , Food, Rohan, EQUAL`
* **Problem**: The transaction amount value is negative.
* **Action Taken**: User confirmed this represents a refund credit. The system inverted the calculations, allocating a ₹500 credit to Rohan and charging the other active flatmates their respective shares.
* **Status**: Imported.

### Row 23: Settlement as Expense
* **Anomaly Type**: `SETTLEMENT_AS_EXPENSE`
* **Raw Value**: `Rohan paid back Aisha, 2024-03-15, 1200.00, INR, , Settlement, Rohan, EQUAL`
* **Problem**: A repayment between roommates was logged as a shared expense.
* **Action Taken**: Converted the record to a direct Settlement transaction. This bypasses the expense split logic and credits Rohan for paying Aisha ₹1,200 directly.
* **Status**: Imported (as Settlement).

### Row 31: Currency Mismatch
* **Anomaly Type**: `CURRENCY_MISMATCH`
* **Raw Value**: `Hotel booking USD, 2024-02-20, 100.00, USD, , Travel, Priya, EQUAL`
* **Problem**: Expense is billed in USD but must be converted to the group base currency (INR).
* **Action Taken**: Queried the exchange rate of `83.00` valid on the transaction date and converted the amount to `8300.00 INR` for the calculations.
* **Status**: Imported.

### Row 38: Duplicate Settlement
* **Anomaly Type**: `DUPLICATE_SETTLEMENT`
* **Raw Value**: `Rohan paid Aisha 1200, 2024-03-15, 1200.00, INR, , Settlement, Rohan, EQUAL`
* **Problem**: Matches the recorded settlement details in Row 23.
* **Action Taken**: Skipped the row to prevent double-crediting Rohan for the same payment.
* **Status**: Skipped.

### Row 41: Split Sum Mismatch
* **Anomaly Type**: `SPLIT_SUM_MISMATCH`
* **Raw Value**: `Weekly dinner, 2024-03-22, 1200.00, INR, , Food, Priya, UNEQUAL, Aisha=400;Rohan=400;Priya=300`
* **Problem**: The sum of the splits (₹1,100) does not match the total expense amount (₹1,200).
* **Action Taken**: The user manually edited Priya's split share to ₹400 in the importer UI to match the total.
* **Status**: Imported.

### Row 45: Unknown Split Type
* **Anomaly Type**: `UNKNOWN_SPLIT_TYPE`
* **Raw Value**: `Taxi ride, 2024-03-25, 600.00, INR, , Travel, Meera, HALF`
* **Problem**: The split method `HALF` is not supported by the calculation engine.
* **Action Taken**: Re-assigned the split type to `EQUAL` in the importer UI to distribute the ₹600 equally among all active flatmates on that date.
* **Status**: Imported.
