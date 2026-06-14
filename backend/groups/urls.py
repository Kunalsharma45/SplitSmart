from django.urls import path

from .views import (
    ActiveMembersOnDateView,
    GroupDetailView,
    GroupListCreateView,
    GroupMemberCreateView,
    GroupMemberRemoveView,
    GroupMemberUpdateView,
    GroupMembersListView,
)

urlpatterns = [
    path('groups/', GroupListCreateView.as_view(), name='group-list-create'),
    path('groups/<uuid:pk>/', GroupDetailView.as_view(), name='group-detail'),
    path('groups/<uuid:pk>/members/', GroupMembersListView.as_view(), name='group-members-list'),
    path('groups/<uuid:pk>/members/add/', GroupMemberCreateView.as_view(), name='group-member-add'),
    path('groups/<uuid:pk>/members/<uuid:uid>/', GroupMemberUpdateView.as_view(), name='group-member-update'),
    path('groups/<uuid:pk>/members/<uuid:uid>/remove/', GroupMemberRemoveView.as_view(), name='group-member-remove'),
    path('groups/<uuid:pk>/active-members/', ActiveMembersOnDateView.as_view(), name='group-active-members'),
]
