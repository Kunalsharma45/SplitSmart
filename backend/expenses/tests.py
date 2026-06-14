from datetime import date

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from groups.models import Group
from users.models import User
from .models import Expense


class ExpenseTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='aisha', email='aisha@example.com', password='StrongP@ssw0rd')
        self.group = Group.objects.create(name='Flatshare', created_by=self.user)
        self.group.members.create(user=self.user, role='ADMIN', joined_at=date.today())
        login = self.client.post(reverse('token_obtain_pair'), {'username': 'aisha', 'password': 'StrongP@ssw0rd'}, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        self.url = reverse('expense-list-create')

    def test_create_inr_expense(self):
        response = self.client.post(self.url, {
            'group': str(self.group.id),
            'title': 'Groceries',
            'description': 'Weekly groceries',
            'amount': '2340.00',
            'currency': 'INR',
            'amount_inr': '2340.00',
            'exchange_rate': '1',
            'date': date.today().isoformat(),
            'category': 'Food',
            'paid_by_id': str(self.user.id),
            'split_type': 'EQUAL',
            'splits': [
                {
                    'user_id': str(self.user.id),
                    'amount_owed': '2340.00',
                    'original_amount': '2340.00',
                }
            ],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Expense.objects.count(), 1)

    def test_create_usd_expense_requires_exchange_rate(self):
        response = self.client.post(self.url, {
            'group': str(self.group.id),
            'title': 'Trip',
            'description': 'USD expense',
            'amount': '100.00',
            'currency': 'USD',
            'amount_inr': '8500.00',
            'date': date.today().isoformat(),
            'category': 'Travel',
            'paid_by_id': str(self.user.id),
            'split_type': 'EQUAL',
            'splits': [
                {
                    'user_id': str(self.user.id),
                    'amount_owed': '8500.00',
                    'original_amount': '100.00',
                }
            ],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('exchange_rate', response.data)
