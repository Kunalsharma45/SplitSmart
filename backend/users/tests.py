from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class AuthTests(APITestCase):
    def setUp(self):
        self.register_url = reverse('auth-register')
        self.login_url = reverse('token_obtain_pair')
        self.refresh_url = reverse('token_refresh')
        self.logout_url = reverse('auth-logout')
        self.me_url = reverse('auth-me')
        self.change_password_url = reverse('auth-change-password')
        self.user_data = {
            'username': 'aisha',
            'email': 'aisha@example.com',
            'password': 'StrongP@ssw0rd',
            'display_name': 'Aisha Sharma',
        }

    def test_register_creates_user(self):
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.first().username, 'aisha')

    @override_settings(AUTH_PASSWORD_VALIDATORS=[{
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8}
    }])
    def test_register_with_weak_password_returns_400(self):
        weak_data = self.user_data.copy()
        weak_data['password'] = '123'
        response = self.client.post(self.register_url, weak_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_tokens(self):
        User.objects.create_user(username='rohan', email='rohan@example.com', password='StrongP@ssw0rd')
        response = self.client.post(self.login_url, {'username': 'rohan', 'password': 'StrongP@ssw0rd'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_me_requires_authentication(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_user_profile(self):
        user = User.objects.create_user(username='meera', email='meera@example.com', password='StrongP@ssw0rd')
        login = self.client.post(self.login_url, {'username': 'meera', 'password': 'StrongP@ssw0rd'}, format='json')
        access = login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['username'], 'meera')

    def test_change_password_requires_old_password(self):
        user = User.objects.create_user(username='priya', email='priya@example.com', password='StrongP@ssw0rd')
        login = self.client.post(self.login_url, {'username': 'priya', 'password': 'StrongP@ssw0rd'}, format='json')
        access = login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        response = self.client.put(self.change_password_url, {
            'old_password': 'WrongPass',
            'new_password': 'AnotherStrongP@ss1',
            'new_password_confirm': 'AnotherStrongP@ss1',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_updates_password(self):
        user = User.objects.create_user(username='priya', email='priya@example.com', password='StrongP@ssw0rd')
        login = self.client.post(self.login_url, {'username': 'priya', 'password': 'StrongP@ssw0rd'}, format='json')
        access = login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        response = self.client.put(self.change_password_url, {
            'old_password': 'StrongP@ssw0rd',
            'new_password': 'AnotherStrongP@ss1',
            'new_password_confirm': 'AnotherStrongP@ss1',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password('AnotherStrongP@ss1'))

    def test_logout_blacklists_refresh_token(self):
        user = User.objects.create_user(username='sam', email='sam@example.com', password='StrongP@ssw0rd')
        login = self.client.post(self.login_url, {'username': 'sam', 'password': 'StrongP@ssw0rd'}, format='json')
        refresh = login.data['refresh']
        access = login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        response = self.client.post(self.logout_url, {'refresh': refresh}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
