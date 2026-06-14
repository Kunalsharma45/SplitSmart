from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache

User = get_user_model()

class AITests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpassword',
            email='test@example.com'
        )
        self.client.force_authenticate(user=self.user)
        self.url = reverse('explain-anomaly')

    @patch('openai.ChatCompletion.create')
    def test_explain_anomaly_success(self, mock_create):
        # Test 1: explain_anomaly returns valid response
        mock_create.return_value = {
            'choices': [{
                'message': {
                    'content': 'This is a duplicate expense. You should keep row 7 and remove row 12.'
                }
            }]
        }

        payload = {
            'anomaly_type': 'DUPLICATE_ROW',
            'raw_row_data': {
                'row_number': 7,
                'date': '2024-03-05',
                'amount': '850',
                'description': 'Dominos dinner',
                'paid_by': 'Aisha',
                'currency': 'INR',
                'split_type': 'EQUAL'
            },
            'duplicate_row_data': {
                'row_number': 12,
                'date': '2024-03-05',
                'amount': '850',
                'description': 'dominos dinner',
                'paid_by': 'Aisha'
            }
        }

        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        data = response.data['data']
        self.assertEqual(data['explanation'], 'This is a duplicate expense. You should keep row 7 and remove row 12.')
        self.assertEqual(data['recommended_action'], 'KEEP')
        self.assertEqual(data['confidence'], 'HIGH')
        self.assertTrue(data['ai_generated'])

    @patch('openai.ChatCompletion.create')
    def test_explain_anomaly_fallback(self, mock_create):
        # Test 2: fallback when OpenAI fails
        mock_create.side_effect = Exception("OpenAI API is down")

        payload = {
            'anomaly_type': 'DUPLICATE_ROW',
            'raw_row_data': {
                'row_number': 7,
                'date': '2024-03-05',
                'amount': '850',
                'paid_by': 'Aisha'
            }
        }

        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        data = response.data['data']
        self.assertIn("could not generate an AI explanation", data['explanation'])
        self.assertEqual(data['recommended_action'], 'MANUAL_REVIEW')
        self.assertFalse(data['ai_generated'])

    @patch('openai.ChatCompletion.create')
    def test_rate_limiter_blocks_after_20_calls(self, mock_create):
        # Test 3: rate limiter blocks after 20 calls
        mock_create.return_value = {
            'choices': [{
                'message': {
                    'content': 'Response ok.'
                }
            }]
        }

        payload = {
            'anomaly_type': 'DUPLICATE_ROW',
            'raw_row_data': {
                'row_number': 7,
                'date': '2024-03-05',
                'amount': '850',
                'paid_by': 'Aisha'
            }
        }

        # Make 20 calls
        for _ in range(20):
            response = self.client.post(self.url, payload, format='json')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 21st call should be rate-limited (429)
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("You have used 20 AI explanations this hour", response.data['message'])

    def test_unauthenticated_request_rejected(self):
        # Test 4: unauthenticated request rejected
        self.client.force_authenticate(user=None)
        payload = {
            'anomaly_type': 'DUPLICATE_ROW',
            'raw_row_data': {
                'row_number': 7,
                'date': '2024-03-05',
                'amount': '850',
                'paid_by': 'Aisha'
            }
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_anomaly_type_rejected(self):
        # Test 5: missing anomaly_type rejected
        payload = {
            'raw_row_data': {
                'row_number': 7,
                'date': '2024-03-05',
                'amount': '850',
                'paid_by': 'Aisha'
            }
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("anomaly_type is required", response.data['message'])
