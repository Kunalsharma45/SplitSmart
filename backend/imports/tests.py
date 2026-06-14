from io import BytesIO
from datetime import date
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from groups.models import Group
from users.models import User
from expenses.models import Expense


class CsvImportTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='aisha', email='aisha@example.com', password='StrongP@ssw0rd')
        self.group = Group.objects.create(name='Flatshare', created_by=self.user)
        self.group.members.create(user=self.user, role='ADMIN', joined_at=date.today())
        login = self.client.post(reverse('token_obtain_pair'), {'username': 'aisha', 'password': 'StrongP@ssw0rd'}, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        self.parse_url = reverse('csv-import-parse')
        self.import_url = reverse('csv-import')

    def test_parse_csv_file(self):
        today = date.today().isoformat()
        csv_content = 'title,date,amount,currency,exchange_rate,category,paid_by,split_type,splits\n'
        csv_content += f'Groceries,{today},1200,INR,,Food,aisha,UNEQUAL,aisha=1200\n'
        file = SimpleUploadedFile('expenses.csv', csv_content.encode('utf-8'), content_type='text/csv')

        response = self.client.post(self.parse_url, {'file': file, 'group_id': str(self.group.id)}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['summary']['total_rows'], 1)
        self.assertTrue(response.data['data']['rows'][0]['valid'])

    def test_import_csv_rows(self):
        today = date.today().isoformat()
        csv_content = 'title,date,amount,currency,exchange_rate,category,paid_by,split_type,splits\n'
        csv_content += f'Dinner,{today},1500,INR,,Food,aisha,EQUAL,\n'
        file = SimpleUploadedFile('expenses.csv', csv_content.encode('utf-8'), content_type='text/csv')
        parse_response = self.client.post(self.parse_url, {'file': file, 'group_id': str(self.group.id)}, format='multipart')
        self.assertEqual(parse_response.status_code, status.HTTP_200_OK)

        parsed_row = parse_response.data['data']['rows'][0]['parsed_row']
        import_response = self.client.post(self.import_url, {'group_id': str(self.group.id), 'rows': [parsed_row]}, format='json')
        self.assertEqual(import_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Expense.objects.count(), 1)
        self.assertEqual(import_response.data['data']['created'][0]['row_number'], 1)

    def test_parse_csv_percentage_and_import(self):
        # add second member to group
        other = User.objects.create_user(username='bilal', email='bilal@example.com', password='Secret123')
        self.group.members.create(user=other, role='MEMBER', joined_at=date.today())

        today = date.today().isoformat()
        csv_content = 'title,date,amount,currency,exchange_rate,category,paid_by,split_type,splits\n'
        # percentages separated by semicolon
        csv_content += f'Utilities,{today},1000,INR,,Food,aisha,PERCENTAGE,aisha=60%;bilal=40%\n'
        file = SimpleUploadedFile('expenses.csv', csv_content.encode('utf-8'), content_type='text/csv')

        response = self.client.post(self.parse_url, {'file': file, 'group_id': str(self.group.id)}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['summary']['total_rows'], 1)
        self.assertTrue(response.data['data']['rows'][0]['valid'])

        parsed_row = response.data['data']['rows'][0]['parsed_row']
        import_response = self.client.post(self.import_url, {'group_id': str(self.group.id), 'rows': [parsed_row]}, format='json')
        self.assertEqual(import_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Expense.objects.count(), 1)

    def test_parse_csv_shares_and_import(self):
        # add second member to group
        other = User.objects.create_user(username='bilal2', email='bilal2@example.com', password='Secret123')
        self.group.members.create(user=other, role='MEMBER', joined_at=date.today())

        today = date.today().isoformat()
        csv_content = 'title,date,amount,currency,exchange_rate,category,paid_by,split_type,splits\n'
        # shares separated by semicolon
        csv_content += f'Party,{today},800,INR,,Food,aisha,SHARE,aisha=3;bilal2=1\n'
        file = SimpleUploadedFile('expenses.csv', csv_content.encode('utf-8'), content_type='text/csv')

        response = self.client.post(self.parse_url, {'file': file, 'group_id': str(self.group.id)}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['summary']['total_rows'], 1)
        self.assertTrue(response.data['data']['rows'][0]['valid'])

        parsed_row = response.data['data']['rows'][0]['parsed_row']
        import_response = self.client.post(self.import_url, {'group_id': str(self.group.id), 'rows': [parsed_row]}, format='json')
        self.assertEqual(import_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Expense.objects.count(), 1)
