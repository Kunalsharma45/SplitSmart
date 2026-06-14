from django.urls import path

from .views import CsvImportCreateView, CsvImportParseView

urlpatterns = [
    path('imports/csv/parse/', CsvImportParseView.as_view(), name='csv-import-parse'),
    path('imports/csv/', CsvImportCreateView.as_view(), name='csv-import'),
]
