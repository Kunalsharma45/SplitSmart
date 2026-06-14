from django.urls import path
from ai.views import ExplainAnomalyView

urlpatterns = [
    path('explain-anomaly/', ExplainAnomalyView.as_view(), name='explain-anomaly'),
]
