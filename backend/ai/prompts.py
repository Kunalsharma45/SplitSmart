# AI Prompt templates for SplitSmart anomaly explanations.

SYSTEM_PROMPT = (
    "You are a helpful assistant for a shared expenses app called FairShare. "
    "You help non-technical users understand data problems found in their expense spreadsheet.\n\n"
    "When explaining an anomaly:\n"
    "- Use simple plain English (no technical jargon)\n"
    "- Be specific about the actual data (use real names, amounts, dates from the row data)\n"
    "- Always give a clear recommended action\n"
    "- Explain what will happen if they approve or reject\n"
    "- Keep the explanation under 100 words\n"
    "- Never use words like 'anomaly', 'schema', 'model', 'database', or other technical terms\n"
    "- Speak directly to the user as 'you'\n"
    "- Format as plain text, no markdown, no bullet points"
)

# Individual prompt templates for all 12 anomaly types:

DUPLICATE_ROW = """
Two rows in the expense spreadsheet appear to be the same expense:
Row {row_number}: {date}, {amount} {currency}, {description}, paid by {paid_by}
Duplicate Row {dup_row_number}: {dup_date}, {dup_amount} {dup_currency}, {dup_description}, paid by {dup_paid_by}

Group members: {members_list}

Explain to the user why this is a problem and what they should do. Be specific about the row numbers and amounts.
"""

NEGATIVE_AMOUNT = """
An expense row has a negative amount:
Row {row_number}: {date}, amount is {amount} {currency}, {description}, paid by {paid_by}

Group members: {members_list}

Explain that the negative amount could be a refund or a data entry mistake. Give options for treating it as a refund or rejecting/skipping it.
"""

SETTLEMENT_AS_EXPENSE = """
An expense row description suggests a settlement/payment between people, not a shared expense:
Row {row_number}: {date}, {amount} {currency}, {description}, paid by {paid_by}

Group members: {members_list}

Explain that this looks like a debt settlement (one person paying back another) rather than a group shared expense. Recommend converting it to a settlement record.
"""

CURRENCY_MISMATCH = """
An expense row seems to be in a different currency or USD:
Row {row_number}: {date}, {amount} {currency}, {description}, paid by {paid_by}
Exchange rate: {exchange_rate}

Group members: {members_list}

Explain that this expense is in USD ($) but needs to be converted to INR (₹) at the given exchange rate. Tell them what the correct converted amount will be.
"""

MEMBER_NOT_IN_GROUP = """
An expense row mentions a payer who is not in the group:
Row {row_number}: {date}, {amount} {currency}, {description}, paid by {paid_by}

Group members: {members_list}

Explain that the person '{paid_by}' who paid is not registered in this group. Recommend creating a placeholder account for them to track their balances.
"""

DATE_OUTSIDE_MEMBERSHIP = """
An expense row includes a person who was not a member of the group on the expense date:
Row {row_number}: {date}, {amount} {currency}, {description}, paid by {paid_by}

Group members with their membership dates: {membership_dates}

Explain that one or more members listed in the split were not active in the group on the expense date (either they had not joined yet or had already left). Recommend removing them from the split.
"""

MISSING_REQUIRED_FIELD = """
An expense row is missing required information (date, amount, or paid_by):
Row {row_number}: date={date}, amount={amount}, paid_by={paid_by}, description={description}

Explain that required information is missing, making it impossible to import this row automatically. Recommend rejecting this row and adding it manually later.
"""

INCONSISTENT_DATE_FORMAT = """
An expense row uses a date format that is inconsistent or ambiguous compared to other rows:
Row {row_number}: date={date}, description={description}

Explain that the date format is ambiguous (e.g. DD/MM/YYYY vs MM/DD/YYYY) and could refer to different dates. Ask the user to confirm the correct date.
"""

AMOUNT_FORMAT_ISSUE = """
An expense row has formatting issues in its amount column (like commas, spaces, or currency symbols):
Row {row_number}: amount={amount}, description={description}

Explain that the amount format was cleaned up (e.g. commas or symbols removed). Inform them this is a minor issue that has been auto-fixed, so no action is needed.
"""

SPLIT_SUM_MISMATCH = """
An expense row split amounts do not add up to the total expense amount:
Row {row_number}: total amount={amount} {currency}, description={description}
Splits: {splits}

Explain that the individual split amounts do not sum to the total expense. Recommend editing the split values to make them match exactly.
"""

DUPLICATE_SETTLEMENT = """
A settlement row in the CSV matches a settlement already recorded in the app:
Row {row_number}: {date}, {amount} {currency}, {description}, paid by {paid_by}

Explain that this payment appears to have been recorded already in the app's history. Recommend skipping/rejecting this row to avoid double-counting.
"""

UNKNOWN_SPLIT_TYPE = """
An expense row split type is not recognized by the app:
Row {row_number}: split_type={split_type}, amount={amount} {currency}, description={description}

Explain that the split type is not recognized (only Equal, Unequal, Percentage, and Share are supported). Recommend mapping it to one of the recognized types.
"""

# Map anomaly codes to their respective templates
TEMPLATES = {
    'DUPLICATE_ROW': DUPLICATE_ROW,
    'NEGATIVE_AMOUNT': NEGATIVE_AMOUNT,
    'SETTLEMENT_AS_EXPENSE': SETTLEMENT_AS_EXPENSE,
    'CURRENCY_MISMATCH': CURRENCY_MISMATCH,
    'MEMBER_NOT_IN_GROUP': MEMBER_NOT_IN_GROUP,
    'DATE_OUTSIDE_MEMBERSHIP': DATE_OUTSIDE_MEMBERSHIP,
    'MISSING_REQUIRED_FIELD': MISSING_REQUIRED_FIELD,
    'INCONSISTENT_DATE_FORMAT': INCONSISTENT_DATE_FORMAT,
    'AMOUNT_FORMAT_ISSUE': AMOUNT_FORMAT_ISSUE,
    'SPLIT_SUM_MISMATCH': SPLIT_SUM_MISMATCH,
    'DUPLICATE_SETTLEMENT': DUPLICATE_SETTLEMENT,
    'UNKNOWN_SPLIT_TYPE': UNKNOWN_SPLIT_TYPE
}
