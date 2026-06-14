from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError

from groups.models import Group
from audit.models import AuditLog
from ai.service import AIService
from ai.rate_limiter import check_rate_limit

class ExplainAnomalyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        anomaly_type = request.data.get('anomaly_type')
        raw_row_data = request.data.get('raw_row_data')
        group_id = request.data.get('group_id')
        exchange_rate = request.data.get('exchange_rate')
        duplicate_row_data = request.data.get('duplicate_row_data')

        # 1. Validation
        if not anomaly_type:
            return Response({
                'success': False,
                'data': None,
                'message': 'anomaly_type is required.',
                'errors': ['anomaly_type_required']
            }, status=status.HTTP_400_BAD_REQUEST)

        if not raw_row_data or not isinstance(raw_row_data, dict):
            return Response({
                'success': False,
                'data': None,
                'message': 'raw_row_data is required and must be an object.',
                'errors': ['raw_row_data_required']
            }, status=status.HTTP_400_BAD_REQUEST)

        # 2. Rate Limiting (20 calls per user per hour)
        user_id = request.user.id
        is_blocked, remaining, reset_minutes = check_rate_limit(user_id)
        if is_blocked:
            return Response({
                'success': False,
                'data': None,
                'message': f"You have used 20 AI explanations this hour. Limit resets in {reset_minutes} minutes.",
                'errors': ['rate_limited']
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # 3. Retrieve Group Members & Membership Dates
        group_members = []
        membership_dates = {}
        if group_id:
            try:
                group = Group.objects.filter(pk=group_id).prefetch_related('members__user').first()
                if group:
                    for member in group.members.all():
                        username = member.user.username
                        group_members.append(username)
                        membership_dates[username] = {
                            'joined_at': str(member.joined_at),
                            'left_at': str(member.left_at) if member.left_at else 'Active'
                        }
            except Exception:
                pass  # Keep defaults if group lookup fails

        # 4. Generate AI Explanation
        explanation_data = AIService.explain_anomaly(
            anomaly_type=anomaly_type,
            raw_row_data=raw_row_data,
            group_members=group_members,
            membership_dates=membership_dates,
            exchange_rate=exchange_rate,
            duplicate_row_data=duplicate_row_data
        )

        # 5. Log to AuditLog
        try:
            AuditLog.objects.create(
                user=request.user,
                action='AI_EXPLANATION_REQUESTED',
                details={
                    'anomaly_type': anomaly_type,
                    'row_number': raw_row_data.get('row_number'),
                    'group_id': str(group_id) if group_id else None,
                    'ai_generated': explanation_data.get('ai_generated', False)
                }
            )
        except Exception:
            pass  # Avoid failing the request if logging fails

        # 6. Return Response
        return Response({
            'success': True,
            'data': {
                'explanation': explanation_data.get('explanation'),
                'recommended_action': explanation_data.get('recommended_action'),
                'action_label': explanation_data.get('action_label'),
                'confidence': explanation_data.get('confidence'),
                'ai_generated': explanation_data.get('ai_generated')
            },
            'message': 'Explanation generated'
        }, status=status.HTTP_200_OK)
