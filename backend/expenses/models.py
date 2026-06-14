import uuid

from django.conf import settings
from django.db import models


class Expense(models.Model):
    CURRENCY_INR = 'INR'
    CURRENCY_USD = 'USD'
    CURRENCY_CHOICES = [
        (CURRENCY_INR, 'INR'),
        (CURRENCY_USD, 'USD'),
    ]

    CATEGORY_CHOICES = [
        ('Food', 'Food'),
        ('Travel', 'Travel'),
        ('Rent', 'Rent'),
        ('Utilities', 'Utilities'),
        ('Entertainment', 'Entertainment'),
        ('Shopping', 'Shopping'),
        ('Other', 'Other'),
    ]

    SPLIT_EQUAL = 'EQUAL'
    SPLIT_UNEQUAL = 'UNEQUAL'
    SPLIT_PERCENTAGE = 'PERCENTAGE'
    SPLIT_SHARE = 'SHARE'
    SPLIT_TYPE_CHOICES = [
        (SPLIT_EQUAL, 'Equal'),
        (SPLIT_UNEQUAL, 'Unequal'),
        (SPLIT_PERCENTAGE, 'Percentage'),
        (SPLIT_SHARE, 'Share'),
    ]

    IMPORT_MANUAL = 'MANUAL'
    IMPORT_CSV = 'CSV'
    IMPORT_SOURCE_CHOICES = [
        (IMPORT_MANUAL, 'Manual'),
        (IMPORT_CSV, 'CSV'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey('groups.Group', on_delete=models.CASCADE, related_name='expenses')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES)
    amount_inr = models.DecimalField(max_digits=12, decimal_places=2)
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=6)
    date = models.DateField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Other')
    paid_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='expenses_paid')
    split_type = models.CharField(max_length=20, choices=SPLIT_TYPE_CHOICES)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    deleted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='expenses_deleted')
    import_source = models.CharField(max_length=10, choices=IMPORT_SOURCE_CHOICES, default=IMPORT_MANUAL)
    import_row_number = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.title} ({self.currency} {self.amount})'


class ExpenseSplit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='splits')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='expense_splits')
    amount_owed = models.DecimalField(max_digits=12, decimal_places=2)
    original_amount = models.DecimalField(max_digits=12, decimal_places=2)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    shares = models.IntegerField(blank=True, null=True)
    is_settled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} owes {self.amount_owed} INR for {self.expense.title}'
