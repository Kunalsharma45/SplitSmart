from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Group, GroupMember, get_active_members_on_date
from .serializers import GroupDetailSerializer, GroupMemberSerializer, GroupSerializer
from users.serializers import UserSerializer


class GroupListCreateView(generics.ListCreateAPIView):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(members__user=self.request.user).distinct()

    def perform_create(self, serializer):
        group = serializer.save(created_by=self.request.user)
        GroupMember.objects.create(
            group=group,
            user=self.request.user,
            role=GroupMember.ADMIN,
            joined_at=timezone.localdate(),
        )


class GroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Group.objects.all()
    serializer_class = GroupDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(members__user=self.request.user).distinct()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.created_by != request.user:
            return Response({
                'success': False,
                'data': None,
                'message': 'Only the group creator may delete the group.',
                'errors': ['permission_denied'],
            }, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class GroupMembersListView(generics.ListAPIView):
    serializer_class = GroupMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        group = get_object_or_404(Group, pk=self.kwargs['pk'])
        if not group.members.filter(user=self.request.user).exists():
            return GroupMember.objects.none()
        return group.members.all()


class GroupMemberCreateView(generics.CreateAPIView):
    serializer_class = GroupMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        group = get_object_or_404(Group, pk=self.kwargs['pk'])
        if not group.members.filter(user=self.request.user, role=GroupMember.ADMIN).exists():
            raise permissions.PermissionDenied('Only group admins can add members.')
        serializer.save(group=group)


class GroupMemberUpdateView(generics.UpdateAPIView):
    serializer_class = GroupMemberSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = 'uid'
    lookup_field = 'user_id'

    def get_queryset(self):
        group = get_object_or_404(Group, pk=self.kwargs['pk'])
        if not group.members.filter(user=self.request.user, role=GroupMember.ADMIN).exists():
            return GroupMember.objects.none()
        return group.members.all()


class GroupMemberRemoveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk, uid):
        group = get_object_or_404(Group, pk=pk)
        if not group.members.filter(user=request.user, role=GroupMember.ADMIN).exists():
            return Response({
                'success': False,
                'data': None,
                'message': 'Only group admins can remove members.',
                'errors': ['permission_denied'],
            }, status=status.HTTP_403_FORBIDDEN)
        member = get_object_or_404(group.members, user_id=uid)
        member.left_at = timezone.localdate()
        member.save()
        return Response({
            'success': True,
            'data': None,
            'message': 'Member removed successfully.',
            'errors': [],
        })


class ActiveMembersOnDateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({
                'success': False,
                'data': None,
                'message': 'date query parameter is required.',
                'errors': ['date_required'],
            }, status=status.HTTP_400_BAD_REQUEST)
        try:
            date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({
                'success': False,
                'data': None,
                'message': 'Date must be in YYYY-MM-DD format.',
                'errors': ['invalid_date_format'],
            }, status=status.HTTP_400_BAD_REQUEST)
        group = get_object_or_404(Group, pk=pk)
        if not group.members.filter(user=self.request.user).exists():
            return Response({
                'success': False,
                'data': None,
                'message': 'Not a member of this group.',
                'errors': ['permission_denied'],
            }, status=status.HTTP_403_FORBIDDEN)
        members = get_active_members_on_date(group, date)
        serializer = UserSerializer(members, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': '',
            'errors': [],
        })
