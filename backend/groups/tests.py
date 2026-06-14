from datetime import date, timedelta
from django.utils import timezone

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User
from .models import Group, GroupMember



class GroupsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='aisha', email='aisha@example.com', password='StrongP@ssw0rd')
        self.member = User.objects.create_user(username='rohan', email='rohan@example.com', password='StrongP@ssw0rd')
        login = self.client.post(reverse('token_obtain_pair'), {'username': 'aisha', 'password': 'StrongP@ssw0rd'}, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

    def test_create_group_and_auto_admin_membership(self):
        response = self.client.post(reverse('group-list-create'), {
            'name': 'Flatshare',
            'description': 'Shared apartment expenses',
            'category': 'Household',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        group = Group.objects.get(name='Flatshare')
        self.assertEqual(group.created_by, self.user)
        membership = GroupMember.objects.get(group=group, user=self.user)
        self.assertEqual(membership.role, GroupMember.ADMIN)

    def test_list_groups_for_member(self):
        group = Group.objects.create(name='House', created_by=self.user)
        GroupMember.objects.create(group=group, user=self.user, role=GroupMember.ADMIN, joined_at=timezone.localdate())
        response = self.client.get(reverse('group-list-create'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_add_member_requires_admin(self):
        group = Group.objects.create(name='House', created_by=self.user)
        GroupMember.objects.create(group=group, user=self.user, role=GroupMember.ADMIN, joined_at=timezone.localdate())
        response = self.client.post(reverse('group-member-add', kwargs={'pk': group.id}), {
            'user_id': str(self.member.id),
            'role': GroupMember.MEMBER,
            'joined_at': timezone.localdate().isoformat(),
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(group.members.filter(user=self.member).exists())

    def test_remove_member_sets_left_date(self):
        group = Group.objects.create(name='House', created_by=self.user)
        GroupMember.objects.create(group=group, user=self.user, role=GroupMember.ADMIN, joined_at=timezone.localdate())
        membership = GroupMember.objects.create(group=group, user=self.member, role=GroupMember.MEMBER, joined_at=timezone.localdate())
        response = self.client.delete(reverse('group-member-remove', kwargs={'pk': group.id, 'uid': self.member.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        membership.refresh_from_db()
        self.assertEqual(membership.left_at, timezone.localdate())


    def test_active_members_on_date_includes_joined_at_and_left_at(self):
        group = Group.objects.create(name='House', created_by=self.user)
        GroupMember.objects.create(group=group, user=self.user, role=GroupMember.ADMIN, joined_at=date(2026, 4, 1), left_at=date(2026, 4, 30))
        GroupMember.objects.create(group=group, user=self.member, role=GroupMember.MEMBER, joined_at=date(2026, 4, 15))
        response_inclusive = self.client.get(reverse('group-active-members', kwargs={'pk': group.id}) + '?date=2026-04-30')
        self.assertEqual(response_inclusive.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_inclusive.data['data']), 2)
        response_exclusive = self.client.get(reverse('group-active-members', kwargs={'pk': group.id}) + '?date=2026-05-01')
        self.assertEqual(response_exclusive.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_exclusive.data['data']), 1)
