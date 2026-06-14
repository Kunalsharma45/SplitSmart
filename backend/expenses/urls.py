from django.urls import path

from .views import ExpenseCommentsView, ExpenseDetailView, ExpenseListCreateView

urlpatterns = [
    path('expenses/', ExpenseListCreateView.as_view(), name='expense-list-create'),
    path('expenses/<uuid:pk>/', ExpenseDetailView.as_view(), name='expense-detail'),
    path('expenses/<uuid:pk>/comments/', ExpenseCommentsView.as_view(), name='expense-comments'),
]
