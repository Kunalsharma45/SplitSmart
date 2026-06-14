from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Expense
from .serializers import ExpenseSerializer


class ExpenseListCreateView(generics.ListCreateAPIView):
    queryset = Expense.objects.filter(is_deleted=False)
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        group_id = self.request.query_params.get('group')
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(paid_by_id=self.request.data.get('paid_by_id'))


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Expense.objects.filter(is_deleted=False)
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        expense = self.get_object()
        expense.is_deleted = True
        expense.deleted_by = request.user
        expense.save()
        return Response({
            'success': True,
            'data': None,
            'message': 'Expense soft deleted.',
            'errors': [],
        }, status=status.HTTP_200_OK)


class ExpenseCommentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        return Response({
            'success': True,
            'data': [],
            'message': '',
            'errors': [],
        })

    def post(self, request, pk):
        return Response({
            'success': True,
            'data': None,
            'message': 'Comment endpoint placeholder.',
            'errors': [],
        })
